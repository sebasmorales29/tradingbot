import {
  atr,
  atrPercent,
  ema,
  rsi,
  seriesSlope,
  volumeSma,
} from "../indicators";
import type { Candle } from "../types";
import type { MarketRegime } from "./regime";

/** Vector estable para score / entrenamiento. Valores en escalas naturales. */
export type OperatorFeatures = {
  rsi: number;
  atrPct: number;
  slowSlopePct: number;
  extensionAtr: number;
  volRatio: number;
  htfBias: number; // 1 bull, 0 neutral/missing, -1 bear
  regimeTrendUp: number;
  regimeTrendDown: number;
  regimeRange: number;
  regimeHighVol: number;
};

export function extractOperatorFeatures(
  candles: Candle[],
  regime: MarketRegime,
  htfCandles?: Candle[],
  fast = 20,
  slow = 50,
  atrPeriod = 14,
): OperatorFeatures | null {
  if (candles.length < slow + 10) return null;

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const fastSeries = ema(closes, fast);
  const slowSeries = ema(closes, slow);
  const atrSeries = atr(candles, atrPeriod);
  const rsiSeries = rsi(closes, 14);
  if (!fastSeries.length || !slowSeries.length || !atrSeries.length || !rsiSeries.length) {
    return null;
  }

  const lastAtr = atrSeries[atrSeries.length - 1];
  const lastRsi = rsiSeries[rsiSeries.length - 1];
  const fastVal = fastSeries[fastSeries.length - 1];
  const slowSlope = seriesSlope(slowSeries, 5);
  const slowSlopePct =
    slowSlope != null && price > 0 ? (slowSlope / price) * 100 : 0;
  const atrPct = atrPercent(candles, atrPeriod) ?? 0;
  const extensionAtr = lastAtr > 0 ? (price - fastVal) / lastAtr : 0;

  const closedIdx = candles.length >= 2 ? candles.length - 2 : candles.length - 1;
  const closedVol = candles[closedIdx].volume;
  const volBasis = candles.slice(0, closedIdx + 1);
  const volSmaClosed = volumeSma(volBasis, 20);
  const closedVolSma = volSmaClosed.length
    ? volSmaClosed[volSmaClosed.length - 1]
    : 0;
  const volRatio = closedVolSma > 0 ? closedVol / closedVolSma : 1;

  let htfBias = 0;
  if (htfCandles && htfCandles.length >= slow + 5) {
    const htfCloses = htfCandles.map((c) => c.close);
    const htfFast = ema(htfCloses, fast);
    const htfSlow = ema(htfCloses, slow);
    if (htfFast.length && htfSlow.length) {
      const hf = htfFast[htfFast.length - 1];
      const hs = htfSlow[htfSlow.length - 1];
      const hp = htfCloses[htfCloses.length - 1];
      htfBias = hf > hs && hp > hs ? 1 : hf < hs && hp < hs ? -1 : 0;
    }
  }

  return {
    rsi: lastRsi,
    atrPct,
    slowSlopePct,
    extensionAtr,
    volRatio,
    htfBias,
    regimeTrendUp: regime === "trend_up" ? 1 : 0,
    regimeTrendDown: regime === "trend_down" ? 1 : 0,
    regimeRange: regime === "range" ? 1 : 0,
    regimeHighVol: regime === "high_vol" ? 1 : 0,
  };
}
