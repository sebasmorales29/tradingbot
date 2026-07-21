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

export async function stopSandboxSession(userId: string): Promise<void> {
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
