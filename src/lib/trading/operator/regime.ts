import {
  atrPercent,
  ema,
  seriesSlope,
  trendSeparation,
} from "../indicators";
import type { Candle } from "../types";

export type MarketRegime =
  | "trend_up"
  | "trend_down"
  | "range"
  | "high_vol";

export type RegimeReading = {
  regime: MarketRegime;
  atrPct: number | null;
  slowSlopePct: number | null;
  separationPct: number | null;
  detail: string;
};

const HIGH_VOL_ATR_PCT = 3.5;
const RANGE_SEP_PCT = 0.35;
const TREND_SLOPE_PCT = 0.01;

/**
 * Clasifica el régimen de mercado a partir de velas.
 * Long-only: trend_down casi siempre bloquea entradas nuevas.
 */
export function detectMarketRegime(
  candles: Candle[],
  atrPeriod = 14,
  fast = 20,
  slow = 50,
): RegimeReading {
  if (candles.length < slow + 10) {
    return {
      regime: "range",
      atrPct: null,
      slowSlopePct: null,
      separationPct: null,
      detail: "insufficient_data",
    };
  }

  const closes = candles.map((c) => c.close);
  const price = closes[closes.length - 1];
  const atrPct = atrPercent(candles, atrPeriod);
  const slowSeries = ema(closes, slow);
  const slowSlope = seriesSlope(slowSeries, 5);
  const slowSlopePct =
    slowSlope != null && price > 0 ? (slowSlope / price) * 100 : null;
  const separationPct = trendSeparation(candles, fast, slow);

  if (atrPct != null && atrPct >= HIGH_VOL_ATR_PCT) {
    return {
      regime: "high_vol",
      atrPct,
      slowSlopePct,
      separationPct,
      detail: `atr=${atrPct.toFixed(2)}`,
    };
  }

  const slopingUp =
    slowSlopePct != null && slowSlopePct >= TREND_SLOPE_PCT;
  const slopingDown =
    slowSlopePct != null && slowSlopePct <= -TREND_SLOPE_PCT;
  const tight =
    separationPct != null && separationPct < RANGE_SEP_PCT;

  if (slopingDown) {
    return {
      regime: "trend_down",
      atrPct,
      slowSlopePct,
      separationPct,
      detail: `slope=${slowSlopePct?.toFixed(3)}`,
    };
  }

  if (slopingUp && !tight) {
    return {
      regime: "trend_up",
      atrPct,
      slowSlopePct,
      separationPct,
      detail: `slope=${slowSlopePct?.toFixed(3)} sep=${separationPct?.toFixed(2)}`,
    };
  }

  return {
    regime: "range",
    atrPct,
    slowSlopePct,
    separationPct,
    detail: `sep=${separationPct?.toFixed(2) ?? "—"}`,
  };
}
