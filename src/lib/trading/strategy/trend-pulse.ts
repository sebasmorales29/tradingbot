import { atr, atrPercent, ema } from "../indicators";
import type { Candle, Pair, StrategySignal } from "../types";

const FAST = 20;
const SLOW = 50;
const ATR_PERIOD = 14;
const STOP_ATR = 1.5;
const TP_ATR = 2.5;
/** Avoid dead markets and extreme chaos */
const MIN_ATR_PCT = 0.4;
const MAX_ATR_PCT = 6;

/**
 * Trend Pulse — swing long-only on 4h.
 * Entry: EMA20 crosses above EMA50, price above EMA50, ATR% regime OK.
 * Exit signal: bearish EMA cross (stops/TP also managed by engine).
 */
export function evaluateTrendPulse(
  pair: Pair,
  candles: Candle[],
  hasOpenLong: boolean,
): StrategySignal | null {
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

export const TREND_PULSE_META = {
  name: "Trend Pulse",
  timeframe: "4h",
  fast: FAST,
  slow: SLOW,
  atrPeriod: ATR_PERIOD,
  stopAtr: STOP_ATR,
  tpAtr: TP_ATR,
  minAtrPct: MIN_ATR_PCT,
  maxAtrPct: MAX_ATR_PCT,
} as const;
