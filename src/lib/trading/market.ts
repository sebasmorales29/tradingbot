import type { Candle, Pair } from "./types";

/** Public market data endpoint — works from regions where api.binance.com returns 451. */
const BASE = "https://data-api.binance.vision/api/v3";

const INTERVAL_MAP: Record<string, string> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1h": "1h",
  "4h": "4h",
  "1d": "1d",
};

function toSymbol(pair: Pair): string {
  return pair.replace("/", "");
}

export async function fetchOHLCV(
  pair: Pair,
  timeframe = "4h",
  limit = 120,
): Promise<Candle[]> {
  const interval = INTERVAL_MAP[timeframe] ?? "4h";
  const url = `${BASE}/klines?symbol=${toSymbol(pair)}&interval=${interval}&limit=${limit}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`No se pudo leer el mercado (${res.status})`);
  }
  const raw = (await res.json()) as unknown[];
  return raw.map((row) => {
    const r = row as (string | number)[];
    return {
      timestamp: Number(r[0]),
      open: Number(r[1]),
      high: Number(r[2]),
      low: Number(r[3]),
      close: Number(r[4]),
      volume: Number(r[5]),
    };
  });
}

export async function fetchTickerPrice(pair: Pair): Promise<number> {
  const url = `${BASE}/ticker/price?symbol=${toSymbol(pair)}`;
  const res = await fetch(url, { next: { revalidate: 0 } });
  if (!res.ok) {
    throw new Error(`No se pudo leer el precio (${res.status})`);
  }
  const data = (await res.json()) as { price: string };
  return Number(data.price);
}
