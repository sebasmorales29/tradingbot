import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { listAdminUsers, type AdminUserListItem } from "@/lib/admin-users";
import { roleLabel } from "@/lib/roles";

export default async function AdminUsersPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin/usuarios");
  if (
    !access.can("admin_manage_users") &&
    !access.can("admin_support_view") &&
    !access.can("admin_manage_roles")
  ) {
    redirect("/admin");
  }

  let users: AdminUserListItem[] = [];
  let error: string | null = null;
  try {
    users = await listAdminUsers();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error cargando usuarios";
  }

  const canCreate = access.can("admin_manage_users");

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-snow">Usuarios</h1>
          <p className="mt-2 text-snow/60">
            Cuentas registradas, roles y métricas. Edita un usuario para
            cambiar datos, acceso o ver su bot.
          </p>
        </div>
        {canCreate && (
          <Link
            href="/admin/usuarios/nuevo"
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-pulse px-4 text-sm font-semibold text-ink transition hover:bg-pulse/90"
          >
            Agregar usuario
          </Link>
        )}
      </div>

      {error && (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {error}
        </p>
      )}

      <div className="mt-8 overflow-x-auto rounded-xl border border-snow/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-snow/10 bg-slate/40 text-xs uppercase tracking-wider text-snow/45">
            <tr>
              <th className="px-4 py-3 font-medium">Usuario</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 font-medium">Bot</th>
              <th className="px-4 py-3 font-medium">Trades</th>
              <th className="px-4 py-3 font-medium">PnL</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-snow/10">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-snow/[0.03]">
                <td className="px-4 py-3">
                  <p className="font-medium text-snow">{u.display_name}</p>
                  <p className="text-xs text-snow/45">{u.email ?? "sin email"}</p>
                </td>
                <td className="px-4 py-3 text-snow/80">{roleLabel(u.role)}</td>
                <td className="px-4 py-3">
                  {u.status === "suspended" ? (
                    <span className="text-red-300">Suspendido</span>
                  ) : (
                    <span className="text-emerald-300/90">Activo</span>
                  )}
                </td>
                <td className="px-4 py-3 text-snow/70">
                  {u.bot_active == null ? (
                    "—"
                  ) : u.bot_active ? (
                    <span className="text-emerald-300">Activo</span>
                  ) : (
                    <span className="text-amber-300">Pausa</span>
                  )}
                  {u.bot_mode ? (
                    <span className="text-snow/70"> · {u.bot_mode}</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-snow/70">
                  {u.open_trades} abiertos · {u.closed_trades} cerrados
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
                    Editar
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
                  No hay usuarios aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
