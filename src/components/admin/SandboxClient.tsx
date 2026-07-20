"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LineChart } from "@/components/admin/SandboxCharts";
import { AdminStat } from "@/components/admin/AdminStat";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import type { TrendPulseParams } from "@/lib/trading/strategy/trend-pulse";
import type { Pair } from "@/lib/trading/types";

type SandboxPayload = {
  pair: Pair;
  candles: { timestamp: number; close: number; high: number; low: number }[];
  emaFast: (number | null)[];
  emaSlow: (number | null)[];
  equityCurve: number[];
  decisions: {
    index: number;
    time: number;
    kind: string;
    message: string;
    price: number;
    equity: number;
  }[];
  trades: {
    id: string;
    entry: number;
    exit: number | null;
    qty: number;
    pnl: number | null;
    entryIndex: number;
    exitIndex: number | null;
    entryReason: string;
    exitReason: string | null;
  }[];
  markers: { index: number; type: "entry" | "exit"; price: number }[];
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

type Defaults = {
  pair: Pair;
  startingEquity: number;
  riskPercent: number;
  timeframe: string;
  limit: number;
  params: TrendPulseParams;
};

export function SandboxClient({
  initialDefaults,
  canEdit,
}: {
  initialDefaults: Defaults;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const [pair, setPair] = useState<Pair>(initialDefaults.pair);
  const [equity, setEquity] = useState(String(initialDefaults.startingEquity));
  const [risk, setRisk] = useState(String(initialDefaults.riskPercent));
  const [params, setParams] = useState(initialDefaults.params);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SandboxPayload | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speedMs, setSpeedMs] = useState(120);
  const logRef = useRef<HTMLUListElement>(null);

  const run = useCallback(async () => {
    setBusy(true);
    setPlaying(false);
    const res = await fetch("/api/admin/sandbox", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pair,
        startingEquity: Number(equity),
        riskPercent: Number(risk),
        timeframe: initialDefaults.timeframe,
        limit: initialDefaults.limit,
        params: canEdit ? params : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast({
        tone: "error",
        title: "Sandbox falló",
        message: data.error ?? "Error",
      });
      return;
    }
    setResult(data.result as SandboxPayload);
    setPlayhead(0);
    toast({
      tone: "success",
      title: "Simulación lista",
      message: "Pulsa Play para ver al bot operar vela a vela.",
    });
  }, [pair, equity, risk, params, canEdit, initialDefaults, toast]);

  useEffect(() => {
    if (!playing || !result) return;
    const id = window.setInterval(() => {
      setPlayhead((p) => {
        if (p >= result.candles.length - 1) {
          setPlaying(false);
          return p;
        }
        return p + 1;
      });
    }, speedMs);
    return () => window.clearInterval(id);
  }, [playing, result, speedMs]);

  const visibleDecisions = useMemo(() => {
    if (!result) return [];
    return result.decisions.filter((d) => d.index <= playhead).slice(-40);
  }, [result, playhead]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [visibleDecisions.length, playhead]);

  const visibleMarkers = useMemo(() => {
    if (!result) return [];
    return result.markers.filter((m) => m.index <= playhead);
  }, [result, playhead]);

  const equitySlice = useMemo(() => {
    if (!result) return [];
    return result.equityCurve.map((v, i) => (i <= playhead ? v : null));
  }, [result, playhead]);

  const priceSlice = useMemo(() => {
    if (!result) return [];
    return result.candles.map((c, i) => (i <= playhead ? c.close : null));
  }, [result, playhead]);

  const emaFastSlice = useMemo(() => {
    if (!result) return [];
    return result.emaFast.map((v, i) => (i <= playhead ? v : null));
  }, [result, playhead]);

  const emaSlowSlice = useMemo(() => {
    if (!result) return [];
    return result.emaSlow.map((v, i) => (i <= playhead ? v : null));
  }, [result, playhead]);

  const liveEquity =
    result && playhead >= 0
      ? (result.equityCurve[playhead] ?? result.startingEquity)
      : Number(equity);

  const inputClass =
    "mt-1 w-full rounded-md border border-snow/15 bg-ink px-3 py-2 text-sm text-snow outline-none ring-pulse focus:ring-2 disabled:opacity-50";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-snow">Sandbox</h1>
        <p className="mt-2 max-w-2xl text-sm text-snow/60">
          Ambiente de prueba con dinero ficticio y velas reales de Binance
          Vision. Ves cómo Trend Pulse decide entradas/salidas, el equity y cada
          motivo — sin tocar cuentas de usuarios.
        </p>
        {!canEdit && (
          <p className="mt-2 text-xs text-amber-300/80">
            Tu rol puede simular y analizar. Los parámetros de estrategia están
            fijos a la configuración global.
          </p>
        )}
      </div>

      <section className="rounded-xl border border-snow/10 bg-slate/30 p-5">
        <h2 className="font-display text-lg font-bold text-snow">
          Parámetros de prueba
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-sm">
            <span className="text-snow/50">Par</span>
            <Select
              className="mt-1"
              value={pair}
              onChange={(v) => setPair(v as Pair)}
              aria-label="Par"
              options={[
                { value: "BTC/USDT", label: "BTC/USDT" },
                { value: "ETH/USDT", label: "ETH/USDT" },
              ]}
            />
          </label>
          <label className="block text-sm">
            <span className="text-snow/50">Equity inicial (paper)</span>
            <input
              type="number"
              className={inputClass}
              value={equity}
              onChange={(e) => setEquity(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="text-snow/50">Riesgo %</span>
            <input
              type="number"
              step="0.05"
              className={inputClass}
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
            />
          </label>
          <div className="flex items-end">
            <button
              type="button"
              disabled={busy}
              onClick={() => void run()}
              className="h-[42px] w-full rounded-lg bg-pulse px-4 text-sm font-semibold text-ink transition hover:bg-pulse/90 disabled:opacity-50"
            >
              {busy ? "Simulando…" : "Correr simulación"}
            </button>
          </div>
        </div>

        {canEdit && (
          <div className="mt-4 grid gap-3 border-t border-snow/10 pt-4 sm:grid-cols-3 lg:grid-cols-6">
            {(
              [
                ["fast", "EMA fast"],
                ["slow", "EMA slow"],
                ["atrPeriod", "ATR period"],
                ["stopAtr", "Stop ATR"],
                ["tpAtr", "TP ATR"],
                ["minAtrPct", "Min ATR%"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-xs">
                <span className="text-snow/45">{label}</span>
                <input
                  type="number"
                  step="any"
                  className={inputClass}
                  value={params[key]}
                  onChange={(e) =>
                    setParams((p) => ({
                      ...p,
                      [key]: Number(e.target.value),
                    }))
                  }
                />
              </label>
            ))}
          </div>
        )}
      </section>

      {result && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStat
              label="Equity vivo"
              value={`$${liveEquity.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}`}
              accent
            />
            <AdminStat
              label="PnL simulado"
              value={`${result.stats.pnl >= 0 ? "+" : ""}${result.stats.pnl.toFixed(2)}`}
            />
            <AdminStat
              label="Trades"
              value={`${result.stats.trades} · WR ${
                result.stats.winRate != null
                  ? `${result.stats.winRate}%`
                  : "—"
              }`}
            />
            <AdminStat
              label="Max drawdown"
              value={`${result.stats.maxDrawdownPct}%`}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded-lg border border-pulse/50 bg-pulse/15 px-4 py-2 text-sm font-semibold text-pulse transition hover:bg-pulse/25"
            >
              {playing ? "Pausar" : "Play"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setPlayhead((p) => Math.min(p + 1, result.candles.length - 1));
              }}
              className="rounded-lg border border-snow/20 px-4 py-2 text-sm text-snow/80 transition hover:bg-snow/5"
            >
              Paso +1
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setPlayhead(0);
              }}
              className="rounded-lg border border-snow/20 px-4 py-2 text-sm text-snow/80 transition hover:bg-snow/5"
            >
              Reiniciar
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setPlayhead(result.candles.length - 1);
              }}
              className="rounded-lg border border-snow/20 px-4 py-2 text-sm text-snow/80 transition hover:bg-snow/5"
            >
              Ir al final
            </button>
            <label className="flex items-center gap-2 text-xs text-snow/50">
              Velocidad
              <Select
                className="min-w-[7.5rem]"
                value={String(speedMs)}
                onChange={(v) => setSpeedMs(Number(v))}
                aria-label="Velocidad"
                options={[
                  { value: "250", label: "Lenta" },
                  { value: "120", label: "Normal" },
                  { value: "50", label: "Rápida" },
                ]}
              />
            </label>
            <span className="text-xs text-snow/40">
              Vela {playhead + 1}/{result.candles.length} ·{" "}
              {new Date(result.candles[playhead]?.timestamp ?? 0).toLocaleString(
                "es-CR",
              )}
            </span>
          </div>

          <section>
            <h2 className="mb-3 font-display text-lg font-bold text-snow">
              Precio + EMAs · entradas (verde) / salidas (rojo)
            </h2>
            <LineChart
              series={priceSlice}
              secondary={[
                { values: emaFastSlice, color: "#67e8f9" },
                { values: emaSlowSlice, color: "#fbbf24" },
              ]}
              markers={visibleMarkers}
              playhead={playhead}
              yFormat={(n) => n.toFixed(0)}
              height={260}
            />
            <p className="mt-2 text-xs text-snow/40">
              Cyan = EMA fast · Ámbar = EMA slow · Línea blanca = playhead
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-bold text-snow">
              Equity (paper)
            </h2>
            <LineChart
              series={equitySlice}
              playhead={playhead}
              color="#34d399"
              yFormat={(n) => `$${n.toFixed(0)}`}
              height={180}
            />
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section>
              <h2 className="font-display text-lg font-bold text-snow">
                Decisiones del bot
              </h2>
              <ul
                ref={logRef}
                className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-snow/10 p-3 text-sm"
              >
                {!visibleDecisions.length ? (
                  <li className="text-snow/45">
                    Dale a Play para ver las decisiones en tiempo real…
                  </li>
                ) : (
                  visibleDecisions.map((d, i) => (
                    <li
                      key={`${d.index}-${i}`}
                      className="rounded-lg border border-snow/10 px-3 py-2"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <KindBadge kind={d.kind} />
                        <span className="text-xs text-snow/40">
                          #{d.index + 1}
                        </span>
                      </div>
                      <p className="mt-1 text-snow/85">{d.message}</p>
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-snow">
                Trades de la simulación
              </h2>
              <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-snow/10 p-3 text-sm">
                {!result.trades.length ? (
                  <li className="text-snow/45">
                    Sin trades en este tramo (normal si no hubo cruce EMA).
                  </li>
                ) : (
                  result.trades
                    .filter((t) => t.entryIndex <= playhead)
                    .map((t) => (
                      <li
                        key={t.id}
                        className="rounded-lg border border-snow/10 px-3 py-2"
                      >
                        <p className="text-snow">
                          Entry {t.entry.toFixed(2)}
                          {t.exit != null ? ` → ${t.exit.toFixed(2)}` : " (abierto)"}
                          {t.pnl != null
                            ? ` · pnl ${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}`
                            : ""}
                        </p>
                        <p className="mt-1 text-xs text-snow/40">
                          {t.entryReason}
                          {t.exitReason ? ` → ${t.exitReason}` : ""}
                        </p>
                      </li>
                    ))
                )}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function KindBadge({ kind }: { kind: string }) {
  const map: Record<string, string> = {
    long: "bg-emerald-500/20 text-emerald-300",
    flat: "bg-red-500/20 text-red-300",
    stop: "bg-red-500/20 text-red-300",
    tp: "bg-pulse/20 text-pulse",
    skip: "bg-amber-500/20 text-amber-300",
    hold: "bg-snow/10 text-snow/50",
    info: "bg-snow/10 text-snow/60",
  };
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
        map[kind] ?? map.info
      }`}
    >
      {kind}
    </span>
  );
}
