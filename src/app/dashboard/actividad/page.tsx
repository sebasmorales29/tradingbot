import {
  loadDashboardData,
  requireDashboardUser,
} from "@/lib/dashboard-data";
import { ActivityView } from "@/components/dashboard/views/ActivityView";

export default async function DashboardActivityPage() {
  const access = await requireDashboardUser();
  const data = await loadDashboardData(access.user.id);

  return (
    <ActivityView
      bot={data.bot}
      trades={data.trades}
      signals={data.signals}
      equityHistory={data.equityHistory}
    />
  );
}
