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

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-snow">Usuarios</h1>
      <p className="mt-2 text-snow/60">
        Cuentas registradas, roles y métricas. Abre un usuario para editar,
        resetear acceso o ver su bot y trades.
      </p>

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
                  <p className="font-medium text-snow">
                    {u.full_name || "—"}
                  </p>
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
                  {u.bot_active == null
                    ? "—"
                    : u.bot_active
                      ? "Activo"
                      : "Pausa"}
                  {u.bot_mode ? ` · ${u.bot_mode}` : ""}
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
                    className="text-pulse transition hover:text-pulse/80"
                  >
                    Ver
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
