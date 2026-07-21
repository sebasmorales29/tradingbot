import type { Locale } from "@/lib/i18n/dictionary";
import { createAdminClient } from "@/lib/supabase/admin";
import { higherTimeframe } from "@/lib/trading/indicators";
import { fetchOHLCV, fetchTickerPrice } from "@/lib/trading/market";
import {
  liveSandboxTick,
  type LiveSandboxState,
  type LiveTickResult,
} from "@/lib/trading/live-sandbox";
import type { DecisionCheck } from "@/lib/trading/strategy/trend-pulse";

export type SandboxMarket = {
  price: number;
  candleTime: number;
  atrPct: number | null;
  emaCrossHint: string;
  score?: number;
  verdict?: string;
};

export type SandboxCandle = {
  timestamp: number;
  close: number;
  high: number;
  low: number;
};

export type PersistedSandboxSession = {
  userId: string;
  sessionId: string;
  isActive: boolean;
  liveOn: boolean;
  tickIntervalMs: number;
  state: LiveSandboxState;
  market: SandboxMarket | null;
  candles: SandboxCandle[];
  lastTickAt: string;
};

function normalizeState(raw: LiveSandboxState): LiveSandboxState {
  return {
    ...raw,
    lastScore: raw.lastScore ?? 0,
    lastChecks: (raw.lastChecks ?? []) as DecisionCheck[],
    closedTrades: raw.closedTrades ?? [],
    events: raw.events ?? [],
    equityPoints: raw.equityPoints ?? [],
  };
}

export async function loadSandboxSession(
  userId: string,
): Promise<PersistedSandboxSession | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sandbox_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data) return null;

  return {
    userId: data.user_id,
    sessionId: data.session_id,
    isActive: data.is_active,
    liveOn: data.live_on,
    tickIntervalMs: Number(data.tick_interval_ms) || 20_000,
    state: normalizeState(data.state as LiveSandboxState),
    market: (data.market as SandboxMarket | null) ?? null,
    candles: (data.candles as SandboxCandle[] | null) ?? [],
    lastTickAt: data.last_tick_at,
  };
}

export async function saveSandboxSession(input: {
  userId: string;
  state: LiveSandboxState;
  market: SandboxMarket | null;
  candles: SandboxCandle[];
  tickIntervalMs: number;
  liveOn: boolean;
  isActive?: boolean;
}): Promise<void> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { error } = await admin.from("sandbox_sessions").upsert(
    {
      user_id: input.userId,
      session_id: input.state.sessionId,
      is_active: input.isActive ?? true,
      live_on: input.liveOn,
      tick_interval_ms: input.tickIntervalMs,
      state: input.state,
      market: input.market,
      candles: input.candles,
      last_tick_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) throw new Error(error.message);
}

export type SandboxSessionLogSummary = {
  id: string;
  sessionId: string;
  pair: string;
  timeframe: string;
  startingEquity: number;
  finalEquity: number;
  pnl: number;
  tradesCount: number;
  wins: number;
  losses: number;
  ticks: number;
  tickIntervalMs: number;
  riskPercent: number;
  startedAt: string;
  endedAt: string;
};

export type SandboxSessionLogDetail = SandboxSessionLogSummary & {
  state: LiveSandboxState;
  market: SandboxMarket | null;
};

function markEquityFromState(
  state: LiveSandboxState,
  market: SandboxMarket | null,
): number {
  if (!state.position || !market) return state.equity;
  return state.equity + (market.price - state.position.entry) * state.position.qty;
}

/** Guarda un snapshot en el historial de Logs (no borra la sesión activa). */
export async function archiveSandboxSession(
  userId: string,
  session: PersistedSandboxSession,
): Promise<string> {
  const admin = createAdminClient();
  const state = normalizeState(session.state);
  const finalEquity = markEquityFromState(state, session.market);
  const wins = state.closedTrades.filter((t) => t.pnl > 0).length;
  const losses = state.closedTrades.filter((t) => t.pnl <= 0).length;
  const now = new Date().toISOString();

  const { data, error } = await admin
    .from("sandbox_session_logs")
    .insert({
      user_id: userId,
      session_id: state.sessionId,
      pair: state.pair,
      timeframe: state.timeframe,
      starting_equity: state.startingEquity,
      final_equity: finalEquity,
      pnl: finalEquity - state.startingEquity,
      trades_count: state.closedTrades.length,
      wins,
      losses,
      ticks: state.tickCount,
      tick_interval_ms: session.tickIntervalMs,
      risk_percent: state.riskPercent,
      state,
      market: session.market,
      started_at: state.startedAt,
      ended_at: now,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function listSandboxSessionLogs(
  userId: string,
  limit = 50,
): Promise<SandboxSessionLogSummary[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sandbox_session_logs")
    .select(
      "id, session_id, pair, timeframe, starting_equity, final_equity, pnl, trades_count, wins, losses, ticks, tick_interval_ms, risk_percent, started_at, ended_at",
    )
    .eq("user_id", userId)
    .order("ended_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    sessionId: row.session_id,
    pair: row.pair,
    timeframe: row.timeframe,
    startingEquity: Number(row.starting_equity),
    finalEquity: Number(row.final_equity),
    pnl: Number(row.pnl),
    tradesCount: row.trades_count,
    wins: row.wins,
    losses: row.losses,
    ticks: row.ticks,
    tickIntervalMs: row.tick_interval_ms,
    riskPercent: Number(row.risk_percent),
    startedAt: row.started_at,
    endedAt: row.ended_at,
  }));
}

export async function getSandboxSessionLog(
  userId: string,
  logId: string,
): Promise<SandboxSessionLogDetail | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sandbox_session_logs")
    .select("*")
    .eq("user_id", userId)
    .eq("id", logId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    sessionId: data.session_id,
    pair: data.pair,
    timeframe: data.timeframe,
    startingEquity: Number(data.starting_equity),
    finalEquity: Number(data.final_equity),
    pnl: Number(data.pnl),
    tradesCount: data.trades_count,
    wins: data.wins,
    losses: data.losses,
    ticks: data.ticks,
    tickIntervalMs: data.tick_interval_ms,
    riskPercent: Number(data.risk_percent),
    startedAt: data.started_at,
    endedAt: data.ended_at,
    state: normalizeState(data.state as LiveSandboxState),
    market: (data.market as SandboxMarket | null) ?? null,
  };
}

export async function stopSandboxSession(userId: string): Promise<void> {
  const existing = await loadSandboxSession(userId);
  if (existing) {
    try {
      await archiveSandboxSession(userId, existing);
    } catch (e) {
      console.error("[sandbox-archive]", e);
    }
  }

  const admin = createAdminClient();
  await admin
    .from("sandbox_sessions")
    .update({
      is_active: false,
      live_on: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

export async function patchSandboxSession(
  userId: string,
  patch: { liveOn?: boolean; tickIntervalMs?: number },
): Promise<PersistedSandboxSession | null> {
  const admin = createAdminClient();
  const updates: {
    updated_at: string;
    live_on?: boolean;
    tick_interval_ms?: number;
  } = {
    updated_at: new Date().toISOString(),
  };
  if (patch.liveOn != null) updates.live_on = patch.liveOn;
  if (patch.tickIntervalMs != null) {
    updates.tick_interval_ms = Math.min(
      300_000,
      Math.max(5_000, patch.tickIntervalMs),
    );
  }
  const { error } = await admin
    .from("sandbox_sessions")
    .update(updates)
    .eq("user_id", userId)
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return loadSandboxSession(userId);
}

/** Ejecuta un tick de mercado y persiste el resultado. */
export async function runPersistedSandboxTick(
  userId: string,
  overrides?: {
    state?: LiveSandboxState;
    riskPercent?: number;
    params?: LiveSandboxState["params"];
    locale?: Locale;
  },
): Promise<LiveTickResult & { tickIntervalMs: number; liveOn: boolean }> {
  const existing = await loadSandboxSession(userId);
  if (!existing && !overrides?.state) {
    throw new Error("No hay sesión paper activa");
  }

  let state = normalizeState(overrides?.state ?? existing!.state);
  if (overrides?.riskPercent != null) state.riskPercent = overrides.riskPercent;
  if (overrides?.params) state.params = overrides.params;

  const candles = await fetchOHLCV(state.pair, state.timeframe, 150);
  const htf = higherTimeframe(state.timeframe);
  const htfCandles =
    htf === state.timeframe ? undefined : await fetchOHLCV(state.pair, htf, 120);
  const ticker = await fetchTickerPrice(state.pair);
  const tick = liveSandboxTick(
    state,
    candles,
    ticker,
    htfCandles,
    overrides?.locale,
  );

  const tickIntervalMs = existing?.tickIntervalMs ?? 20_000;
  const liveOn = existing?.liveOn ?? true;

  await saveSandboxSession({
    userId,
    state: tick.state,
    market: tick.market,
    candles: tick.candles,
    tickIntervalMs,
    liveOn,
    isActive: true,
  });

  return { ...tick, tickIntervalMs, liveOn };
}

/** Cron: tickea sesiones overdue con auto-tick activo. */
export async function tickDueSandboxSessions(): Promise<
  { userId: string; ok: boolean; message: string }[]
> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("sandbox_sessions")
    .select("*")
    .eq("is_active", true)
    .eq("live_on", true);

  if (error) {
    console.error("[sandbox-sessions]", error.message);
    return [{ userId: "-", ok: false, message: error.message }];
  }

  const results: { userId: string; ok: boolean; message: string }[] = [];
  const now = Date.now();

  for (const row of data ?? []) {
    const interval = Number(row.tick_interval_ms) || 20_000;
    const last = new Date(row.last_tick_at).getTime();
    if (now - last < interval) {
      results.push({
        userId: row.user_id,
        ok: true,
        message: "skip — aún no toca",
      });
      continue;
    }

    try {
      const tick = await runPersistedSandboxTick(row.user_id);
      results.push({
        userId: row.user_id,
        ok: true,
        message: `tick #${tick.state.tickCount} · ${tick.state.lastAction}`,
      });
    } catch (e) {
      results.push({
        userId: row.user_id,
        ok: false,
        message: e instanceof Error ? e.message : "error",
      });
    }
  }

  return results;
}
