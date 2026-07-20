import type { Candle } from "./types";

export function ema(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev =
    values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

export function atr(candles: Candle[], period: number): number[] {
  if (candles.length < period + 1) return [];
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1];
    trs.push(
      Math.max(
        c.high - c.low,
        Math.abs(c.high - prev.close),
        Math.abs(c.low - prev.close),
      ),
    );
  }
  const out: number[] = [];
  let prev = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(prev);
  for (let i = period; i < trs.length; i++) {
    prev = (prev * (period - 1) + trs[i]) / period;
    out.push(prev);
  }
  return out;
}

/** Average True Range % of price — regime filter for chop. */
export function atrPercent(candles: Candle[], period: number): number | null {
  const a = atr(candles, period);
  if (!a.length) return null;
  const lastAtr = a[a.length - 1];
  const lastClose = candles[candles.length - 1].close;
  return (lastAtr / lastClose) * 100;
}

export function sma(values: number[], period: number): number[] {
  if (values.length < period) return [];
  const out: number[] = [];
  for (let i = period - 1; i < values.length; i++) {
    const slice = values.slice(i - period + 1, i + 1);
    out.push(slice.reduce((a, b) => a + b, 0) / period);
  }
  return out;
}

/** Simple trend strength: |EMA20-EMA50|/price * 100 */
export function trendSeparation(
  candles: Candle[],
  fast = 20,
  slow = 50,
): number | null {
  const closes = candles.map((c) => c.close);
  const f = ema(closes, fast);
  const s = ema(closes, slow);
  if (!f.length || !s.length) return null;
  const price = closes[closes.length - 1];
  const fastVal = f[f.length - 1];
  const slowVal = s[s.length - 1];
  return (Math.abs(fastVal - slowVal) / price) * 100;
}
