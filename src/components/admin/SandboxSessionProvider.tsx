"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { LiveSandboxState } from "@/lib/trading/live-sandbox";
import type { TrendPulseParams } from "@/lib/trading/strategy/trend-pulse";
import type { Pair } from "@/lib/trading/types";

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

type SandboxSessionContextValue = {
  ready: boolean;
  busy: boolean;
  state: LiveSandboxState | null;
  market: SandboxMarket | null;
  candles: SandboxCandle[];
  liveOn: boolean;
  tickMs: number;
  setTickMs: (ms: number) => void;
  setLiveOn: (on: boolean) => void;
  startSession: (input: {
    pair: Pair;
    equity: number;
    risk: number;
    timeframe: string;
    params?: TrendPulseParams;
  }) => Promise<{ ok: boolean; error?: string }>;
  tickOnce: (opts?: {
    risk?: number;
    params?: TrendPulseParams;
  }) => Promise<{ ok: boolean; error?: string }>;
  stopSession: () => Promise<void>;
};

const SandboxSessionContext =
  createContext<SandboxSessionContextValue | null>(null);

export function useSandboxSession() {
  const ctx = useContext(SandboxSessionContext);
  if (!ctx) {
    throw new Error("useSandboxSession debe usarse dentro de SandboxSessionProvider");
  }
  return ctx;
}

export function useSandboxSessionOptional() {
  return useContext(SandboxSessionContext);
}

export function SandboxSessionProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const [ready, setReady] = useState(!enabled);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<LiveSandboxState | null>(null);
  const [market, setMarket] = useState<SandboxMarket | null>(null);
  const [candles, setCandles] = useState<SandboxCandle[]>([]);
  const [liveOn, setLiveOnState] = useState(false);
  const [tickMs, setTickMsState] = useState(20_000);
  const stateRef = useRef<LiveSandboxState | null>(null);
  const tickingRef = useRef(false);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const applyPayload = useCallback(
    (data: {
      state?: LiveSandboxState;
      market?: SandboxMarket | null;
      candles?: SandboxCandle[];
      tickIntervalMs?: number;
      liveOn?: boolean;
    }) => {
      if (data.state) setState(data.state);
      if (data.market !== undefined) setMarket(data.market);
      if (data.candles) setCandles(data.candles);
      if (data.tickIntervalMs != null) setTickMsState(data.tickIntervalMs);
      if (data.liveOn != null) setLiveOnState(data.liveOn);
    },
    [],
  );

  // Restaurar sesión persistida al montar (sobrevive refresh)
  useEffect(() => {
    if (!enabled) {
      setReady(true);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/sandbox");
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok && data.active?.state) {
          applyPayload({
            state: data.active.state,
            market: data.active.market,
            candles: data.active.candles ?? [],
            tickIntervalMs: data.active.tickIntervalMs,
            liveOn: data.active.liveOn,
          });
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, applyPayload]);

  const tickOnce = useCallback(
    async (opts?: { risk?: number; params?: TrendPulseParams }) => {
      if (!stateRef.current || tickingRef.current) {
        return { ok: false, error: "Sin sesión o tick en curso" };
      }
      tickingRef.current = true;
      setBusy(true);
      try {
        const res = await fetch("/api/admin/sandbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "tick",
            state: stateRef.current,
            riskPercent: opts?.risk,
            params: opts?.params,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data.error ?? "Tick falló" };
        }
        applyPayload(data);
        return { ok: true };
      } finally {
        tickingRef.current = false;
        setBusy(false);
      }
    },
    [applyPayload],
  );

  // Auto-tick mientras haya sesión y liveOn — vive en el layout admin
  useEffect(() => {
    if (!enabled || !liveOn || !state?.sessionId) return;
    const id = window.setInterval(() => {
      void tickOnce();
    }, tickMs);
    return () => window.clearInterval(id);
  }, [enabled, liveOn, state?.sessionId, tickMs, tickOnce]);

  const startSession = useCallback(
    async (input: {
      pair: Pair;
      equity: number;
      risk: number;
      timeframe: string;
      params?: TrendPulseParams;
    }) => {
      setBusy(true);
      try {
        const res = await fetch("/api/admin/sandbox", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "start",
            pair: input.pair,
            startingEquity: input.equity,
            riskPercent: input.risk,
            timeframe: input.timeframe,
            tickIntervalMs: tickMs,
            params: input.params,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { ok: false, error: data.error ?? "No se pudo iniciar" };
        }
        applyPayload(data);
        return { ok: true };
      } finally {
        setBusy(false);
      }
    },
    [applyPayload, tickMs],
  );

  const stopSession = useCallback(async () => {
    setBusy(true);
    try {
      await fetch("/api/admin/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stop" }),
      });
      setState(null);
      setMarket(null);
      setCandles([]);
      setLiveOnState(false);
    } finally {
      setBusy(false);
    }
  }, []);

  const setLiveOn = useCallback(
    (on: boolean) => {
      setLiveOnState(on);
      if (!stateRef.current) return;
      void fetch("/api/admin/sandbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "patch", liveOn: on }),
      });
    },
    [],
  );

  const setTickMs = useCallback((ms: number) => {
    const clamped = Math.min(300_000, Math.max(5_000, ms));
    setTickMsState(clamped);
    if (!stateRef.current) return;
    void fetch("/api/admin/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "patch", tickIntervalMs: clamped }),
    });
  }, []);

  const value = useMemo<SandboxSessionContextValue>(
    () => ({
      ready,
      busy,
      state,
      market,
      candles,
      liveOn,
      tickMs,
      setTickMs,
      setLiveOn,
      startSession,
      tickOnce,
      stopSession,
    }),
    [
      ready,
      busy,
      state,
      market,
      candles,
      liveOn,
      tickMs,
      setTickMs,
      setLiveOn,
      startSession,
      tickOnce,
      stopSession,
    ],
  );

  return (
    <SandboxSessionContext.Provider value={value}>
      {children}
    </SandboxSessionContext.Provider>
  );
}
