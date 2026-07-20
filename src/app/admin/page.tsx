import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { loadAdminTelemetry } from "@/lib/admin-telemetry";
import { AdminStat } from "@/components/admin/AdminStat";

export default async function AdminOverviewPage() {
  const access = await getSessionAccess();
  if (!access?.can("admin_console")) redirect("/dashboard");

  let data;
  let loadError: string | null = null;
  try {
    if (access.can("admin_telemetry") || access.can("admin_analytics")) {
      data = await loadAdminTelemetry();
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Error cargando resumen";
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-snow">Resumen</h1>
      <p className="mt-2 text-snow/60">
        Vista general del sistema. Usa el menú para usuarios, bots y actividad.
      </p>

      {loadError && (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {loadError}
        </p>
      )}

      {data ? (
        <>
          <p className="mt-4 text-xs text-snow/40">
            Actualizado: {new Date(data.generatedAt).toLocaleString("es-CR")}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStat label="Usuarios" value={String(data.users)} />
            <AdminStat
              label="Bots activos"
              value={String(data.activeBots)}
              accent
            />
            <AdminStat label="Bots en pausa" value={String(data.pausedBots)} />
            <AdminStat
              label="Trades abiertos"
              value={String(data.openTrades)}
            />
            <AdminStat
              label="Trades cerrados"
              value={String(data.closedTrades)}
            />
            <AdminStat label="Señales 24h" value={String(data.signals24h)} />
            <AdminStat label="Trades 24h" value={String(data.trades24h)} />
            <AdminStat
              label="PnL cerrado"
              value={`${data.totalPnlClosed >= 0 ? "+" : ""}${data.totalPnlClosed.toFixed(2)}`}
              accent
            />
          </div>
        </>
      ) : (
        !loadError && (
          <p className="mt-8 text-sm text-snow/50">
            Tu rol no incluye telemetría de resumen.
          </p>
        )
      )}
    </div>
  );
}
