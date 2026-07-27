import { NextResponse } from "next/server";
import { getSessionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractEffectFromText,
  inferKnowledgeKind,
  loadActiveKnowledge,
  loadOperatorBrain,
} from "@/lib/trading/operator/brain";
import { listCalibration } from "@/lib/trading/operator/calibration";
import { getOperatorModelInfo } from "@/lib/trading/operator/model";
import type { Json } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function canManage(access: NonNullable<Awaited<ReturnType<typeof getSessionAccess>>>) {
  return (
    access.can("admin_console") &&
    (access.can("admin_edit_strategy") ||
      access.can("admin_analytics") ||
      access.role === "admin")
  );
}

export async function GET() {
  const access = await getSessionAccess();
  if (!access || !access.can("admin_console")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const [brain, knowledge, calibration] = await Promise.all([
    loadOperatorBrain(supabase),
    loadActiveKnowledge(supabase),
    listCalibration(supabase),
  ]);

  const { data: chat } = await supabase
    .from("operator_chat_messages")
    .select("id, role, content, knowledge_id, created_at")
    .order("created_at", { ascending: true })
    .limit(80);

  const model = getOperatorModelInfo();

  return NextResponse.json({
    brain,
    model,
    knowledge,
    calibration: calibration.filter((c) => c.pair === "*").slice(0, 8),
    chat: chat ?? [],
  });
}

export async function POST(request: Request) {
  const access = await getSessionAccess();
  if (!access || !canManage(access)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    action?: string;
    isActive?: boolean;
    message?: string;
    knowledgeId?: string;
    locale?: "es" | "en";
  };

  const admin = createAdminClient();
  const locale = body.locale === "en" ? "en" : "es";

  if (body.action === "toggle") {
    const isActive = Boolean(body.isActive);
    const { error } = await admin.from("operator_brain").upsert({
      id: "keelra",
      is_active: isActive,
      updated_at: new Date().toISOString(),
      updated_by: access.user.id,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, isActive });
  }

  if (body.action === "sync_model") {
    const model = getOperatorModelInfo();
    const { error } = await admin.from("operator_brain").upsert({
      id: "keelra",
      model_version: model.version,
      last_trained_at: model.trainedAt,
      updated_at: new Date().toISOString(),
      updated_by: access.user.id,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, model });
  }

  if (body.action === "deactivate_knowledge" && body.knowledgeId) {
    const { error } = await admin
      .from("operator_knowledge")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", body.knowledgeId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (body.action === "teach") {
    const message = (body.message ?? "").trim();
    if (message.length < 3) {
      return NextResponse.json({ error: "Message too short" }, { status: 400 });
    }

    const effect = extractEffectFromText(message);
    const kind = inferKnowledgeKind(message);
    const title =
      message.length > 72 ? `${message.slice(0, 69)}…` : message;

    const { data: knowledgeRow, error: kErr } = await admin
      .from("operator_knowledge")
      .insert({
        kind,
        title,
        content: message,
        effect: effect as Json,
        is_active: true,
        source: "chat",
        created_by: access.user.id,
      })
      .select("id")
      .single();

    if (kErr || !knowledgeRow) {
      return NextResponse.json(
        { error: kErr?.message ?? "Could not save knowledge" },
        { status: 500 },
      );
    }

    await admin.from("operator_chat_messages").insert({
      role: "user",
      content: message,
      knowledge_id: knowledgeRow.id,
      created_by: access.user.id,
    });

    const effectKeys = Object.keys(effect).filter((k) => k !== "note");
    const reply =
      locale === "en"
        ? effectKeys.length
          ? `Learned permanently as “${kind}”. I will apply: ${effectKeys.join(", ")}. This knowledge stays in the global Keelra Operator for every customer bot.`
          : `Saved permanently as “${kind}”. I stored the lesson in my global knowledge. Tip: use phrases like “prefer uptrend”, “avoid ETH”, “be more careful in range” so I can turn them into trading rules.`
        : effectKeys.length
          ? `Aprendido para siempre como “${kind}”. Aplicaré: ${effectKeys.join(", ")}. Este conocimiento queda en el Operador Keelra global para todos los bots de clientes.`
          : `Guardado para siempre como “${kind}”. Tip: usa frases como “preferir alcista”, “evitar ETH”, “más cauteloso en rango” para que lo convierta en reglas de trading.`;

    await admin.from("operator_chat_messages").insert({
      role: "assistant",
      content: reply,
      knowledge_id: knowledgeRow.id,
      created_by: access.user.id,
    });

    return NextResponse.json({
      ok: true,
      knowledgeId: knowledgeRow.id,
      reply,
      effect,
      kind,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
