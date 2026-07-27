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
import {
  listCalibration,
  recomputeAndUpsertCalibration,
} from "@/lib/trading/operator/calibration";
import { getOperatorModelInfo } from "@/lib/trading/operator/model";
import { trainOperatorFromMarket } from "@/lib/trading/operator/train";
import { runOperatorWebResearch } from "@/lib/trading/operator/research";
import type { Json } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function canManage(
  access: NonNullable<Awaited<ReturnType<typeof getSessionAccess>>>,
) {
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

  const [{ data: chat }, testsRes, researchRes] = await Promise.all([
    supabase
      .from("operator_chat_messages")
      .select("id, role, content, knowledge_id, created_at")
      .order("created_at", { ascending: true })
      .limit(80),
    supabase
      .from("operator_test_messages")
      .select(
        "id, role, content, image_data, promoted_knowledge_id, created_at",
      )
      .order("created_at", { ascending: true })
      .limit(80),
    supabase
      .from("operator_research_runs")
      .select(
        "id, started_at, finished_at, sources_ok, sources_failed, items_seen, items_learned, summary, triggered_by",
      )
      .order("started_at", { ascending: false })
      .limit(5),
  ]);

  const model = getOperatorModelInfo();

  return NextResponse.json({
    brain,
    model,
    knowledge,
    calibration: calibration.filter((c) => c.pair === "*").slice(0, 8),
    chat: chat ?? [],
    tests: testsRes.error ? [] : testsRes.data ?? [],
    researchRuns: researchRes.error ? [] : researchRes.data ?? [],
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
    imageData?: string | null;
    testMessageId?: string;
    autoResearchEnabled?: boolean;
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

  if (body.action === "update_brain" || body.action === "sync_model") {
    try {
      let trained = null as Awaited<
        ReturnType<typeof trainOperatorFromMarket>
      > | null;
      if (body.action === "update_brain") {
        trained = await trainOperatorFromMarket();
        await recomputeAndUpsertCalibration(admin);
      }
      const model = getOperatorModelInfo();
      const { error } = await admin.from("operator_brain").upsert({
        id: "keelra",
        model_version: trained?.version ?? model.version,
        last_trained_at: trained?.trainedAt ?? model.trainedAt,
        train_sample_wins: trained?.sampleWins ?? undefined,
        train_sample_losses: trained?.sampleLosses ?? undefined,
        updated_at: new Date().toISOString(),
        updated_by: access.user.id,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({
        ok: true,
        model: trained ?? model,
        message:
          locale === "en"
            ? "Brain updated: model retrained from market history and calibration refreshed."
            : "Cerebro actualizado: modelo reentrenado con histórico y calibración refrescada.",
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Update failed" },
        { status: 500 },
      );
    }
  }

  if (body.action === "research_web") {
    try {
      const result = await runOperatorWebResearch(admin, {
        triggeredBy: "admin",
        maxLearn: 12,
      });
      return NextResponse.json({
        ok: true,
        ...result,
        message:
          locale === "en"
            ? `Learned ${result.itemsLearned} items from the web (${result.sourcesOk} sources).`
            : `Aprendió ${result.itemsLearned} ítems de internet (${result.sourcesOk} fuentes).`,
      });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Research failed" },
        { status: 500 },
      );
    }
  }

  if (body.action === "toggle_auto_research") {
    const enabled = Boolean(body.autoResearchEnabled);
    const { error } = await admin.from("operator_brain").upsert({
      id: "keelra",
      auto_research_enabled: enabled,
      updated_at: new Date().toISOString(),
      updated_by: access.user.id,
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, autoResearchEnabled: enabled });
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
    const title = message.length > 72 ? `${message.slice(0, 69)}…` : message;

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
          ? `Learned permanently as “${kind}”. I will apply: ${effectKeys.join(", ")}.`
          : `Saved permanently as “${kind}”. Tip: use phrases like “prefer uptrend”, “avoid ETH”, “more careful in range”.`
        : effectKeys.length
          ? `Aprendido para siempre como “${kind}”. Aplicaré: ${effectKeys.join(", ")}.`
          : `Guardado para siempre como “${kind}”. Tip: usa “preferir alcista”, “evitar ETH”, “más cauteloso en rango”.`;

    await admin.from("operator_chat_messages").insert({
      role: "assistant",
      content: reply,
      knowledge_id: knowledgeRow.id,
      created_by: access.user.id,
    });

    return NextResponse.json({ ok: true, knowledgeId: knowledgeRow.id, reply });
  }

  if (body.action === "test_message") {
    const message = (body.message ?? "").trim();
    const imageData =
      typeof body.imageData === "string" && body.imageData.startsWith("data:image/")
        ? body.imageData
        : null;
    if (!message && !imageData) {
      return NextResponse.json({ error: "Empty test" }, { status: 400 });
    }
    if (imageData && imageData.length > 900_000) {
      return NextResponse.json({ error: "Image too large" }, { status: 400 });
    }

    await admin.from("operator_test_messages").insert({
      role: "user",
      content: message || "(image)",
      image_data: imageData,
      created_by: access.user.id,
    });

    const effect = extractEffectFromText(message || "");
    const effectKeys = Object.keys(effect).filter((k) => k !== "note");
    const reply =
      locale === "en"
        ? imageData
          ? `Test received${message ? ` with note: “${message.slice(0, 120)}”` : ""}. If this chart lesson is useful, click “Promote to main brain”. Detected cues: ${effectKeys.join(", ") || "none yet"}.`
          : `Test note stored. Detected cues: ${effectKeys.join(", ") || "none yet"}. Promote it if you want it permanent.`
        : imageData
          ? `Prueba recibida${message ? ` con nota: “${message.slice(0, 120)}”` : ""}. Si esta lección del gráfico sirve, pulsa “Llevar al cerebro principal”. Señales detectadas: ${effectKeys.join(", ") || "ninguna aún"}.`
          : `Nota de prueba guardada. Señales: ${effectKeys.join(", ") || "ninguna aún"}. Promuévela si quieres que sea permanente.`;

    await admin.from("operator_test_messages").insert({
      role: "assistant",
      content: reply,
      created_by: access.user.id,
    });

    return NextResponse.json({ ok: true, reply });
  }

  if (body.action === "promote_test" && body.testMessageId) {
    const { data: testMsg, error: tErr } = await admin
      .from("operator_test_messages")
      .select("*")
      .eq("id", body.testMessageId)
      .maybeSingle();

    if (tErr || !testMsg || testMsg.role !== "user") {
      return NextResponse.json({ error: "Test message not found" }, { status: 404 });
    }

    const content = [
      testMsg.content,
      testMsg.image_data ? "[Includes chart/image from test lab]" : null,
    ]
      .filter(Boolean)
      .join("\n");

    const effect = extractEffectFromText(testMsg.content);
    if (testMsg.image_data) {
      effect.note = `${effect.note ?? testMsg.content} · image-promoted`;
    }
    const kind = inferKnowledgeKind(testMsg.content);
    const title =
      testMsg.content.length > 60
        ? `${testMsg.content.slice(0, 57)}…`
        : testMsg.content || "Test lesson";

    const { data: knowledgeRow, error: kErr } = await admin
      .from("operator_knowledge")
      .insert({
        kind: kind === "note" ? "lesson" : kind,
        title,
        content,
        effect: effect as Json,
        is_active: true,
        source: "test_lab",
        created_by: access.user.id,
      })
      .select("id")
      .single();

    if (kErr || !knowledgeRow) {
      return NextResponse.json(
        { error: kErr?.message ?? "Promote failed" },
        { status: 500 },
      );
    }

    await admin
      .from("operator_test_messages")
      .update({ promoted_knowledge_id: knowledgeRow.id })
      .eq("id", testMsg.id);

    return NextResponse.json({
      ok: true,
      knowledgeId: knowledgeRow.id,
      message:
        locale === "en"
          ? "Promoted to main brain."
          : "Llevado al cerebro principal.",
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
