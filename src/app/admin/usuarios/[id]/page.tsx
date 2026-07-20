import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { getAdminUserDetail } from "@/lib/admin-users";
import { roleLabel } from "@/lib/roles";
import { AdminStat } from "@/components/admin/AdminStat";
import { UserAdminActions } from "@/components/admin/UserAdminActions";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getSessionAccess();
  if (!access) redirect(`/login?next=/admin/usuarios/${id}`);
  if (
    !access.can("admin_manage_users") &&
    !access.can("admin_support_view") &&
    !access.can("admin_manage_roles")
  ) {
    redirect("/admin");
  }

  let user;
  try {
    user = await getAdminUserDetail(id);
  } catch {
    user = null;
  }
  if (!user) notFound();

  const canManage = access.can("admin_manage_users");
  const canRoles = access.can("admin_manage_roles");

  return (
    <div>
      <Link
        href="/admin/usuarios"
        className="text-sm text-snow/50 transition hover:text-snow"
      >
        ← Usuarios
      </Link>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-snow">
            {user.display_name !== "—"
              ? user.display_name
              : user.email || "Usuario"}
          </h1>
          <p className="mt-1 text-sm text-snow/55">{user.email}</p>
          <p className="mt-1 text-xs text-snow/40">
            {roleLabel(user.role)} ·{" "}
            {user.status === "suspended" ? "Suspendido" : "Activo"} · id{" "}
            {user.id.slice(0, 8)}…
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat
          label="Equity"
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
          label="Trades abiertos"
          value={String(user.open_trades)}
        />
        <AdminStat
          label="Trades cerrados"
          value={String(user.closed_trades)}
        />
        <AdminStat
          label="PnL cerrado"
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
        isSelf={access.user.id === user.id}
      />

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-snow">Cuenta</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Nombre" value={user.first_name || "—"} />
          <Info label="Apellidos" value={user.last_name || "—"} />
          <Info
            label="Fecha de nacimiento"
            value={user.date_of_birth || "—"}
          />
          <Info label="Email" value={user.email || "—"} />
          <Info
            label="Email confirmado"
            value={
              user.email_confirmed_at
                ? new Date(user.email_confirmed_at).toLocaleString("es-CR")
                : "No"
            }
          />
          <Info
            label="Último acceso"
            value={
              user.last_sign_in_at
                ? new Date(user.last_sign_in_at).toLocaleString("es-CR")
                : "—"
            }
          />
          <Info
            label="Registro"
            value={new Date(user.created_at).toLocaleString("es-CR")}
          />
          <Info
            label="Factores MFA"
            value={String(user.factors_count)}
          />
          <Info
            label="Ban auth"
            value={
              user.banned_until
                ? new Date(user.banned_until).toLocaleString("es-CR")
                : "Ninguno"
            }
          />
        </dl>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-snow">Bot</h2>
        {!user.bot ? (
          <p className="mt-4 text-sm text-snow/50">Sin configuración de bot.</p>
        ) : (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <Info
              label="Estado"
              value={user.bot.is_active ? "Activo" : "Pausado"}
            />
            <Info label="Modo" value={user.bot.mode} />
            <Info label="Riesgo %" value={String(user.bot.risk_percent)} />
            <Info label="Pares" value={user.bot.pairs.join(", ") || "—"} />
            <Info
              label="Kill switch"
              value={user.bot.kill_switch ? "Sí" : "No"}
            />
            <Info
              label="Actualizado"
              value={new Date(user.bot.updated_at).toLocaleString("es-CR")}
            />
          </dl>
        )}
      </section>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-xl font-bold text-snow">
            Trades recientes
          </h2>
          {!user.trades.length ? (
            <p className="mt-4 text-sm text-snow/50">Ninguno.</p>
          ) : (
            <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm">
              {user.trades.map((t) => (
                <li
                  key={t.id}
                  className="rounded-lg border border-snow/10 px-3 py-2"
                >
                  {t.pair} · {t.side} · {t.status}
                  {t.pnl != null ? ` · pnl ${t.pnl.toFixed(2)}` : ""}
                  <div className="text-xs text-snow/40">
                    {new Date(t.opened_at).toLocaleString("es-CR")}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-snow">
            Señales recientes
          </h2>
          {!user.signals.length ? (
            <p className="mt-4 text-sm text-snow/50">Ninguna.</p>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-snow/10 px-4 py-3">
      <dt className="text-xs uppercase tracking-wider text-snow/40">{label}</dt>
      <dd className="mt-1 text-snow">{value}</dd>
    </div>
  );
}
