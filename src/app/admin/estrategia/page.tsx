import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { loadTrendPulseParams } from "@/lib/trading/strategy/settings";
import { StrategyEditor } from "@/components/admin/StrategyEditor";

export default async function AdminStrategyPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin/estrategia");
  if (!access.can("admin_analytics") && !access.can("admin_edit_strategy")) {
    redirect("/admin");
  }

  const params = await loadTrendPulseParams();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-snow">Estrategia</h1>
      <p className="mt-2 text-snow/60">
        Parámetros de Trend Pulse (paper · Binance Vision). Los cambios aplican
        a todos los usuarios en el próximo tick.
      </p>
      <StrategyEditor
        initial={params}
        canEdit={access.can("admin_edit_strategy")}
      />
    </div>
  );
}
