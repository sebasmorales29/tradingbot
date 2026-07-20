import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { loadAdminTelemetry } from "@/lib/admin-telemetry";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/admin");
  if (!isAdminEmail(user.email)) redirect("/dashboard");

  let data;
  let loadError: string | null = null;
  try {
    data = await loadAdminTelemetry();
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Error cargando telemetría";
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
              Admin
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
              {user.email}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-8">
        <h1 className="font-display text-3xl font-bold text-snow md:text-4xl">
          Consola de administración
        </h1>
        <p className="mt-2 max-w-2xl text-snow/60">
          Solo visible para emails en{" "}
          <code className="text-pulse">ADMIN_EMAILS</code>. Aquí ves salud del
          sistema, telemetría del bot y parámetros de la estrategia.
        </p>

        {loadError ? (
          <p className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
            {loadError}. Revisa{" "}
            <code className="text-snow/70">SUPABASE_SERVICE_ROLE_KEY</code> en
            Vercel.
          </p>
        ) : data ? (
          <>
            <p className="mt-4 text-xs text-snow/40">
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
              <Stat
                label="Señales 24h"
                value={String(data.signals24h)}
              />
              <Stat label="Trades 24h" value={String(data.trades24h)} />
              <Stat
                label="PnL cerrado total"
                value={`${data.totalPnlClosed >= 0 ? "+" : ""}${data.totalPnlClosed.toFixed(2)}`}
                accent
              />
            </div>

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
              <p className="mt-3 text-xs text-snow/40">
                Paper · Binance Vision (datos públicos) · Cron externo cada 15
                min · Riesgo diario máx. 3% en motor
              </p>
            </section>

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

            <section className="mt-12 grid gap-10 lg:grid-cols-2">
              <div>
                <h2 className="font-display text-xl font-bold text-snow">
                  Señales recientes
                </h2>
                {!data.recentSignals.length ? (
                  <p className="mt-4 text-sm text-snow/50">
                    Ninguna aún (sin cruces EMA). El cron puede estar OK igual.
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

            <section className="mt-12 rounded-xl border border-snow/10 bg-slate/30 p-6">
              <h2 className="font-display text-lg font-bold text-snow">
                Cómo leer “¿está vivo?”
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-snow/65">
                <li>
                  Cron-job.org con historial <strong className="text-snow">200 OK</strong>{" "}
                  = el motor se ejecuta en la nube.
                </li>
                <li>
                  Panel de usuario vacío de trades = no hubo cruce EMA (normal),
                  no significa caída del sistema.
                </li>
                <li>
                  Equity paper arranca en $10,000 reales en DB (no es un número
                  inventado en el HTML).
                </li>
              </ul>
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
