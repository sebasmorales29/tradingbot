"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { roleLabel, type Role } from "@/lib/roles";
import type { AdminUserDetail } from "@/lib/admin-users";
import { AdminStat } from "@/components/admin/AdminStat";
import { UserAdminActions } from "@/components/admin/UserAdminActions";

export function AdminUserDetailView({
  user,
  canManage,
  canRoles,
  isSelf,
}: {
  user: AdminUserDetail;
  canManage: boolean;
  canRoles: boolean;
  isSelf: boolean;
}) {
  const t = useT();
  const { locale } = useLanguage();
  const dateLocale = locale === "en" ? "en-US" : "es-CR";

  const title =
    user.display_name !== "—"
      ? user.display_name
      : user.email || t.admin.userFallback;

  return (
    <div>
      <Link
        href="/admin/usuarios"
        className="text-sm text-snow/50 transition hover:text-snow"
      >
        {t.admin.backUsers}
      </Link>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-snow">{title}</h1>
          <p className="mt-1 text-sm text-snow/55">{user.email}</p>
          <p className="mt-1 text-xs text-snow/40">
            {roleLabel(user.role as Role, locale)} ·{" "}
            {user.status === "suspended" ? t.admin.suspended : t.admin.active} ·
            id {user.id.slice(0, 8)}…
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat
          label={t.admin.equity}
          value={
            user.equity != null
              ? `$${user.equity.toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}`
              : "—"
          }
          accent
        />
        <AdminStat
          label={t.admin.openTrades}
          value={String(user.open_trades)}
        />
        <AdminStat
          label={t.admin.closedTrades}
          value={String(user.closed_trades)}
        />
        <AdminStat
          label={t.admin.closedPnl}
          value={`${user.pnl_closed >= 0 ? "+" : ""}${user.pnl_closed.toFixed(2)}`}
        />
      </div>

      <UserAdminActions
        user={{
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          date_of_birth: user.date_of_birth,
          role: user.role,
          status: user.status,
          factors_count: user.factors_count,
        }}
        canManage={canManage}
        canRoles={canRoles}
        isSelf={isSelf}
      />

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-snow">
          {t.admin.account}
        </h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Info label={t.auth.firstName} value={user.first_name || "—"} />
          <Info label={t.auth.lastName} value={user.last_name || "—"} />
          <Info
            label={t.auth.dateOfBirth}
            value={user.date_of_birth || "—"}
          />
          <Info label={t.auth.email} value={user.email || "—"} />
          <Info
            label={t.admin.emailConfirmed}
            value={
              user.email_confirmed_at
                ? new Date(user.email_confirmed_at).toLocaleString(dateLocale)
                : t.admin.no
            }
          />
          <Info
            label={t.admin.lastSignIn}
            value={
              user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString(dateLocale)
                : "—"
            }
          />
          <Info
            label={t.admin.registered}
            value={new Date(user.created_at).toLocaleString(dateLocale)}
          />
          <Info
            label={t.admin.mfaFactors}
            value={String(user.factors_count)}
          />
          <Info
            label={t.admin.banAuth}
            value={
              user.banned_until
                ? new Date(user.banned_until).toLocaleString(dateLocale)
                : t.admin.none
            }
          />
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-snow">
          {t.admin.colBot}
        </h2>
        {!user.bot ? (
          <p className="mt-4 text-sm text-snow/50">{t.admin.noBotConfig}</p>
        ) : (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Info
              label={t.admin.colStatus}
              value={user.bot.is_active ? t.admin.active : t.admin.paused}
              tone={user.bot.is_active ? "ok" : "warn"}
            />
            <Info label={t.admin.mode} value={user.bot.mode} />
            <Info
              label={t.admin.riskPercent}
              value={String(user.bot.risk_percent)}
            />
            <Info
              label={t.admin.pairs}
              value={user.bot.pairs.join(", ") || "—"}
            />
            <Info
              label={t.admin.killSwitch}
              value={user.bot.kill_switch ? t.admin.yes : t.admin.no}
            />
            <Info
              label={t.admin.updated}
              value={new Date(user.bot.updated_at).toLocaleString(dateLocale)}
            />
          </dl>
        )}
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-bold text-snow">
            {t.admin.recentTrades}
          </h2>
          {!user.trades.length ? (
            <p className="mt-4 text-sm text-snow/50">{t.admin.none}.</p>
          ) : (
            <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm">
              {user.trades.map((tr) => (
                <li
                  key={tr.id}
                  className="rounded-lg border border-snow/10 px-3 py-2"
                >
                  {tr.pair} · {tr.side} · {tr.status}
                  {tr.pnl != null ? ` · pnl ${tr.pnl.toFixed(2)}` : ""}
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
          {!user.signals.length ? (
            <p className="mt-4 text-sm text-snow/50">{t.admin.noneF}.</p>
          ) : (
            <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm">
              {user.signals.map((s) => (
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
    </div>
  );
}

function Info({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn";
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
      <dd className={`mt-1 ${valueClass}`}>{value}</dd>
    </div>
  );
}
