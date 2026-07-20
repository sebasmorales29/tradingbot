import { atr, atrPercent, ema } from "../indicators";
import type { Candle, Pair, StrategySignal } from "../types";

export type TrendPulseParams = {
  name: string;
  timeframe: string;
  fast: number;
  slow: number;
  atrPeriod: number;
  stopAtr: number;
  tpAtr: number;
  minAtrPct: number;
  maxAtrPct: number;
};

export const DEFAULT_TREND_PULSE: TrendPulseParams = {
  name: "Trend Pulse",
  timeframe: "4h",
  fast: 20,
  slow: 50,
  atrPeriod: 14,
  stopAtr: 1.5,
  tpAtr: 2.5,
  minAtrPct: 0.4,
  maxAtrPct: 6,
};

/**
 * Trend Pulse — swing long-only on 4h.
 * Entry: EMA fast crosses above EMA slow, price above slow, ATR% regime OK.
 * Exit signal: bearish EMA cross (stops/TP also managed by engine).
 */
export function evaluateTrendPulse(
  pair: Pair,
  candles: Candle[],
  hasOpenLong: boolean,
  params: TrendPulseParams = DEFAULT_TREND_PULSE,
): StrategySignal | null {
  const {
    fast: FAST,
    slow: SLOW,
    atrPeriod: ATR_PERIOD,
    stopAtr: STOP_ATR,
    tpAtr: TP_ATR,
    minAtrPct: MIN_ATR_PCT,
    maxAtrPct: MAX_ATR_PCT,
  } = params;

  if (candles.length < SLOW + 5) return null;

  const closes = candles.map((c) => c.close);
  const fastSeries = ema(closes, FAST);
  const slowSeries = ema(closes, SLOW);
  const atrSeries = atr(candles, ATR_PERIOD);
  const atrPct = atrPercent(candles, ATR_PERIOD);

  if (fastSeries.length < 2 || slowSeries.length < 2 || !atrSeries.length) {
    return null;
  }

  const iFast = fastSeries.length - 1;
  const iSlow = slowSeries.length - 1;
  const fast = fastSeries[iFast];
  const slow = slowSeries[iSlow];
  const prevFast = fastSeries[iFast - 1];
  const prevSlow = slowSeries[iSlow - 1];
  const price = closes[closes.length - 1];
  const lastAtr = atrSeries[atrSeries.length - 1];

  const bullishCross = prevFast <= prevSlow && fast > slow;
  const bearishCross = prevFast >= prevSlow && fast < slow;
  const aboveSlow = price > slow;
  const regimeOk =
    atrPct != null && atrPct >= MIN_ATR_PCT && atrPct <= MAX_ATR_PCT;

  if (hasOpenLong) {
    if (bearishCross) {
      return {
        pair,
        side: "flat",
        price,
        reason: "Cruce EMA bajista — cerrar long",
        atr: lastAtr,
        strength: atrPct ?? undefined,
      };
    }
    return null;
  }

  if (bullishCross && aboveSlow && regimeOk) {
    return {
      pair,
      side: "long",
      price,
      reason: `Trend Pulse long — cruce EMA · ATR% ${atrPct!.toFixed(2)}`,
      stopLoss: price - STOP_ATR * lastAtr,
      takeProfit: price + TP_ATR * lastAtr,
      atr: lastAtr,
      strength: atrPct ?? undefined,
    };
  }

  return null;
}

/** @deprecated usar DEFAULT_TREND_PULSE / loadTrendPulseParams */
export const TREND_PULSE_META = DEFAULT_TREND_PULSE;
