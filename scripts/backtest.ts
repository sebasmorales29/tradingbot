/**
 * Offline backtest for Trend Pulse.
 * Run: npm run bot:backtest
 */
import { fetchOHLCV } from "../src/lib/trading/market";
import { evaluateTrendPulse } from "../src/lib/trading/strategy/trend-pulse";
import { sizePosition } from "../src/lib/trading/risk";
import type { Pair } from "../src/lib/trading/types";

const PAIRS: Pair[] = ["BTC/USDT", "ETH/USDT"];
const START_EQUITY = 10_000;
const RISK = 0.75;

type Pos = {
  pair: Pair;
  qty: number;
  entry: number;
  stop: number;
  tp: number;
};

async function backtestPair(pair: Pair) {
  const candles = await fetchOHLCV(pair, "4h", 500);
  let equity = START_EQUITY;
  let pos: Pos | null = null;
  let wins = 0;
  let losses = 0;
  let trades = 0;
  const pnls: number[] = [];

  for (let i = 60; i < candles.length; i++) {
    const window = candles.slice(0, i + 1);
    const price = window[window.length - 1].close;

    if (pos) {
      if (price <= pos.stop || price >= pos.tp) {
        const pnl = (price - pos.entry) * pos.qty;
        equity += pnl;
        pnls.push(pnl);
        trades++;
        if (pnl >= 0) wins++;
        else losses++;
        pos = null;
      }
    }

    const signal = evaluateTrendPulse(pair, window, Boolean(pos));
    if (!signal) continue;

    if (signal.side === "flat" && pos) {
      const pnl = (price - pos.entry) * pos.qty;
      equity += pnl;
      pnls.push(pnl);
      trades++;
      if (pnl >= 0) wins++;
      else losses++;
      pos = null;
    }

    if (signal.side === "long" && !pos && signal.stopLoss && signal.takeProfit) {
      const sized = sizePosition({
        equity,
        riskPercent: RISK,
        maxDailyLossPercent: 100,
        dayPnl: 0,
        killSwitch: false,
        price: signal.price,
        stopLoss: signal.stopLoss,
      });
      if (!sized.allowed) continue;
      pos = {
        pair,
        qty: sized.qty,
        entry: signal.price,
        stop: signal.stopLoss,
        tp: signal.takeProfit,
      };
    }
  }

  const totalPnl = equity - START_EQUITY;
  const winRate = trades ? (wins / trades) * 100 : 0;
  const avg = pnls.length ? pnls.reduce((a, b) => a + b, 0) / pnls.length : 0;

  console.log(`\n=== ${pair} (4h Trend Pulse) ===`);
  console.log(`Trades: ${trades} | Wins: ${wins} | Losses: ${losses}`);
  console.log(`Win rate: ${winRate.toFixed(1)}%`);
  console.log(`Final equity: $${equity.toFixed(2)}`);
  console.log(`PnL: ${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} USDT`);
  console.log(`Avg trade: ${avg.toFixed(2)} USDT`);
}

async function main() {
  console.log("Keelra backtest — Binance Vision public data");
  for (const pair of PAIRS) {
    await backtestPair(pair);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
