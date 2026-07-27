import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { LiveSandboxState } from "../live-sandbox";
import type { KnowledgeEffect } from "./brain";
import { extractEffectFromText, inferKnowledgeKind } from "./brain";

type Client = SupabaseClient<Database>;

export type SandboxExperienceResult = {
  lessonsCreated: number;
  titles: string[];
  summary: string;
};

/**
 * Al terminar una sesión sandbox, el Operador “consume” la experiencia:
 * convierte trades/regímenes/resultados en lecciones permanentes del cerebro global.
 */
export async function consumeSandboxExperience(
  supabase: Client,
  state: LiveSandboxState,
  opts?: { locale?: "es" | "en"; createdBy?: string },
): Promise<SandboxExperienceResult> {
  const locale = opts?.locale ?? "es";
  const trades = state.closedTrades;
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const titles: string[] = [];
  let lessonsCreated = 0;

  const totalPnl = trades.reduce((s, t) => s + t.pnl, 0);
  const regime = state.lastRegime ?? "range";
  const pair = state.pair;

  async function insertLesson(
    title: string,
    content: string,
    effect: KnowledgeEffect,
    kind: string,
  ) {
    const { error } = await supabase.from("operator_knowledge").insert({
      kind,
      title: title.slice(0, 120),
      content: content.slice(0, 2000),
      effect: effect as Json,
      is_active: true,
      source: "sandbox",
      created_by: opts?.createdBy ?? null,
    });
    if (!error) {
      lessonsCreated += 1;
      titles.push(title);
    }
  }

  // Resumen de sesión siempre (si hubo actividad)
  if (state.tickCount > 0) {
    const title =
      locale === "en"
        ? `Sandbox session ${pair} · ${trades.length} trades · PnL ${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}`
        : `Sesión sandbox ${pair} · ${trades.length} trades · PnL ${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}`;

    const content = [
      locale === "en" ? "Paper session experience for Keelra Operator." : "Experiencia paper del Operador Keelra.",
      `Pair: ${pair}`,
      `Timeframe: ${state.timeframe}`,
      `Ticks: ${state.tickCount}`,
      `Trades: ${trades.length} (W ${wins.length} / L ${losses.length})`,
      `PnL: ${totalPnl.toFixed(2)}`,
      `Last regime: ${regime}`,
      `Last model score: ${state.lastModelScore ?? state.lastScore}`,
      state.startedAt ? `Started: ${state.startedAt}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const effect: KnowledgeEffect = {
      note: title.slice(0, 240),
    };
    if (totalPnl < 0 && losses.length >= wins.length) {
      effect.avoidRegime = regime;
      effect.minScoreDelta = 4;
      effect.scoreDelta = -3;
    } else if (totalPnl > 0 && wins.length > losses.length) {
      effect.preferRegime = regime;
      effect.preferPairs = [pair];
      effect.scoreDelta = 3;
    }

    await insertLesson(title, content, effect, "lesson");
  }

  // Lecciones por trade cerrado (máx 5 más recientes)
  for (const trade of trades.slice(0, 5)) {
    const won = trade.pnl > 0;
    const title =
      locale === "en"
        ? `${won ? "Win" : "Loss"} on ${pair}: ${trade.exitReason.slice(0, 60)}`
        : `${won ? "Ganancia" : "Pérdida"} en ${pair}: ${trade.exitReason.slice(0, 60)}`;

    const content = [
      trade.entryReason,
      `Exit: ${trade.exitReason}`,
      `Entry ${trade.entry.toFixed(2)} → Exit ${trade.exit.toFixed(2)}`,
      `PnL ${trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}`,
      `Opened ${trade.openedAt} · Closed ${trade.closedAt}`,
    ].join("\n");

    const base = extractEffectFromText(`${trade.entryReason} ${trade.exitReason}`);
    if (won) {
      base.preferPairs = Array.from(
        new Set([...(base.preferPairs ?? []), pair]),
      );
      base.preferRegime = base.preferRegime ?? regime;
      base.scoreDelta = (base.scoreDelta ?? 0) + 2;
    } else {
      base.avoidRegime = base.avoidRegime ?? regime;
      base.minScoreDelta = (base.minScoreDelta ?? 0) + 3;
      base.scoreDelta = (base.scoreDelta ?? 0) - 2;
    }

    await insertLesson(
      title,
      content,
      base,
      inferKnowledgeKind(trade.entryReason) || "lesson",
    );
  }

  const summary =
    locale === "en"
      ? `Consumed sandbox experience: ${lessonsCreated} lessons from ${trades.length} trades.`
      : `Experiencia sandbox consumida: ${lessonsCreated} lecciones de ${trades.length} trades.`;

  // Marca en cerebro
  await supabase.from("operator_brain").upsert({
    id: "keelra",
    notes: summary.slice(0, 500),
    updated_at: new Date().toISOString(),
  });

  return { lessonsCreated, titles, summary };
}
