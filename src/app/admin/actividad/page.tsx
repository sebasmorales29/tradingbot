import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { loadAdminTelemetry } from "@/lib/admin-telemetry";

export default async function AdminActivityPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin/actividad");
  if (!access.can("admin_telemetry")) redirect("/admin");

  let data;
  let error: string | null = null;
  try {
    data = await loadAdminTelemetry();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-snow">Actividad</h1>
      <p className="mt-2 text-snow/60">
        Señales y trades recientes en todo el sistema.
      </p>

      {error && (
        <p className="mt-6 text-sm text-red-300">{error}</p>
      )}

      {data && (
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-xl font-bold text-snow">
              Señales
            </h2>
            {!data.recentSignals.length ? (
              <p className="mt-4 text-sm text-snow/50">Ninguna aún.</p>
            ) : (
              <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto text-sm">
                {data.recentSignals.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-snow/10 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="text-pulse">{s.side}</span> {s.pair}
                        {s.price != null
                          ? ` @ ${Number(s.price).toFixed(2)}`
                          : ""}
                      </span>
                      <Link
                        href={`/admin/usuarios/${s.user_id}`}
                        className="text-xs text-snow/45 hover:text-pulse"
                      >
                        ver usuario
                      </Link>
                    </div>
                    <div className="text-xs text-snow/40">{s.reason}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-snow">
              Trades
            </h2>
            {!data.recentTrades.length ? (
              <p className="mt-4 text-sm text-snow/50">Ninguno aún.</p>
            ) : (
              <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto text-sm">
                {data.recentTrades.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-lg border border-snow/10 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {t.pair} · {t.status} · qty{" "}
                        {Number(t.qty).toFixed(5)}
                        {t.pnl != null
                          ? ` · pnl ${Number(t.pnl).toFixed(2)}`
                          : ""}
                      </span>
                      <Link
                        href={`/admin/usuarios/${t.user_id}`}
                        className="text-xs text-snow/45 hover:text-pulse"
                      >
                        ver usuario
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
