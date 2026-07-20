"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { roleLabel, type Role } from "@/lib/roles";
import type { AdminUserListItem } from "@/lib/admin-users";

export function AdminUsersView({
  users,
  error,
  canCreate,
}: {
  users: AdminUserListItem[];
  error: string | null;
  canCreate: boolean;
}) {
  const t = useT();
  const { locale } = useLanguage();

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-snow">
            {t.admin.usersTitle}
          </h1>
          <p className="mt-2 text-snow/60">{t.admin.usersLead}</p>
        </div>
        {canCreate && (
          <Link
            href="/admin/usuarios/nuevo"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-pulse px-4 text-sm font-semibold text-ink transition hover:bg-pulse/90"
          >
            {t.admin.addUser}
          </Link>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {error === "Error cargando usuarios" ? t.admin.usersLoadError : error}
        </p>
      )}

      <div className="mt-8 overflow-x-auto rounded-xl border border-snow/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-snow/10 bg-slate/40 text-xs uppercase tracking-wider text-snow/45">
            <tr>
              <th className="px-4 py-3 font-medium">{t.admin.colUser}</th>
              <th className="px-4 py-3 font-medium">{t.admin.colRole}</th>
              <th className="px-4 py-3 font-medium">{t.admin.colStatus}</th>
              <th className="px-4 py-3 font-medium">{t.admin.colBot}</th>
              <th className="px-4 py-3 font-medium">{t.admin.colTrades}</th>
              <th className="px-4 py-3 font-medium">{t.admin.colPnl}</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-snow/10">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-snow/[0.03]">
                <td className="px-4 py-3">
                  <p className="font-medium text-snow">{u.display_name}</p>
                  <p className="text-xs text-snow/45">
                    {u.email ?? t.admin.noEmail}
                  </p>
                </td>
                <td className="px-4 py-3 text-snow/80">
                  {roleLabel(u.role as Role, locale)}
                </td>
                <td className="px-4 py-3">
                  {u.status === "suspended" ? (
                    <span className="text-red-300">{t.admin.suspended}</span>
                  ) : (
                    <span className="text-emerald-300/90">{t.admin.active}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-snow/70">
                  {u.bot_active == null ? (
                    "—"
                  ) : u.bot_active ? (
                    <span className="text-emerald-300">{t.admin.active}</span>
                  ) : (
                    <span className="text-amber-300">{t.admin.paused}</span>
                  )}
                  {u.bot_mode ? (
                    <span className="text-snow/70"> · {u.bot_mode}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-snow/70">
                  {t.admin.openClosed
                    .replace("{open}", String(u.open_trades))
                    .replace("{closed}", String(u.closed_trades))}
                </td>
                <td className="px-4 py-3 text-snow/80">
                  {u.pnl_closed >= 0 ? "+" : ""}
                  {u.pnl_closed.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/admin/usuarios/${u.id}`}
                    className="inline-flex rounded-md border border-pulse/40 bg-pulse/10 px-3 py-1.5 text-xs font-semibold text-pulse transition hover:bg-pulse/20"
                  >
                    {t.admin.edit}
                  </Link>
                </td>
              </tr>
            ))}
            {!users.length && !error && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-snow/50"
                >
                  {t.admin.usersEmpty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
