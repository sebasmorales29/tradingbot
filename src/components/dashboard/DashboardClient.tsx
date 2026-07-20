"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { ToggleBotButton } from "@/components/dashboard/ToggleBotButton";
import { BotAutoTick } from "@/components/dashboard/BotAutoTick";
import { UserBotDangerZone } from "@/components/dashboard/UserBotDangerZone";
import { useT } from "@/components/i18n/T";

type Bot = {
  id: string;
  is_active: boolean;
  mode: "paper" | "live";
  risk_percent: number;
  pairs: string[];
  kill_switch: boolean;
  created_at: string;
  updated_at: string;
};

type Trade = {
  id: string;
  pair: string;
  side: "buy" | "sell";
  qty: number;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
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
  closedTrades,
  pnlTotal,
  winRate,
  signalsTotal,
  equityHistory,
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
  closedTrades: number;
  pnlTotal: number;
  winRate: number | null;
  signalsTotal: number;
  equityHistory: { equity: number; recorded_at: string }[];
}) {
  const t = useT();
  const isActive = Boolean(bot?.is_active);
  const openList = trades.filter((tr) => tr.status === "open");

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
            <p className="mt-1 text-xs text-snow/40">{t.dash.transparency}</p>
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

        {bot && (
          <section className="mt-12">
            <h2 className="font-display text-xl font-bold text-snow">
              {t.dash.configTitle}
            </h2>
            <p className="mt-1 text-sm text-snow/55">{t.dash.configLead}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Info
                label={t.dash.status}
                value={bot.is_active ? t.dash.active : t.dash.paused}
                tone={bot.is_active ? "ok" : "warn"}
              />
              <Info label={t.dash.mode} value={bot.mode} />
              <Info label={t.dash.risk} value={`${bot.risk_percent}%`} />
              <Info
                label={t.dash.killSwitch}
                value={
                  bot.kill_switch ? t.dash.killOnLabel : t.dash.killOffLabel
                }
                tone={bot.kill_switch ? "warn" : undefined}
              />
              <Info
                label={t.dash.pairs}
                value={(bot.pairs ?? []).join(", ") || "—"}
              />
              <Info label={t.dash.signalsCount} value={String(signalsTotal)} />
              <Info label={t.dash.botId} value={bot.id} mono />
              <Info
                label={t.dash.updated}
                value={new Date(bot.updated_at).toLocaleString()}
              />
              <Info
                label={t.dash.created}
                value={new Date(bot.created_at).toLocaleString()}
              />
            </dl>
          </section>
        )}

        <section className="mt-12">
          <h2 className="font-display text-xl font-bold text-snow">
            {t.dash.openTradesTitle}
          </h2>
          {!openList.length ? (
            <p className="mt-4 text-sm text-snow/50">{t.dash.noOpenTrades}</p>
          ) : (
            <ul className="mt-4 space-y-2 text-sm">
              {openList.map((tr) => (
                <li
                  key={tr.id}
                  className="rounded-lg border border-snow/10 px-4 py-3"
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <span className="text-snow">
                      {tr.pair} · {tr.side.toUpperCase()} · qty{" "}
                      {Number(tr.qty).toFixed(6)}
                    </span>
                    <span className="text-snow/50">
                      entry {Number(tr.entry_price).toFixed(2)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-snow/40">
                    {t.dash.stopLoss}{" "}
                    {tr.stop_loss != null
                      ? Number(tr.stop_loss).toFixed(2)
                      : "—"}{" "}
                    · {t.dash.takeProfit}{" "}
                    {tr.take_profit != null
                      ? Number(tr.take_profit).toFixed(2)
                      : "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

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

        {equityHistory.length > 1 && (
          <section className="mt-12">
            <h2 className="font-display text-xl font-bold text-snow">
              Equity
            </h2>
            <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto text-sm text-snow/70">
              {equityHistory.map((e, i) => (
                <li
                  key={`${e.recorded_at}-${i}`}
                  className="flex justify-between border-b border-snow/5 py-2"
                >
                  <span>
                    $
                    {e.equity.toLocaleString("en-US", {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <span className="text-xs text-snow/40">
                    {new Date(e.recorded_at).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {canControlBot && bot && (
          <UserBotDangerZone
            botId={bot.id}
            isActive={bot.is_active}
            killSwitch={bot.kill_switch}
            riskPercent={Number(bot.risk_percent)}
            mode={bot.mode}
          />
        )}
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

function Info({
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
