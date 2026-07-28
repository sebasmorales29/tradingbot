import { NextResponse } from "next/server";
import { getSessionAccess } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractEffectFromText,
  inferKnowledgeKind,
  loadActiveKnowledge,
  countActiveKnowledge,
  loadOperatorBrain,
} from "@/lib/trading/operator/brain";
import {
  listCalibration,
  recomputeAndUpsertCalibration,
} from "@/lib/trading/operator/calibration";
import { getOperatorModelInfo } from "@/lib/trading/operator/model";
import { trainOperatorFromMarket } from "@/lib/trading/operator/train";
import { runOperatorWebResearch } from "@/lib/trading/operator/research";
import {
  finalizeOperatorAgent,
  planOperatorAgent,
  refineReplyWithLlm,
} from "@/lib/trading/operator/agent";
import { composeOperatorChatReply } from "@/lib/trading/operator/chat";
import type { Json } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

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
  const [brain, knowledge, knowledgeCount, calibration] = await Promise.all([
    loadOperatorBrain(supabase),
    loadActiveKnowledge(supabase),
    countActiveKnowledge(supabase),
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
    model: {
      ...model,
      // La UI debe preferir la fecha de la DB (Update brain / research), no solo el JSON del build
      trainedAt: brain.lastTrainedAt ?? model.trainedAt,
    },
    knowledge,
    knowledgeCount,
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
    chatMessageId?: string;
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
      let trainWarning: string | null = null;

      if (body.action === "update_brain") {
        try {
          // En Vercel el FS del proyecto es read-only: entrenar en memoria y
          // persistir metadatos en DB.
          trained = await trainOperatorFromMarket({ persistFile: false });
          await recomputeAndUpsertCalibration(admin);
        } catch (e) {
          trainWarning = e instanceof Error ? e.message : "train_failed";
          console.error("[operator-update-brain]", e);
        }
      }

      const model = getOperatorModelInfo();
      const now = new Date().toISOString();
      const { error } = await admin.from("operator_brain").upsert({
        id: "keelra",
        model_version: trained?.version ?? model.version,
        last_trained_at: trained?.trainedAt ?? now,
        train_sample_wins: trained?.sampleWins ?? undefined,
        train_sample_losses: trained?.sampleLosses ?? undefined,
        updated_at: now,
        updated_by: access.user.id,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      if (trainWarning && !trained) {
        return NextResponse.json({
          ok: true,
          partial: true,
          model,
          message:
            locale === "en"
              ? `Brain timestamp updated, but market train failed: ${trainWarning}`
              : `Se actualizó la fecha del cerebro, pero el entrenamiento de mercado falló: ${trainWarning}`,
        });
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
        maxLearn: 14,
        focus: "all",
      });
      return NextResponse.json({
        ok: true,
        ...result,
        message:
          locale === "en"
            ? `Trained on ${result.itemsLearned} lessons from the web (${result.sourcesOk} sources: theory + market).`
            : `Entrenó ${result.itemsLearned} lecciones de internet (${result.sourcesOk} fuentes: teoría + mercado).`,
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

  if (body.action === "teach" || body.action === "chat") {
    const message = (body.message ?? "").trim();
    if (message.length < 3) {
      return NextResponse.json({ error: "Message too short" }, { status: 400 });
    }

    let [brain, knowledge, calibration] = await Promise.all([
      loadOperatorBrain(admin),
      loadActiveKnowledge(admin),
      listCalibration(admin),
    ]);
    const model = getOperatorModelInfo();
    const cal = calibration
      .filter((c) => c.pair === "*")
      .map((c) => ({
        regime: c.regime,
        tradesCount: c.tradesCount,
        winRate: c.winRate,
      }));

    const baseInput = {
      message,
      locale: locale as "es" | "en",
      brain,
      knowledge,
      model,
      calibration: cal,
    };

    let planned = planOperatorAgent(baseInput);
    let research = null as Awaited<
      ReturnType<typeof runOperatorWebResearch>
    > | null;
    let freshLessons = [] as typeof knowledge;

    if (planned.needsResearch) {
      try {
        research = await runOperatorWebResearch(admin, {
          triggeredBy: "chat_agent",
          maxLearn: 8,
        });
        knowledge = await loadActiveKnowledge(admin);
        brain = await loadOperatorBrain(admin);
        const before = new Set(
          baseInput.knowledge.map((k) => k.id),
        );
        freshLessons = knowledge.filter((k) => !before.has(k.id));
        if (!freshLessons.length && research.learnedTitles.length) {
          freshLessons = knowledge
            .filter((k) =>
              research!.learnedTitles.some((t) => k.title.includes(t.slice(0, 40))),
            )
            .slice(0, 8);
        }
      } catch (e) {
        console.error("[operator-chat-research]", e);
      }
      planned = finalizeOperatorAgent(
        {
          ...baseInput,
          brain,
          knowledge,
          research,
          freshLessons,
        },
        "research",
      );
    } else {
      planned = finalizeOperatorAgent(baseInput, planned.intent);
    }

    let reply = planned.reply;
    const knowledgeForVoice = (freshLessons.length ? freshLessons : knowledge).slice(
      0,
      8,
    );
    const refined = await refineReplyWithLlm({
      locale,
      message,
      draftReply: reply,
      knowledgeTitles: knowledgeForVoice.map((k) => k.title),
      knowledgeSnippets: knowledgeForVoice.map(
        (k) => `${k.title}: ${k.content.slice(0, 280)}`,
      ),
      researchSummary: research?.summary,
    });
    // Groq = voz. Si falla, queda el borrador del cerebro Keelra.
    if (refined) reply = refined;

    let knowledgeId: string | null = null;

    if (planned.autoLearn && planned.autoLearnContent) {
      const already = knowledge.some(
        (k) =>
          k.source === "agent" &&
          k.title.slice(0, 40) === (planned.autoLearnTitle ?? "").slice(0, 40),
      );
      if (!already) {
        const { data: knowledgeRow } = await admin
          .from("operator_knowledge")
          .insert({
            kind: planned.kind || "lesson",
            title: (planned.autoLearnTitle ?? message).slice(0, 120),
            content: planned.autoLearnContent.slice(0, 2000),
            effect: planned.effect as Json,
            is_active: true,
            source: "agent",
            created_by: access.user.id,
          })
          .select("id")
          .single();
        knowledgeId = knowledgeRow?.id ?? null;
      }
    }

    await admin.from("operator_chat_messages").insert({
      role: "user",
      content: message,
      knowledge_id: knowledgeId,
      created_by: access.user.id,
    });

    await admin.from("operator_chat_messages").insert({
      role: "assistant",
      content: reply,
      knowledge_id: knowledgeId,
      created_by: access.user.id,
    });

    return NextResponse.json({
      ok: true,
      intent: planned.intent,
      knowledgeId,
      reply,
      researched: Boolean(research),
      learnedFromResearch: research?.itemsLearned ?? 0,
    });
  }

  if (body.action === "save_as_lesson" && body.chatMessageId) {
    const { data: chatMsg, error: chatErr } = await admin
      .from("operator_chat_messages")
      .select("id, role, content, knowledge_id, created_at")
      .eq("id", body.chatMessageId)
      .maybeSingle();

    if (chatErr || !chatMsg || chatMsg.role !== "user") {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    if (chatMsg.knowledge_id) {
      return NextResponse.json({
        ok: true,
        knowledgeId: chatMsg.knowledge_id,
        alreadySaved: true,
      });
    }

    const userText = String(chatMsg.content ?? "").trim();
    if (userText.length < 3) {
      return NextResponse.json({ error: "Message too short" }, { status: 400 });
    }

    const { data: assistantMsg } = await admin
      .from("operator_chat_messages")
      .select("id, content, created_at")
      .eq("role", "assistant")
      .gt("created_at", chatMsg.created_at)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const assistantText = String(assistantMsg?.content ?? "").trim();
    const content = [
      locale === "en" ? "Human:" : "Humano:",
      userText,
      assistantText
        ? `${locale === "en" ? "Operator:" : "Operador:"}\n${assistantText}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const effect = extractEffectFromText(`${userText}\n${assistantText}`);
    const kind = inferKnowledgeKind(userText);
    const title =
      userText.length > 72 ? `${userText.slice(0, 69)}…` : userText;

    const { data: knowledgeRow, error: kErr } = await admin
      .from("operator_knowledge")
      .insert({
        kind,
        title,
        content: content.slice(0, 4000),
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

    await admin
      .from("operator_chat_messages")
      .update({ knowledge_id: knowledgeRow.id })
      .eq("id", chatMsg.id);

    if (assistantMsg?.id) {
      await admin
        .from("operator_chat_messages")
        .update({ knowledge_id: knowledgeRow.id })
        .eq("id", assistantMsg.id);
    }

    const reply =
      locale === "en"
        ? `Saved this exchange permanently as “${kind}” — your question and my analysis.`
        : `Guardé este intercambio para siempre como “${kind}”: tu pregunta y mi análisis.`;

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
    });
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
    const [brain, knowledge, calibration] = await Promise.all([
      loadOperatorBrain(admin),
      loadActiveKnowledge(admin),
      listCalibration(admin),
    ]);
    const model = getOperatorModelInfo();
    const textForChat = message || (imageData ? "qué ves en esta imagen de prueba?" : "");
    const composed = composeOperatorChatReply({
      message: textForChat,
      locale,
      brain,
      knowledge,
      model,
      calibration: calibration
        .filter((c) => c.pair === "*")
        .map((c) => ({
          regime: c.regime,
          tradesCount: c.tradesCount,
          winRate: c.winRate,
        })),
    });
    const promoteHint =
      locale === "en"
        ? `\n\nThis stays in the test lab only. If you want it in the main brain, click “Promote to main brain”.`
        : `\n\nEsto queda solo en el laboratorio. Si quieres llevarlo al cerebro principal, pulsa “Llevar al cerebro principal”.`;
    const cueLine =
      effectKeys.length > 0
        ? locale === "en"
          ? `\nDetected rule cues: ${effectKeys.join(", ")}.`
          : `\nSeñales de regla detectadas: ${effectKeys.join(", ")}.`
        : "";
    const reply = `${composed.reply}${cueLine}${promoteHint}`;

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

    const { data: assistantMsg } = await admin
      .from("operator_test_messages")
      .select("id, content, created_at")
      .eq("role", "assistant")
      .gt("created_at", testMsg.created_at)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    const assistantText = String(assistantMsg?.content ?? "").trim();
    const content = [
      locale === "en" ? "Human (test):" : "Humano (prueba):",
      testMsg.content,
      testMsg.image_data
        ? locale === "en"
          ? "[Includes chart/image from test lab]"
          : "[Incluye gráfico/imagen del laboratorio]"
        : null,
      assistantText
        ? `${locale === "en" ? "Operator:" : "Operador:"}\n${assistantText}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const effect = extractEffectFromText(
      `${testMsg.content}\n${assistantText}`,
    );
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
        content: content.slice(0, 4000),
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
          ? "Promoted this exchange (your test + my reply) to the main brain."
          : "Llevé este intercambio (tu prueba + mi respuesta) al cerebro principal.",
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
