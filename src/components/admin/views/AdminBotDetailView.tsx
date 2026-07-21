"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { AdminBotDetail } from "@/lib/admin-bots";
import { AdminStat } from "@/components/admin/AdminStat";
import { BotAdminControls } from "@/components/admin/BotAdminControls";

export function AdminBotDetailView({
  detail,
  userId,
  canEdit,
}: {
  detail: AdminBotDetail;
  userId: string;
  canEdit: boolean;
}) {
  const t = useT();
  const { locale } = useLanguage();
  const dateLocale = locale === "en" ? "en-US" : "es-CR";
  const { bot, metrics } = detail;

  const title =
    detail.display_name !== "—"
      ? detail.display_name
      : detail.email || t.admin.userFallback;

  return (
    <div>
      <Link
        href="/admin/bots"
        className="text-sm text-snow/50 transition hover:text-snow"
      >
        {t.admin.backBots}
      </Link>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-pulse">
            {t.admin.colBot}
          </p>
          <h1 className="font-display text-3xl font-bold text-snow">{title}</h1>
          <p className="mt-1 text-sm text-snow/55">{detail.email}</p>
          <p className="mt-1 text-xs text-snow/40">
            <span
              className={bot.is_active ? "text-emerald-300" : "text-amber-300"}
            >
              {bot.is_active ? t.admin.active : t.admin.paused}
            </span>
            {" · "}
            {bot.mode}
            {bot.kill_switch ? ` · ${t.admin.killSwitchBanner}` : ""}
          </p>
        </div>
        <Link
          href={`/admin/usuarios/${userId}`}
          className="inline-flex h-9 items-center rounded-lg border border-snow/20 px-3.5 text-sm text-snow/70 transition hover:bg-snow/5 hover:text-snow"
        >
          {t.admin.viewUserAccount}
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat
          label={t.admin.equity}
          value={
            metrics.equity != null
              ? `$${metrics.equity.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}`
              : "—"
          }
          accent
        />
        <AdminStat
          label={t.admin.openTrades}
          value={String(metrics.open_trades)}
        />
        <AdminStat
          label={t.admin.closedPnl}
          value={`${metrics.pnl_closed >= 0 ? "+" : ""}${metrics.pnl_closed.toFixed(2)}`}
        />
        <AdminStat
          label={t.admin.winRate}
          value={
            metrics.win_rate != null ? `${metrics.win_rate}%` : "—"
          }
        />
        <AdminStat
          label={t.admin.signals24h}
          value={String(metrics.signals_24h)}
        />
        <AdminStat
          label={t.admin.signalsTotal}
          value={String(metrics.signals_total)}
        />
        <AdminStat
          label={t.admin.closedTrades}
          value={String(metrics.closed_trades)}
        />
        <AdminStat
          label={t.admin.avgPnl}
          value={
            metrics.avg_pnl != null
              ? `${metrics.avg_pnl >= 0 ? "+" : ""}${metrics.avg_pnl.toFixed(2)}`
              : "—"
          }
        />
      </div>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-snow">
          {t.admin.configuration}
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Info
            label={t.admin.colStatus}
            value={bot.is_active ? t.admin.active : t.admin.paused}
            tone={bot.is_active ? "ok" : "warn"}
          />
          <Info label={t.admin.mode} value={bot.mode} />
          <Info label={t.admin.riskPercent} value={String(bot.risk_percent)} />
          <Info
            label={t.admin.killSwitch}
            value={bot.kill_switch ? t.admin.killOn : t.admin.killOff}
          />
          <Info label={t.admin.pairs} value={bot.pairs.join(", ") || "—"} />
          <Info label={t.admin.botId} value={bot.id} mono />
          <Info
            label={t.admin.created}
            value={new Date(bot.created_at).toLocaleString(dateLocale)}
          />
          <Info
            label={t.admin.updated}
            value={new Date(bot.updated_at).toLocaleString(dateLocale)}
          />
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-snow">
          {t.admin.openTrades}
        </h2>
        {!detail.open_trades.length ? (
          <p className="mt-4 text-sm text-snow/50">{t.admin.noOpenTrades}</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {detail.open_trades.map((tr) => (
              <li
                key={tr.id}
                className="rounded-lg border border-snow/10 px-4 py-3"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-snow">
                    {tr.pair} · {tr.side} · {t.admin.qty} {tr.qty.toFixed(6)}
                  </span>
                  <span className="text-snow/50">
                    {t.admin.entry} {tr.entry_price.toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-snow/40">
                  SL {tr.stop_loss?.toFixed(2) ?? "—"} · TP{" "}
                  {tr.take_profit?.toFixed(2) ?? "—"} ·{" "}
                  {new Date(tr.opened_at).toLocaleString(dateLocale)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-bold text-snow">
            {t.admin.tradeHistory}
          </h2>
          {!detail.recent_trades.length ? (
            <p className="mt-4 text-sm text-snow/50">{t.admin.noTrades}</p>
          ) : (
            <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto text-sm">
              {detail.recent_trades.map((tr) => (
                <li
                  key={tr.id}
                  className="rounded-lg border border-snow/10 px-3 py-2"
                >
                  {tr.pair} · {tr.status}
                  {tr.pnl != null
                    ? ` · pnl ${tr.pnl >= 0 ? "+" : ""}${tr.pnl.toFixed(2)}`
                    : ""}
                  <div className="text-xs text-snow/40">
                    {new Date(tr.opened_at).toLocaleString(dateLocale)}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-snow">
            {t.admin.recentSignals}
          </h2>
          {!detail.recent_signals.length ? (
            <p className="mt-4 text-sm text-snow/50">{t.admin.noSignals}</p>
          ) : (
            <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto text-sm">
              {detail.recent_signals.map((s) => (
                <li
                  key={s.id}
                  className="rounded-lg border border-snow/10 px-3 py-2"
                >
                  <span className="text-pulse">{s.side}</span> {s.pair}
                  {s.price != null ? ` @ ${s.price.toFixed(2)}` : ""}
                  <div className="text-xs text-snow/40">{s.reason}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {detail.equity_history.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-snow">
            {t.admin.equitySnapshots}
          </h2>
          <ul className="mt-4 max-h-60 space-y-1 overflow-y-auto text-sm text-snow/70">
            {detail.equity_history.map((e, i) => (
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
                  {new Date(e.recorded_at).toLocaleString(dateLocale)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <BotAdminControls
        userId={userId}
        isActive={bot.is_active}
        killSwitch={bot.kill_switch}
        riskPercent={bot.risk_percent}
        mode={bot.mode}
        canEdit={canEdit}
      />
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
