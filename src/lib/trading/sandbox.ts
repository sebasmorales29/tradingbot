import { atrPercent, ema } from "./indicators";
import { evaluateTrendPulse, type TrendPulseParams } from "./strategy/trend-pulse";
import { sizePosition } from "./risk";
import type { Candle, Pair } from "./types";

const SLIPPAGE = 0.0005;
const MAX_DAILY_LOSS = 3;

export type SandboxConfig = {
  pair: Pair;
  startingEquity: number;
  riskPercent: number;
  params: TrendPulseParams;
};

export type SandboxDecision = {
  index: number;
  time: number;
  kind: "info" | "long" | "flat" | "stop" | "tp" | "skip" | "hold";
  message: string;
  price: number;
  equity: number;
};

export type SandboxTrade = {
  id: string;
  pair: Pair;
  entry: number;
  exit: number | null;
  qty: number;
  stopLoss: number;
  takeProfit: number | null;
  pnl: number | null;
  entryIndex: number;
  exitIndex: number | null;
  entryReason: string;
  exitReason: string | null;
};

export type SandboxMarker = {
  index: number;
  type: "entry" | "exit";
  price: number;
};

export type SandboxResult = {
  pair: Pair;
  candles: Candle[];
  emaFast: (number | null)[];
  emaSlow: (number | null)[];
  equityCurve: number[];
  decisions: SandboxDecision[];
  trades: SandboxTrade[];
  markers: SandboxMarker[];
  finalEquity: number;
  startingEquity: number;
  stats: {
    trades: number;
    wins: number;
    losses: number;
    winRate: number | null;
    pnl: number;
    maxDrawdownPct: number;
  };
};

function alignEma(closes: number[], period: number): (number | null)[] {
  const series = ema(closes, period);
  const pad = closes.length - series.length;
  return [...Array(Math.max(0, pad)).fill(null), ...series];
}

/**
 * Simula Trend Pulse sobre velas reales (paper).
 * Recorre cada vela y registra decisiones, trades y equity.
 */
export function runSandbox(
  candles: Candle[],
  config: SandboxConfig,
): SandboxResult {
  const { pair, startingEquity, riskPercent, params } = config;
  const closes = candles.map((c) => c.close);
  const emaFast = alignEma(closes, params.fast);
  const emaSlow = alignEma(closes, params.slow);

  let equity = startingEquity;
  const equityCurve: number[] = [];
  const decisions: SandboxDecision[] = [];
  const trades: SandboxTrade[] = [];
  const markers: SandboxMarker[] = [];

  let position: SandboxTrade | null = null;
  let peak = startingEquity;
  let maxDd = 0;
  let dayPnl = 0;
  let dayKey = "";

  const warm = Math.max(params.slow + 5, params.atrPeriod + 5);

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const price = candle.close;
    const dKey = new Date(candle.timestamp).toISOString().slice(0, 10);
    if (dKey !== dayKey) {
      dayKey = dKey;
      dayPnl = 0;
    }

    // Mark-to-market equity
    let markEquity = equity;
    if (position) {
      markEquity = equity + (price - position.entry) * position.qty;
    }
    peak = Math.max(peak, markEquity);
    const dd = peak > 0 ? ((peak - markEquity) / peak) * 100 : 0;
    maxDd = Math.max(maxDd, dd);
    equityCurve.push(markEquity);

    if (i < warm) {
      if (i === warm - 1) {
        decisions.push({
          index: i,
          time: candle.timestamp,
          kind: "info",
          message: `Warm-up listo (${warm} velas). Empieza la evaluación Trend Pulse.`,
          price,
          equity: markEquity,
        });
      }
      continue;
    }

    const window = candles.slice(0, i + 1);

    // Manage open position: SL / TP / signal exit
    if (position) {
      const hitStop = candle.low <= position.stopLoss;
      const hitTp =
        position.takeProfit != null && candle.high >= position.takeProfit;

      if (hitStop || hitTp) {
        const exitPrice = hitStop
          ? position.stopLoss * (1 - SLIPPAGE)
          : position.takeProfit! * (1 - SLIPPAGE);
        const pnl = (exitPrice - position.entry) * position.qty;
        equity += pnl;
        dayPnl += pnl;
        position.exit = exitPrice;
        position.pnl = pnl;
        position.exitIndex = i;
        position.exitReason = hitStop
          ? "Stop loss alcanzado"
          : "Take profit alcanzado";
        trades.push(position);
        markers.push({ index: i, type: "exit", price: exitPrice });
        decisions.push({
          index: i,
          time: candle.timestamp,
          kind: hitStop ? "stop" : "tp",
          message: `${position.exitReason} · pnl ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`,
          price: exitPrice,
          equity,
        });
        position = null;
        equityCurve[equityCurve.length - 1] = equity;
        continue;
      }
    }

    const signal = evaluateTrendPulse(
      pair,
      window,
      Boolean(position),
      params,
    );

    if (!signal) {
      // occasional hold note every ~20 bars when flat to show "alive"
      if (!position && i % 20 === 0) {
        const atrPct = atrPercent(window, params.atrPeriod);
        decisions.push({
          index: i,
          time: candle.timestamp,
          kind: "hold",
          message: `Sin señal · precio ${price.toFixed(2)}${
            atrPct != null ? ` · ATR% ${atrPct.toFixed(2)}` : ""
          }`,
          price,
          equity: markEquity,
        });
      }
      continue;
    }

    if (signal.side === "flat" && position) {
      const exitPrice = signal.price * (1 - SLIPPAGE);
      const pnl = (exitPrice - position.entry) * position.qty;
      equity += pnl;
      dayPnl += pnl;
      position.exit = exitPrice;
      position.pnl = pnl;
      position.exitIndex = i;
      position.exitReason = signal.reason;
      trades.push(position);
      markers.push({ index: i, type: "exit", price: exitPrice });
      decisions.push({
        index: i,
        time: candle.timestamp,
        kind: "flat",
        message: `Salida · ${signal.reason} · pnl ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`,
        price: exitPrice,
        equity,
      });
      position = null;
      equityCurve[equityCurve.length - 1] = equity;
      continue;
    }

    if (signal.side === "long" && !position && signal.stopLoss != null) {
      const sized = sizePosition({
        equity,
        riskPercent,
        maxDailyLossPercent: MAX_DAILY_LOSS,
        dayPnl,
        killSwitch: false,
        price: signal.price,
        stopLoss: signal.stopLoss,
      });

      if (!sized.allowed) {
        decisions.push({
          index: i,
          time: candle.timestamp,
          kind: "skip",
          message: `Señal LONG ignorada · ${sized.reason ?? "riesgo"}`,
          price: signal.price,
          equity,
        });
        continue;
      }

      const entry = signal.price * (1 + SLIPPAGE);
      position = {
        id: `sb-${i}`,
        pair,
        entry,
        exit: null,
        qty: sized.qty,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit ?? null,
        pnl: null,
        entryIndex: i,
        exitIndex: null,
        entryReason: signal.reason,
        exitReason: null,
      };
      markers.push({ index: i, type: "entry", price: entry });
      decisions.push({
        index: i,
        time: candle.timestamp,
        kind: "long",
        message: `Entrada LONG · ${signal.reason} · qty ${sized.qty.toFixed(6)} · SL ${signal.stopLoss.toFixed(2)}`,
        price: entry,
        equity,
      });
    }
  }

  // Close open at last price for reporting
  if (position) {
    const last = candles[candles.length - 1];
    const exitPrice = last.close;
    const pnl = (exitPrice - position.entry) * position.qty;
    position.exit = exitPrice;
    position.pnl = pnl;
    position.exitIndex = candles.length - 1;
    position.exitReason = "Fin de simulación (marcado a mercado)";
    trades.push(position);
    markers.push({
      index: candles.length - 1,
      type: "exit",
      price: exitPrice,
    });
    equity += pnl;
    equityCurve[equityCurve.length - 1] = equity;
    decisions.push({
      index: candles.length - 1,
      time: last.timestamp,
      kind: "info",
      message: `Posición abierta cerrada al final · pnl ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`,
      price: exitPrice,
      equity,
    });
    position = null;
  }

  const closed = trades.filter((t) => t.pnl != null);
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0).length;
  const pnl = closed.reduce((s, t) => s + Number(t.pnl ?? 0), 0);

  return {
    pair,
    candles,
    emaFast,
    emaSlow,
    equityCurve,
    decisions,
    trades,
    markers,
    finalEquity: equity,
    startingEquity,
    stats: {
      trades: closed.length,
      wins,
      losses: closed.length - wins,
      winRate:
        closed.length > 0
          ? Math.round((wins / closed.length) * 1000) / 10
          : null,
      pnl,
      maxDrawdownPct: Math.round(maxDd * 10) / 10,
    },
  };
}
