"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ToggleBotButton } from "@/components/dashboard/ToggleBotButton";
import { BotAutoTick } from "@/components/dashboard/BotAutoTick";
import { useT } from "@/components/i18n/T";

type Bot = {
  id: string;
  is_active: boolean;
  mode: "paper" | "live";
  risk_percent: number;
  pairs: string[];
};

type Trade = {
  id: string;
  pair: string;
  side: "buy" | "sell";
  qty: number;
  entry_price: number;
  exit_price: number | null;
  pnl: number | null;
  status: "open" | "closed";
  opened_at: string;
};

type Signal = {
  id: string;
  pair: string;
  side: "long" | "flat";
  reason: string | null;
  price: number | null;
  created_at: string;
};

export function DashboardClient({
  email,
  showAdmin,
  canControlBot = true,
  role,
  bot,
  trades,
  signals,
  equity,
  openTrades,
  pnlTotal,
}: {
  email: string | undefined;
  showAdmin?: boolean;
  canControlBot?: boolean;
  role?: string;
  bot: Bot | null;
  trades: Trade[];
  signals: Signal[];
  equity: number;
  openTrades: number;
  pnlTotal: number;
}) {
  const t = useT();
  const isActive = Boolean(bot?.is_active);

  return (
    <main className="min-h-[100svh] bg-ink">
      <DashboardHeader email={email} showAdmin={showAdmin} role={role} />

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-snow md:text-4xl">
              {t.dash.panel}
            </h1>
            <p className="mt-2 text-snow/60">{t.dash.lead}</p>
            <p className="mt-2 text-xs text-pulse/80">
              {isActive ? t.dash.engineOn : t.dash.engineOff}
            </p>
          </div>
          {canControlBot && (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
              <BotAutoTick isActive={isActive} />
              {bot && (
                <ToggleBotButton botId={bot.id} isActive={bot.is_active} />
              )}
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <StatCard label={t.dash.openTrades} value={String(openTrades)} />
          <StatCard
            label={t.dash.closedPnl}
            value={`${pnlTotal >= 0 ? "+" : ""}${pnlTotal.toFixed(2)} USDT`}
          />
        </div>

        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-snow">
            {t.dash.lastSignals}
          </h2>
          {!signals.length ? (
            <p className="mt-4 text-sm text-snow/50">{t.dash.noSignals}</p>
          ) : (
            <ul className="mt-4 divide-y divide-snow/10 rounded-xl border border-snow/10">
              {signals.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-col gap-1 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="text-snow">
                    <span className="text-pulse">{s.side.toUpperCase()}</span>
                    {" · "}
                    {s.pair}
                    {s.price != null ? ` @ ${Number(s.price).toFixed(2)}` : ""}
                  </span>
                  <span className="text-snow/45">{s.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-12">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-display text-xl font-bold text-snow">
              {t.dash.lastTrades}
            </h2>
            <p className="text-xs text-snow/40">
              {t.dash.pairs}:{" "}
              {(bot?.pairs ?? ["BTC/USDT", "ETH/USDT"]).join(" · ")}
            </p>
          </div>

          {!trades.length ? (
            <div className="mt-4 rounded-xl border border-snow/10 bg-slate/30 px-5 py-10 text-center">
              <p className="font-display text-lg font-semibold text-snow">
                {t.dash.emptyTitle}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm text-snow/55">
                {t.dash.emptyText}
              </p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-snow/10 rounded-xl border border-snow/10">
              {trades.map((trade) => (
                <li
                  key={trade.id}
                  className="flex items-center justify-between px-5 py-4 text-sm"
                >
                  <span className="text-snow">
                    {trade.pair} · {trade.side.toUpperCase()} · qty{" "}
                    {Number(trade.qty).toFixed(6)}
                  </span>
                  <span className="text-snow/50">
                    {trade.status}
                    {trade.pnl != null
                      ? ` · ${Number(trade.pnl).toFixed(2)}`
                      : ` · entry ${Number(trade.entry_price).toFixed(2)}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
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
