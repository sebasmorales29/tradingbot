"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LineChart } from "@/components/admin/SandboxCharts";
import { AdminStat } from "@/components/admin/AdminStat";
import { SandboxSessionLogs } from "@/components/admin/SandboxSessionLogs";
import { useSandboxSession } from "@/components/admin/SandboxSessionProvider";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
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
  const t = useT();
  const { locale } = useLanguage();
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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [logsRefreshKey, setLogsRefreshKey] = useState(0);
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
  const priceLabels = useMemo(
    () =>
      candles.map((c) =>
        new Date(c.timestamp).toLocaleString(
          locale === "en" ? "en-US" : "es-CR",
          {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          },
        ),
      ),
    [candles, locale],
  );
  const equitySeries = useMemo(
    () => state?.equityPoints.map((p) => p.equity) ?? [],
    [state],
  );
  const equityLabels = useMemo(
    () =>
      state?.equityPoints.map((p) =>
        new Date(p.t).toLocaleString(locale === "en" ? "en-US" : "es-CR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
      ) ?? [],
    [state, locale],
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
    "h-11 w-full rounded-lg border border-snow/20 bg-[#2a3038] px-3 text-sm text-snow outline-none ring-pulse focus:ring-2 disabled:opacity-50";

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
        title: t.admin.startError,
        message: result.error ?? "Error",
      });
      return;
    }
    toast({
      tone: "success",
      title: t.admin.sessionStarted,
      message: t.admin.sessionStartedHint.replace(
        "{n}",
        formatTickLabel(tickMs),
      ),
    });
    setLogsRefreshKey((k) => k + 1);
  }

  async function onTick() {
    const result = await tickOnce({
      risk: canEdit ? Number(risk) : undefined,
      params: canEdit ? params : undefined,
    });
    if (!result.ok) {
      toast({
        tone: "error",
        title: t.admin.tickFailed,
        message: result.error ?? "Error",
      });
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-snow">
          {t.admin.sandboxTitle}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-snow/60">
          {t.admin.sandboxLead}
        </p>
        {!canEdit && (
          <p className="mt-2 text-xs text-amber-300/80">
            {t.admin.sandboxRoleHint}
          </p>
        )}
      </div>

      {!ready && (
        <p className="text-sm text-snow/45">{t.admin.sandboxRestoring}</p>
      )}

      <section className="rounded-xl border border-snow/10 bg-slate/30 p-5">
        <h2 className="font-display text-lg font-bold text-snow">
          {t.admin.sessionTitle}
        </h2>
        <div className="mt-4 grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="min-w-0 text-sm">
            <span className="mb-1.5 block min-h-[2.75rem] leading-snug text-snow/50">
              {t.admin.pair}
            </span>
            <Select
              value={pair}
              onChange={(v) => setPair(v as Pair)}
              aria-label={t.admin.pair}
              disabled={Boolean(state)}
              options={[
                { value: "BTC/USDT", label: "BTC/USDT" },
                { value: "ETH/USDT", label: "ETH/USDT" },
              ]}
            />
          </div>
          <div className="min-w-0 text-sm">
            <span className="mb-1.5 block min-h-[2.75rem] leading-snug text-snow/50">
              {t.admin.timeframe}
            </span>
            <Select
              value={timeframe}
              onChange={setTimeframe}
              aria-label={t.admin.timeframe}
              disabled={Boolean(state)}
              options={[
                { value: "15m", label: t.admin.tf15m },
                { value: "1h", label: t.admin.tf1h },
                { value: "4h", label: t.admin.tf4h },
              ]}
            />
          </div>
          <div className="min-w-0 text-sm">
            <span className="mb-1.5 block min-h-[2.75rem] leading-snug text-snow/50">
              {t.admin.tickInterval}
            </span>
            <Select
              value={String(tickMs)}
              onChange={(v) => setTickMs(Number(v))}
              aria-label={t.admin.tickInterval}
              options={[...TICK_OPTIONS]}
            />
          </div>
          <label className="min-w-0 block text-sm">
            <span className="mb-1.5 block min-h-[2.75rem] leading-snug text-snow/50">
              {t.admin.startingEquity}
            </span>
            <input
              type="number"
              className={inputClass}
              value={equity}
              disabled={Boolean(state)}
              onChange={(e) => setEquity(e.target.value)}
            />
          </label>
          <label className="min-w-0 block text-sm">
            <span className="mb-1.5 block min-h-[2.75rem] leading-snug text-snow/50">
              {t.admin.riskPct}
            </span>
            <input
              type="number"
              step="0.05"
              className={inputClass}
              value={risk}
              onChange={(e) => setRisk(e.target.value)}
            />
          </label>
          <div className="flex min-w-0 gap-2">
            {!state ? (
              <button
                type="button"
                disabled={busy || !ready}
                onClick={() => void onStart()}
                className="h-11 w-full rounded-lg bg-pulse px-4 text-sm font-semibold text-ink transition hover:bg-pulse/90 disabled:opacity-50"
              >
                {busy ? t.admin.connecting : t.admin.startLive}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setLiveOn(!liveOn)}
                  className={`h-11 flex-1 rounded-lg px-3 text-sm font-semibold transition disabled:opacity-50 ${
                    liveOn
                      ? "border border-amber-400/40 bg-amber-400/15 text-amber-200"
                      : "bg-pulse text-ink hover:bg-pulse/90"
                  }`}
                >
                  {liveOn ? t.admin.pause : t.admin.resume}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void onTick()}
                  className="h-11 rounded-lg border border-snow/20 px-3 text-sm text-snow/85 transition hover:bg-snow/5 disabled:opacity-50"
                >
                  {t.admin.tick}
                </button>
              </>
            )}
          </div>
        </div>

        {canEdit && (
          <div className="mt-4 border-t border-snow/10 pt-3">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              className="inline-flex items-center gap-1.5 text-sm text-snow/55 transition hover:text-snow"
              aria-expanded={advancedOpen}
            >
              <svg
                viewBox="0 0 16 16"
                className={`h-3.5 w-3.5 transition ${
                  advancedOpen ? "rotate-180" : ""
                }`}
                fill="none"
                aria-hidden
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {t.admin.advancedOptions}
            </button>
            {advancedOpen && (
              <div className="mt-3 grid items-end gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
                  <label key={key} className="min-w-0 block text-xs">
                    <span className="mb-1.5 block text-snow/45">{label}</span>
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
                ? t.admin.sessionActive.replace(
                    "{n}",
                    formatTickLabel(tickMs),
                  )
                : t.admin.sessionPaused}
            </span>
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  await stopSession();
                  setLogsRefreshKey((k) => k + 1);
                })();
              }}
              className="rounded-md border border-red-400/30 px-2.5 py-1 text-red-300 transition hover:bg-red-500/10"
            >
              {t.admin.closeSession}
            </button>
            <span>
              {t.admin.sessionMeta
                .replace("{id}", state.sessionId.slice(-8))
                .replace("{n}", String(state.tickCount))}
            </span>
          </div>
        )}
      </section>

      {state && market && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStat
              label={t.admin.equityMark}
              value={`$${markedEquity.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}`}
              accent
            />
            <AdminStat
              label={t.admin.sessionPnl}
              value={`${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`}
            />
            <AdminStat
              label={t.admin.trades}
              value={`${closed}${state.position ? t.admin.oneOpen : ""} · WR ${
                winRate != null ? `${winRate}%` : "—"
              }`}
            />
            <AdminStat
              label={t.admin.marketPrice}
              value={`$${market.price.toLocaleString("en-US", {
                maximumFractionDigits: 2,
              })}`}
            />
          </div>

          <div className="rounded-xl border border-pulse/25 bg-pulse/5 px-4 py-3 text-sm text-snow/80">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="font-semibold text-pulse">{t.admin.botDecision}</p>
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
              <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <h2 className="font-display text-lg font-bold text-snow">
                    {t.admin.checklistTitle}
                  </h2>
                  <p className="mt-0.5 text-xs text-snow/40">
                    {t.admin.checklistReady
                      .replace(
                        "{ready}",
                        String(state.lastChecks.filter((c) => c.pass).length),
                      )
                      .replace("{total}", String(state.lastChecks.length))}
                  </p>
                </div>
              </div>
              <ul className="divide-y divide-snow/[0.06] border-y border-snow/[0.08]">
                {state.lastChecks.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-start gap-3 py-2.5 sm:items-center"
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full sm:mt-0 ${
                        c.pass
                          ? "bg-emerald-500/15 text-emerald-400"
                          : "bg-snow/[0.06] text-snow/35"
                      }`}
                      aria-label={c.pass ? t.admin.meets : t.admin.fails}
                    >
                      {c.pass ? (
                        <svg
                          viewBox="0 0 16 16"
                          className="h-3 w-3"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M3.5 8.2 6.4 11l6.1-7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : (
                        <svg
                          viewBox="0 0 16 16"
                          className="h-2.5 w-2.5"
                          fill="none"
                          aria-hidden
                        >
                          <path
                            d="M4 4l8 8M12 4l-8 8"
                            stroke="currentColor"
                            strokeWidth="1.75"
                            strokeLinecap="round"
                          />
                        </svg>
                      )}
                    </span>
                    <div className="min-w-0 flex-1 sm:flex sm:items-baseline sm:justify-between sm:gap-6">
                      <span
                        className={`text-sm font-medium ${
                          c.pass ? "text-snow/90" : "text-snow/55"
                        }`}
                      >
                        {c.label}
                        {c.tier === "soft" && (
                          <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-snow/30">
                            {t.admin.quality}
                          </span>
                        )}
                      </span>
                      <p
                        className={`mt-0.5 text-xs leading-relaxed sm:mt-0 sm:max-w-[58%] sm:text-right ${
                          c.pass ? "text-snow/45" : "text-snow/35"
                        }`}
                      >
                        {c.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed text-snow/35">
                {t.admin.checklistFoot}
              </p>
            </section>
          )}

          <section>
            <h2 className="mb-3 font-display text-lg font-bold text-snow">
              {t.admin.priceChart}
            </h2>
            <LineChart
              series={priceSeries}
              labels={priceLabels}
              markers={markers}
              yFormat={(n) =>
                `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
              }
              valueLabel={t.admin.price}
              height={260}
            />
            <p className="mt-2 text-xs text-snow/40">
              {t.admin.priceChartHint.replace("{tf}", timeframe)}
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-display text-lg font-bold text-snow">
              {t.admin.equityChart}
            </h2>
            <LineChart
              series={equitySeries}
              labels={equityLabels}
              color="#34d399"
              yFormat={(n) =>
                `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`
              }
              valueLabel={t.admin.equityPaper}
              height={180}
            />
          </section>

          <div className="grid gap-8 lg:grid-cols-2">
            <section>
              <h2 className="font-display text-lg font-bold text-snow">
                {t.admin.decisionsLog}
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
                {t.admin.paperTrades}
              </h2>
              <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto rounded-xl border border-snow/10 p-3 text-sm">
                {state.position && (
                  <li className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2">
                    <p className="text-emerald-200">
                      {t.admin.openPosition
                        .replace(
                          "{entry}",
                          state.position.entry.toFixed(2),
                        )
                        .replace(
                          "{qty}",
                          state.position.qty.toFixed(6),
                        )}
                    </p>
                    <p className="mt-1 text-xs text-snow/40">
                      {state.position.entryReason}
                    </p>
                  </li>
                )}
                {!state.closedTrades.length && !state.position ? (
                  <li className="text-snow/45">{t.admin.noTradesYet}</li>
                ) : (
                  state.closedTrades.map((tr) => (
                    <li
                      key={tr.id}
                      className="rounded-lg border border-snow/10 px-3 py-2"
                    >
                      <p className="text-snow">
                        {tr.entry.toFixed(2)} → {tr.exit.toFixed(2)} · pnl{" "}
                        {tr.pnl >= 0 ? "+" : ""}
                        {tr.pnl.toFixed(2)}
                      </p>
                      <p className="mt-1 text-xs text-snow/40">
                        {tr.entryReason} → {tr.exitReason}
                      </p>
                    </li>
                  ))
                )}
              </ul>
              {(wins > 0 || losses > 0) && (
                <p className="mt-2 text-xs text-snow/40">
                  {t.admin.closedWinsLosses
                    .replace("{wins}", String(wins))
                    .replace("{losses}", String(losses))}
                </p>
              )}
            </section>
          </div>
        </>
      )}

      <SandboxSessionLogs
        activeState={state}
        activeMarket={market}
        activeTickMs={tickMs}
        refreshKey={logsRefreshKey}
      />
    </div>
  );
}

function EventRow({ event }: { event: LiveEvent }) {
  const { locale } = useLanguage();
  return (
    <li className="rounded-lg border border-snow/10 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <KindBadge kind={event.kind} />
        <span className="text-xs text-snow/40">
          {new Date(event.at).toLocaleTimeString(
            locale === "en" ? "en-US" : "es-CR",
          )}
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
