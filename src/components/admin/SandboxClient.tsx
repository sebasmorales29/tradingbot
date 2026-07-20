"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LineChart } from "@/components/admin/SandboxCharts";
import { AdminStat } from "@/components/admin/AdminStat";
import { useSandboxSession } from "@/components/admin/SandboxSessionProvider";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import type { TrendPulseParams } from "@/lib/trading/strategy/trend-pulse";
import type { LiveEvent } from "@/lib/trading/live-sandbox";
import type { Pair } from "@/lib/trading/types";

type Defaults = {
  pair: Pair;
  startingEquity: number;
  riskPercent: number;
  timeframe: string;
  params: TrendPulseParams;
};

const TICK_OPTIONS = [
  { value: "5000", label: "5s" },
  { value: "10000", label: "10s" },
  { value: "15000", label: "15s" },
  { value: "20000", label: "20s" },
  { value: "30000", label: "30s" },
  { value: "60000", label: "60s" },
] as const;

function formatTickLabel(ms: number): string {
  return `${Math.round(ms / 1000)}s`;
}

export function SandboxClient({
  initialDefaults,
  canEdit,
}: {
  initialDefaults: Defaults;
  canEdit: boolean;
}) {
  const { toast } = useToast();
  const {
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
  } = useSandboxSession();

  const [pair, setPair] = useState<Pair>(initialDefaults.pair);
  const [equity, setEquity] = useState(String(initialDefaults.startingEquity));
  const [risk, setRisk] = useState(String(initialDefaults.riskPercent));
  const [timeframe, setTimeframe] = useState(initialDefaults.timeframe);
  const [params, setParams] = useState(initialDefaults.params);
  const logRef = useRef<HTMLUListElement>(null);
  const restoredRef = useRef(false);

  // Hidratar formulario desde sesión persistida
  useEffect(() => {
    if (!ready || !state || restoredRef.current) return;
    restoredRef.current = true;
    setPair(state.pair);
    setEquity(String(state.startingEquity));
    setRisk(String(state.riskPercent));
    setTimeframe(state.timeframe);
    setParams(state.params);
  }, [ready, state]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [state?.events.length]);

  const markedEquity = useMemo(() => {
    if (!state || !market) return Number(equity);
    if (!state.position) return state.equity;
    return (
      state.equity +
      (market.price - state.position.entry) * state.position.qty
    );
  }, [state, market, equity]);

  const pnl = state ? markedEquity - state.startingEquity : 0;
  const wins = state?.closedTrades.filter((t) => t.pnl > 0).length ?? 0;
  const losses = state?.closedTrades.filter((t) => t.pnl <= 0).length ?? 0;
  const closed = state?.closedTrades.length ?? 0;
  const winRate = closed ? Math.round((wins / closed) * 100) : null;

  const priceSeries = useMemo(() => candles.map((c) => c.close), [candles]);
  const equitySeries = useMemo(
    () => state?.equityPoints.map((p) => p.equity) ?? [],
    [state],
  );

  const markers = useMemo(() => {
    if (!state || !candles.length) return [];
    const out: { index: number; type: "entry" | "exit"; price: number }[] = [];
    const nearest = (iso: string) => {
      const t = new Date(iso).getTime();
      let best = 0;
      let dist = Infinity;
      candles.forEach((c, i) => {
        const d = Math.abs(c.timestamp - t);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      return best;
    };
    for (const t of state.closedTrades) {
      out.push({ index: nearest(t.openedAt), type: "entry", price: t.entry });
      out.push({ index: nearest(t.closedAt), type: "exit", price: t.exit });
    }
    if (state.position) {
      out.push({
        index: nearest(state.position.openedAt),
        type: "entry",
        price: state.position.entry,
      });
    }
    return out;
  }, [state, candles]);

  const inputClass =
    "mt-1 w-full rounded-md border border-snow/15 bg-ink px-3 py-2 text-sm text-snow outline-none ring-pulse focus:ring-2 disabled:opacity-50";

  async function onStart() {
    const result = await startSession({
      pair,
      equity: Number(equity),
      risk: Number(risk),
      timeframe,
      params: canEdit ? params : undefined,
    });
    if (!result.ok) {
      toast({
        tone: "error",
        title: "No se pudo iniciar",
        message: result.error ?? "Error",
      });
      return;
    }
    toast({
      tone: "success",
      title: "Sesión paper activa",
      message: `Persiste al refrescar o cambiar de vista. Tick cada ${formatTickLabel(tickMs)}.`,
    });
  }

  async function onTick() {
    const result = await tickOnce({
      risk: canEdit ? Number(risk) : undefined,
      params: canEdit ? params : undefined,
    });
    if (!result.ok) {
      toast({
        tone: "error",
        title: "Tick falló",
        message: result.error ?? "Error",
      });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-snow">Sandbox</h1>
        <p className="mt-2 max-w-2xl text-sm text-snow/60">
          Paper trading en vivo: el bot lee el mercado real, aplica una checklist
          de calidad (tendencia HTF, RSI, volumen, no perseguir, confirmación) y
          solo opera cuando el setup es limpio. Dinero ficticio — sin tocar
          cuentas reales. La sesión queda guardada: puedes refrescar o ir a otra
          vista y sigue operando.
        </p>
        {!canEdit && (
          <p className="mt-2 text-xs text-amber-300/80">
            Tu rol puede operar el sandbox. Los parámetros de estrategia están
            fijos a la configuración global.
          </p>
        )}
      </div>

      {!ready && (
        <p className="text-sm text-snow/45">Restaurando sesión paper…</p>
      )}

      <section className="rounded-xl border border-snow/10 bg-slate/30 p-5">
        <h2 className="font-display text-lg font-bold text-snow">
          Sesión paper
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="block text-sm">
            <span className="text-snow/50">Par</span>
            <Select
              className="mt-1"
              value={pair}
              onChange={(v) => setPair(v as Pair)}
              aria-label="Par"
              disabled={Boolean(state)}
              options={[
                { value: "BTC/USDT", label: "BTC/USDT" },
                { value: "ETH/USDT", label: "ETH/USDT" },
              ]}
            />
          </div>
          <div className="block text-sm">
            <span className="text-snow/50">Timeframe</span>
            <Select
              className="mt-1"
              value={timeframe}
              onChange={setTimeframe}
              aria-label="Timeframe"
              disabled={Boolean(state)}
              options={[
                { value: "15m", label: "15m (más señales)" },
                { value: "1h", label: "1h" },
                { value: "4h", label: "4h (como producción)" },
              ]}
            />
          </div>
          <div className="block text-sm">
            <span className="text-snow/50">Intervalo de tick</span>
            <Select
              className="mt-1"
              value={String(tickMs)}
              onChange={(v) => setTickMs(Number(v))}
              aria-label="Intervalo de tick"
              options={[...TICK_OPTIONS]}
            />
          </div>
          <label className="block text-sm">
            <span className="text-snow/50">Equity inicial (paper)</span>
            <input
              type="number"
              className={inputClass}
              value={equity}
              disabled={Boolean(state)}
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
          <div className="flex items-end gap-2">
            {!state ? (
              <button
                type="button"
                disabled={busy || !ready}
                onClick={() => void onStart()}
                className="h-[42px] w-full rounded-lg bg-pulse px-4 text-sm font-semibold text-ink transition hover:bg-pulse/90 disabled:opacity-50"
              >
                {busy ? "Conectando…" : "Iniciar bot en vivo"}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setLiveOn(!liveOn)}
                  className={`h-[42px] flex-1 rounded-lg px-3 text-sm font-semibold transition disabled:opacity-50 ${
                    liveOn
                      ? "border border-amber-400/40 bg-amber-400/15 text-amber-200"
                      : "bg-pulse text-ink hover:bg-pulse/90"
                  }`}
                >
                  {liveOn ? "Pausar" : "Reanudar"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onTick()}
                  className="h-[42px] rounded-lg border border-snow/20 px-3 text-sm text-snow/85 transition hover:bg-snow/5 disabled:opacity-50"
                >
                  Tick
                </button>
              </>
            )}
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

        {state && (
          <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-snow/10 pt-4 text-xs text-snow/50">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold ${
                liveOn
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-snow/10 text-snow/55"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  liveOn ? "animate-pulse bg-emerald-400" : "bg-snow/40"
                }`}
              />
              {liveOn
                ? `Sesión activa · tick cada ${formatTickLabel(tickMs)}`
                : "Sesión en pausa (sigue guardada)"}
            </span>
            <button
              type="button"
              onClick={() => void stopSession()}
              className="rounded-md border border-red-400/30 px-2.5 py-1 text-red-300 transition hover:bg-red-500/10"
            >
              Cerrar sesión
            </button>
            <span>
              Sesión {state.sessionId.slice(-8)} · ticks {state.tickCount}
            </span>
          </div>
        )}
      </section>

      {state && market && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStat
              label="Equity paper (mark)"
              value={`$${markedEquity.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}`}
              accent
            />
            <AdminStat
              label="PnL sesión"
              value={`${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`}
            />
            <AdminStat
              label="Trades"
              value={`${closed}${state.position ? " +1 abierta" : ""} · WR ${
                winRate != null ? `${winRate}%` : "—"
              }`}
            />
            <AdminStat
              label="Precio mercado"
              value={`$${market.price.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}`}
            />
          </div>

          <div className="rounded-xl border border-pulse/25 bg-pulse/5 px-4 py-3 text-sm text-snow/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-pulse">Decisión del bot</p>
              <span className="rounded-full bg-ink/40 px-2.5 py-0.5 text-xs font-bold text-pulse">
                Score {market.score ?? state.lastScore}/100 ·{" "}
                {(market.verdict ?? "hold").toUpperCase()}
              </span>
            </div>
            <p className="mt-1">{state.lastAction}</p>
            <p className="mt-2 text-xs text-snow/45">
              {market.atrPct != null
                ? `ATR% ${market.atrPct.toFixed(2)} · `
                : ""}
              vela {new Date(market.candleTime).toLocaleString("es-CR")}
              {state.position
                ? ` · LONG @ ${state.position.entry.toFixed(2)} · SL ${state.position.stopLoss.toFixed(2)}`
                : " · flat"}
            </p>
          </div>

          {state.lastChecks.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold text-snow">
                Checklist experta (este tick)
              </h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {state.lastChecks.map((c) => (
                  <li
                    key={c.id}
                    className={`rounded-lg border px-3 py-2 text-sm ${
                      c.pass
                        ? "border-emerald-500/25 bg-emerald-500/5"
                        : "border-snow/10 bg-slate/20"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-bold ${
                          c.pass ? "text-emerald-300" : "text-snow/40"
                        }`}
                      >
                        {c.pass ? "OK" : "NO"}
                      </span>
                      <span className="font-medium text-snow/90">{c.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-snow/50">{c.detail}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-snow/40">
                Solo opera si todos los checks pasan. Así evita chase, volumen
                flojo y pelear la tendencia superior — como un trader
                disciplinado, no como un indicador suelto.
              </p>
            </section>
          )}

          <section>
            <h2 className="mb-3 font-display text-lg font-bold text-snow">
              Precio real · entradas (verde) / salidas (rojo)
            </h2>
            <LineChart
              series={priceSeries}
              markers={markers}
              yFormat={(n) => n.toFixed(0)}
              height={260}
            />
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-bold text-snow">
              Equity de esta sesión
            </h2>
            <LineChart
              series={equitySeries}
              color="#34d399"
              yFormat={(n) => `$${n.toFixed(0)}`}
              height={180}
            />
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section>
              <h2 className="font-display text-lg font-bold text-snow">
                Log de decisiones
              </h2>
              <ul
                ref={logRef}
                className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-snow/10 p-3 text-sm"
              >
                {state.events.map((d) => (
                  <EventRow key={d.id} event={d} />
                ))}
              </ul>
            </section>

            <section>
              <h2 className="font-display text-lg font-bold text-snow">
                Trades paper
              </h2>
              <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-snow/10 p-3 text-sm">
                {state.position && (
                  <li className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                    <p className="text-emerald-200">
                      Abierta · entry {state.position.entry.toFixed(2)} · qty{" "}
                      {state.position.qty.toFixed(6)}
                    </p>
                    <p className="mt-1 text-xs text-snow/40">
                      {state.position.entryReason}
                    </p>
                  </li>
                )}
                {!state.closedTrades.length && !state.position ? (
                  <li className="text-snow/45">
                    Aún sin trades. El bot solo entra con checklist completa.
                  </li>
                ) : (
                  state.closedTrades.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-lg border border-snow/10 px-3 py-2"
                    >
                      <p className="text-snow">
                        {t.entry.toFixed(2)} → {t.exit.toFixed(2)} · pnl{" "}
                        {t.pnl >= 0 ? "+" : ""}
                        {t.pnl.toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs text-snow/40">
                        {t.entryReason} → {t.exitReason}
                      </p>
                    </li>
                  ))
                )}
              </ul>
              {(wins > 0 || losses > 0) && (
                <p className="mt-2 text-xs text-snow/40">
                  Cerrados: {wins} ganadores · {losses} perdedores
                </p>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

function EventRow({ event }: { event: LiveEvent }) {
  return (
    <li className="rounded-lg border border-snow/10 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <KindBadge kind={event.kind} />
        <span className="text-xs text-snow/40">
          {new Date(event.at).toLocaleTimeString("es-CR")}
        </span>
        {event.price > 0 && (
          <span className="text-xs text-snow/35">
            @ {event.price.toFixed(2)}
          </span>
        )}
      </div>
      <p className="mt-1 text-snow/85">{event.message}</p>
    </li>
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
    tick: "bg-snow/10 text-snow/50",
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
