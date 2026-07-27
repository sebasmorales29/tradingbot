import {
  loadDashboardData,
  requireDashboardUser,
} from "@/lib/dashboard-data";
import { BotDetailsView } from "@/components/dashboard/views/BotDetailsView";

export default async function DashboardBotDetailsPage() {
  const access = await requireDashboardUser();
  const data = await loadDashboardData(access.user.id);

  return (
    <BotDetailsView bot={data.bot} signalsTotal={data.signalsTotal} />
  );
}
