import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { MarketRegime } from "./regime";
import { getOperatorModelInfo } from "./model";

export type KnowledgeEffect = {
  scoreDelta?: number;
  preferRegime?: MarketRegime;
  avoidRegime?: MarketRegime;
  preferPairs?: string[];
  avoidPairs?: string[];
  minScoreDelta?: number;
  note?: string;
};

export type OperatorKnowledge = {
  id: string;
  kind: string;
  title: string;
  content: string;
  effect: KnowledgeEffect;
  isActive: boolean;
  source: string;
  createdAt: string;
};

export type OperatorBrain = {
  id: string;
  isActive: boolean;
  displayName: string;
  modelVersion: string;
  lastTrainedAt: string | null;
  trainSampleWins: number;
  trainSampleLosses: number;
  notes: string | null;
  updatedAt: string;
};

type Client = SupabaseClient<Database>;

function parseEffect(raw: Json): KnowledgeEffect {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const regimes = ["trend_up", "trend_down", "range", "high_vol"] as const;
  const preferRegime =
    typeof o.preferRegime === "string" &&
    (regimes as readonly string[]).includes(o.preferRegime)
      ? (o.preferRegime as MarketRegime)
      : undefined;
  const avoidRegime =
    typeof o.avoidRegime === "string" &&
    (regimes as readonly string[]).includes(o.avoidRegime)
      ? (o.avoidRegime as MarketRegime)
      : undefined;
  return {
    scoreDelta: typeof o.scoreDelta === "number" ? o.scoreDelta : undefined,
    preferRegime,
    avoidRegime,
    preferPairs: Array.isArray(o.preferPairs)
      ? o.preferPairs.filter((p): p is string => typeof p === "string")
      : undefined,
    avoidPairs: Array.isArray(o.avoidPairs)
      ? o.avoidPairs.filter((p): p is string => typeof p === "string")
      : undefined,
    minScoreDelta:
      typeof o.minScoreDelta === "number" ? o.minScoreDelta : undefined,
    note: typeof o.note === "string" ? o.note : undefined,
  };
}

export async function loadOperatorBrain(
  supabase: Client,
): Promise<OperatorBrain> {
  const model = getOperatorModelInfo();
  const { data, error } = await supabase
    .from("operator_brain")
    .select("*")
    .eq("id", "keelra")
    .maybeSingle();

  if (error || !data) {
    return {
      id: "keelra",
      isActive: true,
      displayName: "Keelra Operator",
      modelVersion: model.version,
      lastTrainedAt: model.trainedAt,
      trainSampleWins: 0,
      trainSampleLosses: 0,
      notes: null,
      updatedAt: new Date().toISOString(),
    };
  }

  return {
    id: data.id,
    isActive: Boolean(data.is_active),
    displayName: data.display_name,
    modelVersion: data.model_version || model.version,
    lastTrainedAt: data.last_trained_at ?? model.trainedAt,
    trainSampleWins: Number(data.train_sample_wins ?? 0),
    trainSampleLosses: Number(data.train_sample_losses ?? 0),
    notes: data.notes,
    updatedAt: data.updated_at,
  };
}

export async function loadActiveKnowledge(
  supabase: Client,
): Promise<OperatorKnowledge[]> {
  const { data, error } = await supabase
    .from("operator_knowledge")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(100);

  if (error || !data) return [];

  return data.map((row) => ({
    id: row.id,
    kind: row.kind,
    title: row.title,
    content: row.content,
    effect: parseEffect(row.effect),
    isActive: row.is_active,
    source: row.source,
    createdAt: row.created_at,
  }));
}

export type KnowledgeBias = {
  scoreDelta: number;
  minScoreDelta: number;
  blockPair: boolean;
  preferBoost: boolean;
  reasons: string[];
};

export function applyKnowledgeBias(
  knowledge: OperatorKnowledge[],
  input: { pair: string; regime: MarketRegime; modelScore: number | null },
): KnowledgeBias {
  let scoreDelta = 0;
  let minScoreDelta = 0;
  let blockPair = false;
  let preferBoost = false;
  const reasons: string[] = [];

  for (const k of knowledge) {
    const e = k.effect;
    if (e.avoidPairs?.includes(input.pair)) {
      blockPair = true;
      reasons.push(`avoid ${input.pair} (${k.title})`);
    }
    if (e.preferPairs?.includes(input.pair)) {
      preferBoost = true;
      scoreDelta += 4;
      reasons.push(`prefer ${input.pair} (${k.title})`);
    }
    if (e.preferRegime === input.regime) {
      scoreDelta += e.scoreDelta ?? 5;
      reasons.push(`prefer regime ${input.regime} (${k.title})`);
    } else if (e.avoidRegime === input.regime) {
      scoreDelta += e.scoreDelta ?? -8;
      minScoreDelta += e.minScoreDelta ?? 6;
      reasons.push(`caution regime ${input.regime} (${k.title})`);
    } else if (typeof e.scoreDelta === "number") {
      scoreDelta += e.scoreDelta;
      reasons.push(`${k.title}: Δscore ${e.scoreDelta}`);
    }
    if (typeof e.minScoreDelta === "number" && !e.avoidRegime) {
      minScoreDelta += e.minScoreDelta;
    }
  }

  return { scoreDelta, minScoreDelta, blockPair, preferBoost, reasons };
}

/**
 * Extrae un efecto estructurado simple desde texto libre en español/inglés.
 * No requiere LLM: reglas claras + el texto siempre se guarda como conocimiento.
 */
export function extractEffectFromText(text: string): KnowledgeEffect {
  const t = text.toLowerCase();
  const effect: KnowledgeEffect = { note: text.slice(0, 240) };

  if (
    t.includes("evitar bajista") ||
    t.includes("avoid downtrend") ||
    t.includes("no entrar en bajista")
  ) {
    effect.avoidRegime = "trend_down";
    effect.minScoreDelta = 8;
    effect.scoreDelta = -6;
  }
  if (
    t.includes("preferir alcista") ||
    t.includes("favor uptrend") ||
    t.includes("en tendencia alcista")
  ) {
    effect.preferRegime = "trend_up";
    effect.scoreDelta = 6;
  }
  if (
    t.includes("cuidado en rango") ||
    t.includes("cautious in range") ||
    t.includes("evitar rango")
  ) {
    effect.avoidRegime = "range";
    effect.minScoreDelta = 5;
    effect.scoreDelta = -4;
  }
  if (
    t.includes("alta volatilidad") ||
    t.includes("high vol") ||
    t.includes("mucho movimiento")
  ) {
    effect.avoidRegime = "high_vol";
    effect.minScoreDelta = 4;
  }
  if (t.includes("solo btc") || t.includes("btc only") || t.includes("preferir btc")) {
    effect.preferPairs = ["BTC/USDT"];
  }
  if (t.includes("evitar eth") || t.includes("avoid eth")) {
    effect.avoidPairs = ["ETH/USDT"];
  }
  if (
    t.includes("más agresivo") ||
    t.includes("more aggressive") ||
    t.includes("entrar más")
  ) {
    effect.minScoreDelta = -6;
    effect.scoreDelta = 4;
  }
  if (
    t.includes("más cauteloso") ||
    t.includes("more careful") ||
    t.includes("ser estricto")
  ) {
    effect.minScoreDelta = 6;
    effect.scoreDelta = -3;
  }

  return effect;
}

export function inferKnowledgeKind(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("estrateg") || t.includes("strategy") || t.includes("regla")) {
    return "strategy";
  }
  if (t.includes("mercado") || t.includes("market") || t.includes("btc") || t.includes("eth")) {
    return "market";
  }
  if (t.includes("nunca") || t.includes("siempre") || t.includes("evitar") || t.includes("prefer")) {
    return "rule";
  }
  return "lesson";
}
