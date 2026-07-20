import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { loadTrendPulseParams } from "@/lib/trading/strategy/settings";
import { AdminStrategyView } from "@/components/admin/views/AdminStrategyView";

export default async function AdminStrategyPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin/estrategia");
  if (!access.can("admin_analytics") && !access.can("admin_edit_strategy")) {
    redirect("/admin");
  }

  const params = await loadTrendPulseParams();

  return (
    <AdminStrategyView
      initial={params}
      canEdit={access.can("admin_edit_strategy")}
    />
  );
}
