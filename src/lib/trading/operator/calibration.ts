import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import type { BotPolicy, GuidedBotPreferences } from "../bot-profile";
import { defaultMinScore } from "./model";
import type { MarketRegime } from "./regime";

export type CalibrationRow = {
  pair: string;
  regime: MarketRegime;
  tradesCount: number;
  wins: number;
  losses: number;
  winRate: number | null;
  expectancy: number | null;
  softFailDelta: number;
  volumeMultDelta: number;
  minScore: number;
  updatedAt: string | null;
};

export type CalibrationDeltas = {
  softFailDelta: number;
  volumeMultDelta: number;
  minScore: number;
  tradesCount: number;
  winRate: number | null;
};

const MIN_TRADES_TO_APPLY = 30;

const EMPTY: CalibrationDeltas = {
  softFailDelta: 0,
  volumeMultDelta: 0,
  minScore: defaultMinScore(),
  tradesCount: 0,
  winRate: null,
};

type Client = SupabaseClient<Database>;

export function applyCalibrationToPolicy(
  policy: BotPolicy,
  deltas: CalibrationDeltas,
  prefs: GuidedBotPreferences,
): BotPolicy {
  const next = { ...policy };

  // Global deltas only if enough sample
  if (deltas.tradesCount >= MIN_TRADES_TO_APPLY) {
    next.softFailTolerance = Math.max(
      0,
      Math.min(3, next.softFailTolerance + deltas.softFailDelta),
    );
    next.volumeMult = Math.max(
      0.7,
      Math.min(1.5, next.volumeMult + deltas.volumeMultDelta),
    );
  }

  // Hybrid: profile still tightens/relaxes around global calibration
  if (prefs.pace === "careful") {
    next.softFailTolerance = Math.max(0, next.softFailTolerance - 1);
    next.volumeMult = Math.min(1.5, next.volumeMult + 0.05);
  } else if (prefs.pace === "active") {
    next.softFailTolerance = Math.min(3, next.softFailTolerance + 1);
    next.volumeMult = Math.max(0.7, next.volumeMult - 0.05);
  }

  if (prefs.autonomy === "guarded") {
    next.softFailTolerance = Math.max(0, next.softFailTolerance - 1);
  }

  return next;
}

export function hybridMinScore(
  baseMin: number,
  prefs: GuidedBotPreferences,
): number {
  let min = baseMin;
  if (prefs.pace === "careful") min += 8;
  if (prefs.pace === "active") min -= 8;
  if (prefs.autonomy === "guarded") min += 5;
  if (prefs.stress === "low") min += 4;
  if (prefs.stress === "high") min -= 4;
  return Math.max(25, Math.min(80, min));
}

export async function loadCalibrationDeltas(
  supabase: Client,
  pair: string,
  regime: MarketRegime,
): Promise<CalibrationDeltas> {
  const { data: exact, error: exactErr } = await supabase
    .from("operator_calibration")
    .select("*")
    .eq("pair", pair)
    .eq("regime", regime)
    .maybeSingle();

  if (exactErr) return { ...EMPTY };

  const row = exact
    ? exact
    : (
        await supabase
          .from("operator_calibration")
          .select("*")
          .eq("pair", "*")
          .eq("regime", regime)
          .maybeSingle()
      ).data;

  if (!row) return { ...EMPTY };

  return {
    softFailDelta: Number(row.soft_fail_delta ?? 0),
    volumeMultDelta: Number(row.volume_mult_delta ?? 0),
    minScore: Number(row.min_score ?? defaultMinScore()),
    tradesCount: Number(row.trades_count ?? 0),
    winRate: row.win_rate != null ? Number(row.win_rate) : null,
  };
}

export async function listCalibration(
  supabase: Client,
): Promise<CalibrationRow[]> {
  const { data, error } = await supabase
    .from("operator_calibration")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !data) return [];

  return data.map((row) => ({
    pair: row.pair,
    regime: row.regime as MarketRegime,
    tradesCount: Number(row.trades_count),
    wins: Number(row.wins),
    losses: Number(row.losses),
    winRate: row.win_rate != null ? Number(row.win_rate) : null,
    expectancy: row.expectancy != null ? Number(row.expectancy) : null,
    softFailDelta: Number(row.soft_fail_delta),
    volumeMultDelta: Number(row.volume_mult_delta),
    minScore: Number(row.min_score),
    updatedAt: row.updated_at,
  }));
}

export function calibrationToJson(rows: CalibrationRow[]): Json {
  return rows as unknown as Json;
}

type ClosedTradeRow = {
  pair: string;
  pnl: number | null;
  entry_price: number;
  stop_loss: number | null;
  opened_at: string;
};

type SignalMetaRow = {
  pair: string;
  created_at: string;
  meta: Json;
};

export type LearnBucket = {
  pair: string;
  regime: MarketRegime;
  trades: number;
  wins: number;
  losses: number;
  pnlSum: number;
  rSum: number;
};

function regimeFromMeta(meta: Json): MarketRegime | null {
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return null;
  const r = (meta as { regime?: unknown }).regime;
  if (
    r === "trend_up" ||
    r === "trend_down" ||
    r === "range" ||
    r === "high_vol"
  ) {
    return r;
  }
  return null;
}

function findRegimeForTrade(
  trade: ClosedTradeRow,
  signals: SignalMetaRow[],
): MarketRegime {
  const opened = new Date(trade.opened_at).getTime();
  const candidates = signals
    .filter((s) => s.pair === trade.pair)
    .map((s) => ({
      regime: regimeFromMeta(s.meta),
      dist: Math.abs(new Date(s.created_at).getTime() - opened),
    }))
    .filter((c) => c.regime != null && c.dist < 6 * 60 * 60 * 1000)
    .sort((a, b) => a.dist - b.dist);

  return candidates[0]?.regime ?? "range";
}

function rMultiple(trade: ClosedTradeRow): number {
  const pnl = Number(trade.pnl ?? 0);
  const entry = Number(trade.entry_price);
  const stop = trade.stop_loss != null ? Number(trade.stop_loss) : entry * 0.985;
  const riskPerUnit = Math.abs(entry - stop);
  if (riskPerUnit <= 0) return pnl >= 0 ? 1 : -1;
  // Approximate qty from risk — use pnl / (risk * notional scale): pnl already absolute
  // Use R ≈ pnl / (entry * 0.01) as soft proxy when qty unknown
  const riskCashProxy = entry * 0.01;
  return riskCashProxy > 0 ? pnl / riskCashProxy : 0;
}

export function buildLearnBuckets(
  trades: ClosedTradeRow[],
  signals: SignalMetaRow[],
): LearnBucket[] {
  const map = new Map<string, LearnBucket>();

  const bump = (pair: string, regime: MarketRegime, trade: ClosedTradeRow) => {
    const key = `${pair}::${regime}`;
    const cur =
      map.get(key) ??
      ({
        pair,
        regime,
        trades: 0,
        wins: 0,
        losses: 0,
        pnlSum: 0,
        rSum: 0,
      } satisfies LearnBucket);
    const pnl = Number(trade.pnl ?? 0);
    cur.trades += 1;
    if (pnl > 0) cur.wins += 1;
    else cur.losses += 1;
    cur.pnlSum += pnl;
    cur.rSum += rMultiple(trade);
    map.set(key, cur);
  };

  for (const trade of trades) {
    const regime = findRegimeForTrade(trade, signals);
    bump(trade.pair, regime, trade);
    bump("*", regime, trade);
  }

  return [...map.values()];
}

export function deltasFromBucket(bucket: LearnBucket): {
  softFailDelta: number;
  volumeMultDelta: number;
  minScore: number;
  winRate: number | null;
  expectancy: number | null;
} {
  if (bucket.trades === 0) {
    return {
      softFailDelta: 0,
      volumeMultDelta: 0,
      minScore: defaultMinScore(),
      winRate: null,
      expectancy: null,
    };
  }

  const winRate = bucket.wins / bucket.trades;
  const expectancy = bucket.rSum / bucket.trades;

  // Poor performance → stricter; strong → slightly looser
  let softFailDelta = 0;
  let volumeMultDelta = 0;
  let minScore = defaultMinScore();

  if (bucket.trades >= MIN_TRADES_TO_APPLY) {
    if (winRate < 0.4 || expectancy < 0) {
      softFailDelta = -1;
      volumeMultDelta = 0.08;
      minScore = defaultMinScore() + 10;
    } else if (winRate > 0.55 && expectancy > 0.2) {
      softFailDelta = 1;
      volumeMultDelta = -0.05;
      minScore = Math.max(30, defaultMinScore() - 5);
    }
  }

  return {
    softFailDelta,
    volumeMultDelta,
    minScore,
    winRate: Math.round(winRate * 1000) / 10,
    expectancy: Math.round(expectancy * 1000) / 1000,
  };
}

export async function recomputeAndUpsertCalibration(
  supabase: Client,
): Promise<{ buckets: number }> {
  const { data: trades } = await supabase
    .from("trades")
    .select("pair, pnl, entry_price, stop_loss, opened_at")
    .eq("status", "closed")
    .order("closed_at", { ascending: false })
    .limit(2000);

  const { data: signals } = await supabase
    .from("signals")
    .select("pair, created_at, meta")
    .order("created_at", { ascending: false })
    .limit(5000);

  const buckets = buildLearnBuckets(
    (trades ?? []) as ClosedTradeRow[],
    (signals ?? []) as SignalMetaRow[],
  );

  const now = new Date().toISOString();
  for (const bucket of buckets) {
    const d = deltasFromBucket(bucket);
    await supabase.from("operator_calibration").upsert(
      {
        pair: bucket.pair,
        regime: bucket.regime,
        trades_count: bucket.trades,
        wins: bucket.wins,
        losses: bucket.losses,
        win_rate: d.winRate,
        expectancy: d.expectancy,
        soft_fail_delta: d.softFailDelta,
        volume_mult_delta: d.volumeMultDelta,
        min_score: d.minScore,
        updated_at: now,
      },
      { onConflict: "pair,regime" },
    );
  }

  return { buckets: buckets.length };
}
