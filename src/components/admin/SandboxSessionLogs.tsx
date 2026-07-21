"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  downloadSandboxPdf,
  pdfInputFromLiveState,
  type SandboxPdfLabels,
} from "@/lib/trading/sandbox-pdf";
import type { LiveSandboxState } from "@/lib/trading/live-sandbox";
import type { SandboxMarket } from "@/lib/trading/sandbox-session";

type LogSummary = {
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

function usePdfLabels(): SandboxPdfLabels {
  const t = useT();
  return {
    reportTitle: t.admin.sandboxPdfTitle,
    overview: t.admin.sandboxPdfOverview,
    sessionId: t.admin.sessionIdLabel,
    pair: t.admin.pair,
    timeframe: t.admin.timeframe,
    risk: t.admin.riskPct,
    tickInterval: t.admin.tickInterval,
    started: t.admin.startedAt,
    ended: t.admin.endedAt,
    ticks: t.admin.ticksLabel,
    startingEquity: t.admin.startingEquity,
    finalEquity: t.admin.finalEquity,
    pnl: t.admin.sessionPnl,
    trades: t.admin.paperTrades,
    wins: t.admin.winsLabel,
    losses: t.admin.lossesLabel,
    winRate: t.admin.winRate,
    openPosition: t.admin.openPositionShort,
    tradesSection: t.admin.paperTrades,
    eventsSection: t.admin.decisionsLog,
    noTrades: t.admin.noTradesYet,
    noEvents: t.admin.noEvents,
    disclaimer: t.admin.sandboxPdfDisclaimer,
    generatedAt: t.admin.generatedAt,
    paperBadge: t.admin.paperBadge,
    entry: t.admin.entryLabel,
    exit: t.admin.exitLabel,
    qty: t.admin.qtyLabel,
    reason: t.admin.reasonLabel,
  };
}

export function SandboxSessionLogs({
  activeState,
  activeMarket,
  activeTickMs,
  refreshKey,
  embedded = true,
}: {
  activeState: LiveSandboxState | null;
  activeMarket: SandboxMarket | null;
  activeTickMs: number;
  refreshKey: number;
  embedded?: boolean;
}) {
  const t = useT();
  const { locale } = useLanguage();
  const { toast } = useToast();
  const labels = usePdfLabels();
  const [logs, setLogs] = useState<LogSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/sandbox?view=logs");
      const data = (await res.json()) as { logs?: LogSummary[]; error?: string };
      if (!res.ok) throw new Error(data.error ?? "error");
      setLogs(data.logs ?? []);
    } catch (e) {
      toast({
        tone: "error",
        title: t.admin.logsLoadError,
        message: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [t.admin.logsLoadError, toast]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  const exportLive = () => {
    if (!activeState) return;
    try {
      downloadSandboxPdf(
        pdfInputFromLiveState({
          state: activeState,
          market: activeMarket,
          tickIntervalMs: activeTickMs,
          locale,
          labels,
          endedAt: null,
        }),
      );
    } catch {
      toast({
        tone: "error",
        title: t.admin.pdfExportError,
      });
    }
  };

  const exportLog = async (id: string) => {
    setExportingId(id);
    try {
      const res = await fetch(
        `/api/admin/sandbox?logId=${encodeURIComponent(id)}`,
      );
      const data = (await res.json()) as {
        log?: {
          sessionId: string;
          pair: string;
          timeframe: string;
          riskPercent: number;
          tickIntervalMs: number;
          startedAt: string;
          endedAt: string;
          startingEquity: number;
          finalEquity: number;
          pnl: number;
          wins: number;
          losses: number;
          ticks: number;
          state: LiveSandboxState;
          market: SandboxMarket | null;
        };
        error?: string;
      };
      if (!res.ok || !data.log) throw new Error(data.error ?? "error");
      const log = data.log;
      downloadSandboxPdf({
        sessionId: log.sessionId,
        pair: log.pair,
        timeframe: log.timeframe,
        riskPercent: log.riskPercent,
        tickIntervalMs: log.tickIntervalMs,
        startedAt: log.startedAt,
        endedAt: log.endedAt,
        startingEquity: log.startingEquity,
        finalEquity: log.finalEquity,
        pnl: log.pnl,
        wins: log.wins,
        losses: log.losses,
        ticks: log.ticks,
        state: log.state,
        market: log.market,
        locale,
        labels,
      });
    } catch (e) {
      toast({
        tone: "error",
        title: t.admin.pdfExportError,
        message: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setExportingId(null);
    }
  };

  const loc = locale === "en" ? "en-US" : "es-CR";

  return (
    <section
      className={embedded ? "mt-12 border-t border-snow/10 pt-10" : "mt-8"}
    >
      <div
        className={`flex flex-wrap items-end gap-4 ${
          embedded ? "justify-between" : "justify-end"
        }`}
      >
        {embedded && (
          <div>
            <h2 className="font-display text-lg font-bold text-snow">
              {t.admin.logsTitle}
            </h2>
            <p className="mt-1 max-w-xl text-sm text-snow/45">
              {t.admin.logsLead}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {activeState && (
            <button
              type="button"
              onClick={exportLive}
              className="rounded-lg border border-pulse/40 bg-pulse/10 px-3 py-2 text-sm font-semibold text-pulse hover:bg-pulse/20"
            >
              {t.admin.exportLivePdf}
            </button>
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-snow/15 px-3 py-2 text-sm text-snow/70 hover:border-snow/30 hover:text-snow"
          >
            {t.admin.refreshLogs}
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-snow/40">{t.admin.logsLoading}</p>
      ) : logs.length === 0 ? (
        <p className="mt-6 text-sm text-snow/40">{t.admin.logsEmpty}</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {logs.map((log) => {
            const wr = log.tradesCount
              ? Math.round((log.wins / log.tradesCount) * 100)
              : null;
            return (
              <li
                key={log.id}
                className="rounded-xl border border-snow/10 px-4 py-4"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <span className="font-mono text-xs text-pulse">
                        {log.sessionId}
                      </span>
                      <span className="text-sm font-medium text-snow">
                        {log.pair}
                        <span className="text-snow/35"> · </span>
                        {log.timeframe}
                      </span>
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          log.pnl >= 0 ? "text-emerald-300" : "text-red-300"
                        }`}
                      >
                        {log.pnl >= 0 ? "+" : ""}
                        {log.pnl.toLocaleString(loc, {
                          style: "currency",
                          currency: "USD",
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>

                    <div className="grid gap-2 text-xs text-snow/45 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-snow/30">
                          {t.admin.startedAt}
                        </p>
                        <p className="mt-0.5 text-snow/65">
                          {new Date(log.startedAt).toLocaleString(loc)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-snow/30">
                          {t.admin.endedAt}
                        </p>
                        <p className="mt-0.5 text-snow/65">
                          {new Date(log.endedAt).toLocaleString(loc)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-md border border-snow/10 bg-snow/[0.03] px-2 py-1 text-xs tabular-nums text-snow/60">
                        {log.ticks} {t.admin.ticksLabel.toLowerCase()}
                      </span>
                      <span className="rounded-md border border-snow/10 bg-snow/[0.03] px-2 py-1 text-xs tabular-nums text-snow/60">
                        {log.tradesCount}{" "}
                        {t.admin.paperTrades.toLowerCase()}
                      </span>
                      <span className="rounded-md border border-snow/10 bg-snow/[0.03] px-2 py-1 text-xs tabular-nums text-snow/60">
                        {t.admin.winRate} {wr == null ? "—" : `${wr}%`}
                      </span>
                      <span className="rounded-md border border-snow/10 bg-snow/[0.03] px-2 py-1 font-mono text-[11px] text-snow/40">
                        {log.id.slice(0, 8)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={exportingId === log.id}
                    onClick={() => void exportLog(log.id)}
                    className="shrink-0 self-start rounded-lg bg-pulse px-3 py-2 text-sm font-semibold text-ink disabled:opacity-50"
                  >
                    {exportingId === log.id
                      ? t.admin.exportingPdf
                      : t.admin.exportPdf}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
