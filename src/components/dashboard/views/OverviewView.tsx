"use client";

import { ToggleBotButton } from "@/components/dashboard/ToggleBotButton";
import { BotAutoTick } from "@/components/dashboard/BotAutoTick";
import { useT } from "@/components/i18n/T";

export function StatCard({
  label,
  value,
  accent,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  accent?: boolean;
  highlight?: boolean;
  tone?: "ok" | "warn";
}) {
  const valueClass =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : highlight || accent
          ? "text-pulse"
          : "text-snow";

  return (
    <div className="rounded-xl border border-snow/10 bg-slate/40 p-5">
      <p className="text-xs uppercase tracking-wider text-snow/45">{label}</p>
      <p className={`mt-2 font-display text-2xl font-bold ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

export function InfoCard({
  label,
  value,
  tone,
  mono,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
  mono?: boolean;
}) {
  const valueClass =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
        ? "text-amber-300"
        : "text-snow";
  return (
    <div className="rounded-lg border border-snow/10 px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-snow/40">{label}</dt>
      <dd
        className={`mt-1 break-all ${valueClass} ${mono ? "font-mono text-xs sm:text-sm" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

export function OverviewView({
  canControlBot,
  bot,
  equity,
  openTrades,
  closedTrades,
  pnlTotal,
  winRate,
}: {
  canControlBot: boolean;
  bot: {
    id: string;
    is_active: boolean;
    mode: "paper" | "live";
    risk_percent: number;
  } | null;
  equity: number;
  openTrades: number;
  closedTrades: number;
  pnlTotal: number;
  winRate: number | null;
}) {
  const t = useT();
  const isActive = Boolean(bot?.is_active);

  return (
    <div>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-snow">
            {t.dash.navOverview}
          </h1>
          <p className="mt-2 text-sm text-snow/55">{t.dash.lead}</p>
          <p className="mt-1 text-xs text-pulse/80">
            {isActive ? t.dash.engineOn : t.dash.engineOff}
          </p>
        </div>
        {canControlBot && bot && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <BotAutoTick isActive={isActive} />
            <ToggleBotButton botId={bot.id} isActive={bot.is_active} />
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t.dash.equity}
          value={`$${Number(equity).toLocaleString("en-US", {
            maximumFractionDigits: 2,
          })}`}
          accent
        />
        <StatCard
          label={t.dash.status}
          value={bot?.is_active ? t.dash.active : t.dash.paused}
          tone={bot?.is_active ? "ok" : "warn"}
        />
        <StatCard
          label={t.dash.mode}
          value={bot?.mode === "live" ? "Live" : "Paper"}
          highlight
        />
        <StatCard
          label={t.dash.risk}
          value={`${bot?.risk_percent ?? 0.75}%`}
        />
        <StatCard label={t.dash.openTrades} value={String(openTrades)} />
        <StatCard label={t.dash.closedTrades} value={String(closedTrades)} />
        <StatCard
          label={t.dash.closedPnl}
          value={`${pnlTotal >= 0 ? "+" : ""}${pnlTotal.toFixed(2)} USDT`}
        />
        <StatCard
          label={t.dash.winRate}
          value={winRate != null ? `${winRate}%` : "—"}
        />
      </div>
    </div>
  );
}
