import { atr, atrPercent, higherTimeframe } from "./indicators";
import {
  decideTrendPulse,
  type DecisionCheck,
  type TrendPulseParams,
} from "./strategy/trend-pulse";
import { sizePosition } from "./risk";
import type { Candle, Pair } from "./types";

const SLIPPAGE = 0.0005;
const MAX_DAILY_LOSS = 3;

export type LivePosition = {
  id: string;
  entry: number;
  qty: number;
  stopLoss: number;
  takeProfit: number | null;
  entryReason: string;
  openedAt: string;
};

export type LiveEvent = {
  id: string;
  at: string;
  kind: "info" | "long" | "flat" | "stop" | "tp" | "skip" | "hold" | "tick";
  message: string;
  price: number;
  equity: number;
};

export type LiveTrade = {
  id: string;
  entry: number;
  exit: number;
  qty: number;
  pnl: number;
  entryReason: string;
  exitReason: string;
  openedAt: string;
  closedAt: string;
};

export type LiveEquityPoint = {
  t: number;
  equity: number;
  price: number;
};

export type LiveSandboxState = {
  sessionId: string;
  startedAt: string;
  pair: Pair;
  timeframe: string;
  startingEquity: number;
  equity: number;
  riskPercent: number;
  params: TrendPulseParams;
  dayPnl: number;
  dayKey: string;
  position: LivePosition | null;
  closedTrades: LiveTrade[];
  events: LiveEvent[];
  equityPoints: LiveEquityPoint[];
  tickCount: number;
  lastCandleOpenTime: number | null;
  lastAction: string;
  lastScore: number;
  lastChecks: DecisionCheck[];
};

export type LiveTickResult = {
  state: LiveSandboxState;
  market: {
    price: number;
    candleTime: number;
    atrPct: number | null;
    emaCrossHint: string;
    score: number;
    verdict: string;
  };
  candles: { timestamp: number; close: number; high: number; low: number }[];
};

function markEquity(state: LiveSandboxState, price: number): number {
  if (!state.position) return state.equity;
  return (
    state.equity + (price - state.position.entry) * state.position.qty
  );
}

function pushEvent(
  state: LiveSandboxState,
  event: Omit<LiveEvent, "id">,
): void {
  state.events.push({
    ...event,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  });
  if (state.events.length > 80) {
    state.events = state.events.slice(-80);
  }
}

export function createLiveSession(input: {
  pair: Pair;
  timeframe: string;
  startingEquity: number;
  riskPercent: number;
  params: TrendPulseParams;
}): LiveSandboxState {
  const now = new Date().toISOString();
  return {
    sessionId: `live-${Date.now()}`,
    startedAt: now,
    pair: input.pair,
    timeframe: input.timeframe,
    startingEquity: input.startingEquity,
    equity: input.startingEquity,
    riskPercent: input.riskPercent,
    params: input.params,
    dayPnl: 0,
    dayKey: now.slice(0, 10),
    position: null,
    closedTrades: [],
    events: [
      {
        id: `start-${Date.now()}`,
        at: now,
        kind: "info",
        message: `Sesión en vivo · ${input.pair} · ${input.timeframe} (+ sesgo ${higherTimeframe(input.timeframe)}) · equity $${input.startingEquity} · riesgo ${input.riskPercent}%`,
        price: 0,
        equity: input.startingEquity,
      },
    ],
    equityPoints: [],
    tickCount: 0,
    lastCandleOpenTime: null,
    lastAction: "Sesión creada — esperando primer tick",
    lastScore: 0,
    lastChecks: [],
  };
}

/**
 * Un tick = el bot evalúa el mercado real ahora (checklist experta).
 */
export function liveSandboxTick(
  state: LiveSandboxState,
  candles: Candle[],
  tickerPrice: number,
  htfCandles?: Candle[],
): LiveTickResult {
  const next: LiveSandboxState = {
    ...state,
    position: state.position ? { ...state.position } : null,
    closedTrades: [...state.closedTrades],
    events: [...state.events],
    equityPoints: [...state.equityPoints],
    params: { ...state.params },
    lastChecks: [...state.lastChecks],
  };

  next.tickCount += 1;
  const nowIso = new Date().toISOString();
  const dayKey = nowIso.slice(0, 10);
  if (dayKey !== next.dayKey) {
    next.dayKey = dayKey;
    next.dayPnl = 0;
  }

  const last = candles[candles.length - 1];
  const price = tickerPrice || last.close;
  const candleOpen = last.timestamp;
  next.lastCandleOpenTime = candleOpen;

  const atrPct = atrPercent(candles, next.params.atrPeriod);

  // Trailing paper stop
  if (next.position) {
    const atrSeries = atr(candles, next.params.atrPeriod);
    const lastAtr = atrSeries[atrSeries.length - 1];
    if (lastAtr > 0) {
      const risk = next.position.entry - next.position.stopLoss;
      const oneR =
        risk > 0
          ? next.position.entry + risk
          : next.position.entry + lastAtr * next.params.stopAtr;
      if (price >= oneR) {
        const breakeven = next.position.entry * (1 + SLIPPAGE);
        const trail = price - next.params.stopAtr * lastAtr;
        next.position.stopLoss = Math.max(
          next.position.stopLoss,
          breakeven,
          trail,
        );
      }
    }

    const hitStop =
      last.low <= next.position.stopLoss || price <= next.position.stopLoss;
    const hitTp =
      next.position.takeProfit != null &&
      (last.high >= next.position.takeProfit ||
        price >= next.position.takeProfit);

    if (hitStop || hitTp) {
      const exitPrice = hitStop
        ? next.position.stopLoss * (1 - SLIPPAGE)
        : next.position.takeProfit! * (1 - SLIPPAGE);
      const pnl = (exitPrice - next.position.entry) * next.position.qty;
      next.equity += pnl;
      next.dayPnl += pnl;
      const exitReason = hitStop
        ? "Stop / trailing (mercado real)"
        : "Take profit (mercado real)";
      next.closedTrades.unshift({
        id: next.position.id,
        entry: next.position.entry,
        exit: exitPrice,
        qty: next.position.qty,
        pnl,
        entryReason: next.position.entryReason,
        exitReason,
        openedAt: next.position.openedAt,
        closedAt: nowIso,
      });
      pushEvent(next, {
        at: nowIso,
        kind: hitStop ? "stop" : "tp",
        message: `${exitReason} · pnl ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`,
        price: exitPrice,
        equity: next.equity,
      });
      next.lastAction = exitReason;
      next.position = null;
    }
  }

  const hasOpen = Boolean(next.position);
  const decision = decideTrendPulse(
    next.pair,
    candles,
    hasOpen,
    next.params,
    { htfCandles },
  );

  next.lastScore = decision.score;
  next.lastChecks = decision.checks;
  next.lastAction = decision.summary;

  const signal = decision.signal;

  if (signal?.side === "flat" && next.position) {
    const exitPrice = signal.price * (1 - SLIPPAGE);
    const pnl = (exitPrice - next.position.entry) * next.position.qty;
    next.equity += pnl;
    next.dayPnl += pnl;
    next.closedTrades.unshift({
      id: next.position.id,
      entry: next.position.entry,
      exit: exitPrice,
      qty: next.position.qty,
      pnl,
      entryReason: next.position.entryReason,
      exitReason: signal.reason,
      openedAt: next.position.openedAt,
      closedAt: nowIso,
    });
    pushEvent(next, {
      at: nowIso,
      kind: "flat",
      message: `${signal.reason} · pnl ${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`,
      price: exitPrice,
      equity: next.equity,
    });
    next.position = null;
  } else if (
    signal?.side === "long" &&
    !next.position &&
    signal.stopLoss != null
  ) {
    const sized = sizePosition({
      equity: next.equity,
      riskPercent: next.riskPercent,
      maxDailyLossPercent: MAX_DAILY_LOSS,
      dayPnl: next.dayPnl,
      killSwitch: false,
      price: signal.price,
      stopLoss: signal.stopLoss,
    });

    if (!sized.allowed) {
      pushEvent(next, {
        at: nowIso,
        kind: "skip",
        message: `Checklist OK pero riesgo bloquea · ${sized.reason}`,
        price,
        equity: next.equity,
      });
      next.lastAction = `Señal ignorada: ${sized.reason}`;
    } else {
      const entry = signal.price * (1 + SLIPPAGE);
      next.position = {
        id: `pos-${Date.now()}`,
        entry,
        qty: sized.qty,
        stopLoss: signal.stopLoss,
        takeProfit: signal.takeProfit ?? null,
        entryReason: signal.reason,
        openedAt: nowIso,
      };
      pushEvent(next, {
        at: nowIso,
        kind: "long",
        message: `${signal.reason} · qty ${sized.qty.toFixed(6)} @ ${entry.toFixed(2)} · SL ${signal.stopLoss.toFixed(2)}`,
        price: entry,
        equity: next.equity,
      });
    }
  } else {
    const failed = decision.checks
      .filter((c) => !c.pass)
      .map((c) => c.label)
      .slice(0, 3);
    pushEvent(next, {
      at: nowIso,
      kind: decision.verdict === "skip" ? "skip" : "hold",
      message: `Tick #${next.tickCount} · score ${decision.score} · ${decision.summary}${
        failed.length ? ` · falla: ${failed.join(", ")}` : ""
      }`,
      price,
      equity: markEquity(next, price),
    });
  }

  const marked = markEquity(next, price);
  next.equityPoints.push({
    t: Date.now(),
    equity: marked,
    price,
  });
  if (next.equityPoints.length > 200) {
    next.equityPoints = next.equityPoints.slice(-200);
  }

  return {
    state: next,
    market: {
      price,
      candleTime: candleOpen,
      atrPct,
      emaCrossHint: decision.summary,
      score: decision.score,
      verdict: decision.verdict,
    },
    candles: candles.map((c) => ({
      timestamp: c.timestamp,
      close: c.close,
      high: c.high,
      low: c.low,
    })),
  };
}
