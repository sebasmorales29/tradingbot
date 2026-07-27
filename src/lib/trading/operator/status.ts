import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { listCalibration, type CalibrationRow } from "./calibration";
import { getOperatorModelInfo, type OperatorModelInfo } from "./model";
import type { MarketRegime } from "./regime";
import type { OperatorMeta } from "./decide";

export type OperatorStatus = {
  model: OperatorModelInfo;
  lastDecision: {
    pair: string;
    reason: string | null;
    side: "long" | "flat";
    createdAt: string;
    meta: OperatorMeta | null;
  } | null;
  calibration: CalibrationRow[];
  calibratedBuckets: number;
  totalCalibratedTrades: number;
};

function parseMeta(raw: Json | null | undefined): OperatorMeta | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const regime = o.regime;
  if (
    regime !== "trend_up" &&
    regime !== "trend_down" &&
    regime !== "range" &&
    regime !== "high_vol"
  ) {
    return null;
  }
  return {
    regime: regime as MarketRegime,
    regimeDetail: String(o.regimeDetail ?? ""),
    modelScore: typeof o.modelScore === "number" ? o.modelScore : null,
    minScore: typeof o.minScore === "number" ? o.minScore : 45,
    modelVersion: String(o.modelVersion ?? "v1"),
    checklistScore: typeof o.checklistScore === "number" ? o.checklistScore : 0,
    blockedBy: typeof o.blockedBy === "string" ? o.blockedBy : null,
  };
}

export async function loadOperatorStatus(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<OperatorStatus> {
  const [{ data: lastSignal }, calibration] = await Promise.all([
    supabase
      .from("signals")
      .select("pair, reason, side, created_at, meta")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    listCalibration(supabase),
  ]);

  const totalCalibratedTrades = calibration
    .filter((c) => c.pair === "*")
    .reduce((s, c) => s + c.tradesCount, 0);

  return {
    model: getOperatorModelInfo(),
    lastDecision: lastSignal
      ? {
          pair: lastSignal.pair,
          reason: lastSignal.reason,
          side: lastSignal.side,
          createdAt: lastSignal.created_at,
          meta: parseMeta(lastSignal.meta),
        }
      : null,
    calibration: calibration.filter((c) => c.pair === "*").slice(0, 8),
    calibratedBuckets: calibration.length,
    totalCalibratedTrades,
  };
}
