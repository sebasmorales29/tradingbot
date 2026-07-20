import { createAdminClient } from "@/lib/supabase/admin";
import {
  DEFAULT_TREND_PULSE,
  type TrendPulseParams,
} from "@/lib/trading/strategy/trend-pulse";

export async function loadTrendPulseParams(): Promise<TrendPulseParams> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("strategy_settings")
      .select("*")
      .eq("id", "trend_pulse")
      .maybeSingle();

    if (!data) return { ...DEFAULT_TREND_PULSE };

    return {
      name: data.name,
      timeframe: data.timeframe,
      fast: Number(data.fast),
      slow: Number(data.slow),
      atrPeriod: Number(data.atr_period),
      stopAtr: Number(data.stop_atr),
      tpAtr: Number(data.tp_atr),
      minAtrPct: Number(data.min_atr_pct),
      maxAtrPct: Number(data.max_atr_pct),
    };
  } catch {
    return { ...DEFAULT_TREND_PULSE };
  }
}

export function validateTrendPulseParams(
  input: Partial<TrendPulseParams>,
): { ok: true; value: TrendPulseParams } | { ok: false; error: string } {
  const value: TrendPulseParams = {
    name: (input.name ?? DEFAULT_TREND_PULSE.name).trim() || "Trend Pulse",
    timeframe:
      (input.timeframe ?? DEFAULT_TREND_PULSE.timeframe).trim() || "4h",
    fast: Number(input.fast),
    slow: Number(input.slow),
    atrPeriod: Number(input.atrPeriod),
    stopAtr: Number(input.stopAtr),
    tpAtr: Number(input.tpAtr),
    minAtrPct: Number(input.minAtrPct),
    maxAtrPct: Number(input.maxAtrPct),
  };

  if (
    !Number.isFinite(value.fast) ||
    !Number.isFinite(value.slow) ||
    value.fast < 2 ||
    value.fast >= value.slow ||
    value.slow > 500
  ) {
    return { ok: false, error: "EMA fast/slow inválidos (fast < slow)" };
  }
  if (
    !Number.isFinite(value.atrPeriod) ||
    value.atrPeriod < 2 ||
    value.atrPeriod > 100
  ) {
    return { ok: false, error: "atrPeriod inválido" };
  }
  if (
    !Number.isFinite(value.stopAtr) ||
    value.stopAtr <= 0 ||
    value.stopAtr > 20
  ) {
    return { ok: false, error: "stopAtr inválido" };
  }
  if (!Number.isFinite(value.tpAtr) || value.tpAtr <= 0 || value.tpAtr > 40) {
    return { ok: false, error: "tpAtr inválido" };
  }
  if (
    !Number.isFinite(value.minAtrPct) ||
    !Number.isFinite(value.maxAtrPct) ||
    value.minAtrPct < 0 ||
    value.minAtrPct >= value.maxAtrPct ||
    value.maxAtrPct > 50
  ) {
    return { ok: false, error: "rango ATR% inválido" };
  }

  return { ok: true, value };
}
