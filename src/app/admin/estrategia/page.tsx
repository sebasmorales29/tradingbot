import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { TREND_PULSE_META } from "@/lib/trading/strategy/trend-pulse";

export default async function AdminStrategyPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin/estrategia");
  if (!access.can("admin_analytics")) redirect("/admin");

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-snow">Estrategia</h1>
      <p className="mt-2 text-snow/60">
        Parámetros actuales de Trend Pulse (paper · Binance Vision).
      </p>

      <div className="mt-8 overflow-x-auto rounded-xl border border-snow/10">
        <table className="w-full min-w-[480px] text-left text-sm">
          <tbody className="divide-y divide-snow/10">
            {Object.entries(TREND_PULSE_META).map(([k, v]) => (
              <tr key={k}>
                <td className="px-4 py-3 text-snow/50">{k}</td>
                <td className="px-4 py-3 font-medium text-snow">{String(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-xs text-snow/40">
        Paper · Cron externo cada 15 min · Riesgo diario máx. 3% en motor
      </p>
    </div>
  );
}
