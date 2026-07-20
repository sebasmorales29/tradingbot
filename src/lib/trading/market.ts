import ccxt from "ccxt";
import type { Candle, Pair } from "./types";

const exchange = new ccxt.binance({
  enableRateLimit: true,
  options: { defaultType: "spot" },
});

export async function fetchOHLCV(
  pair: Pair,
  timeframe = "4h",
  limit = 120,
): Promise<Candle[]> {
  const raw = await exchange.fetchOHLCV(pair, timeframe, undefined, limit);
  return raw.map(([timestamp, open, high, low, close, volume]) => ({
    timestamp: Number(timestamp),
    open: Number(open),
    high: Number(high),
    low: Number(low),
    close: Number(close),
    volume: Number(volume),
  }));
}

export async function fetchTickerPrice(pair: Pair): Promise<number> {
  const t = await exchange.fetchTicker(pair);
  return Number(t.last ?? t.close);
}
