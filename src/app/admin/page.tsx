import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAdminTelemetry } from "@/lib/admin-telemetry";
import { roleLabel, type Role } from "@/lib/roles";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
import { RoleManager } from "@/components/admin/RoleManager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin");
  if (!access.can("admin_console")) redirect("/dashboard");

  const showTelemetry =
    access.can("admin_telemetry") || access.can("admin_analytics");
  const showSupport = access.can("admin_support_view");
  const showRoles = access.can("admin_manage_roles");

  let data;
  let loadError: string | null = null;
  if (showTelemetry || showSupport) {
    try {
      data = await loadAdminTelemetry();
    } catch (e) {
      loadError = e instanceof Error ? e.message : "Error cargando telemetría";
    }
  }

  let users: {
    id: string;
    email: string | null;
    role: Role;
    created_at: string;
  }[] = [];

  if (showRoles) {
    try {
      const admin = createAdminClient();
      const { data: rows } = await admin
        .from("profiles")
        .select("id, email, role, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      users = (rows ?? []).map((r) => ({
        id: r.id,
        email: r.email,
        role: r.role as Role,
        created_at: r.created_at,
      }));
    } catch (e) {
      loadError =
        loadError ??
        (e instanceof Error ? e.message : "Error cargando usuarios");
    }
  }

  return (
    <main className="min-h-[100svh] bg-ink">
      <header className="border-b border-snow/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 md:px-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-display text-lg font-bold text-snow">
              Pulse<span className="text-pulse">Trade</span>
            </Link>
            <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
              {roleLabel(access.role)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-snow/55 transition hover:text-snow"
            >
              Ir al panel
            </Link>
            <span className="hidden text-sm text-snow/40 md:inline">
              {access.user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-8">
        <h1 className="font-display text-3xl font-bold text-snow md:text-4xl">
          Consola interna
        </h1>
        <p className="mt-2 max-w-2xl text-snow/60">
          Mismo inicio de sesión para todos. Tu rol (
          <span className="text-pulse">{roleLabel(access.role)}</span>)
          determina qué secciones ves aquí.
        </p>

        {loadError ? (
          <p className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {loadError}. Revisa{" "}
            <code className="text-snow/70">SUPABASE_SERVICE_ROLE_KEY</code> en
            Vercel.
          </p>
        ) : null}

        {showRoles && <RoleManager users={users} />}

        {data && showTelemetry ? (
          <>
            <p className="mt-10 text-xs text-snow/40">
              Generado: {new Date(data.generatedAt).toLocaleString("es-CR")}
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Usuarios" value={String(data.users)} />
              <Stat
                label="Bots activos"
                value={String(data.activeBots)}
                accent
              />
              <Stat label="Bots en pausa" value={String(data.pausedBots)} />
              <Stat
                label="Trades abiertos"
                value={String(data.openTrades)}
              />
              <Stat
                label="Trades cerrados"
                value={String(data.closedTrades)}
              />
              <Stat label="Señales 24h" value={String(data.signals24h)} />
              <Stat label="Trades 24h" value={String(data.trades24h)} />
              <Stat
                label="PnL cerrado total"
                value={`${data.totalPnlClosed >= 0 ? "+" : ""}${data.totalPnlClosed.toFixed(2)}`}
                accent
              />
            </div>

            {access.can("admin_analytics") && (
              <section className="mt-12">
                <h2 className="font-display text-xl font-bold text-snow">
                  Estrategia Trend Pulse
                </h2>
                <div className="mt-4 overflow-x-auto rounded-xl border border-snow/10">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <tbody className="divide-y divide-snow/10">
                      {Object.entries(data.strategy).map(([k, v]) => (
                        <tr key={k}>
                          <td className="px-4 py-3 text-snow/50">{k}</td>
                          <td className="px-4 py-3 font-medium text-snow">
                            {String(v)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {showSupport && (
              <section className="mt-12">
                <h2 className="font-display text-xl font-bold text-snow">
                  Bots por usuario
                </h2>
                {!data.bots.length ? (
                  <p className="mt-4 text-sm text-snow/50">Sin configs aún.</p>
                ) : (
                  <ul className="mt-4 divide-y divide-snow/10 rounded-xl border border-snow/10">
                    {data.bots.map((b) => (
                      <li
                        key={b.user_id}
                        className="flex flex-col gap-1 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="font-mono text-xs text-snow/70">
                          {b.user_id.slice(0, 8)}…
                        </span>
                        <span className="text-snow">
                          {b.is_active ? (
                            <span className="text-emerald-300">Activo</span>
                          ) : (
                            <span className="text-snow/50">Pausa</span>
                          )}
                          {" · "}
                          {b.mode}
                          {" · "}
                          riesgo {b.risk_percent}%
                          {b.kill_switch ? " · KILL" : ""}
                        </span>
                        <span className="text-xs text-snow/40">
                          {b.pairs.join(", ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <section className="mt-12 grid gap-10 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-xl font-bold text-snow">
                  Señales recientes
                </h2>
                {!data.recentSignals.length ? (
                  <p className="mt-4 text-sm text-snow/50">
                    Ninguna aún (sin cruces EMA).
                  </p>
                ) : (
                  <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm">
                    {data.recentSignals.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-lg border border-snow/10 px-3 py-2"
                      >
                        <span className="text-pulse">{s.side}</span> {s.pair}
                        {s.price != null
                          ? ` @ ${Number(s.price).toFixed(2)}`
                          : ""}
                        <div className="text-xs text-snow/40">{s.reason}</div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-snow">
                  Trades recientes
                </h2>
                {!data.recentTrades.length ? (
                  <p className="mt-4 text-sm text-snow/50">Ninguno aún.</p>
                ) : (
                  <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto text-sm">
                    {data.recentTrades.map((t) => (
                      <li
                        key={t.id}
                        className="rounded-lg border border-snow/10 px-3 py-2"
                      >
                        {t.pair} · {t.status} · qty {Number(t.qty).toFixed(5)}
                        {t.pnl != null
                          ? ` · pnl ${Number(t.pnl).toFixed(2)}`
                          : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-snow/10 bg-slate/40 p-5">
      <p className="text-xs uppercase tracking-wider text-snow/45">{label}</p>
      <p
        className={`mt-2 font-display text-2xl font-bold ${
          accent ? "text-pulse" : "text-snow"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
