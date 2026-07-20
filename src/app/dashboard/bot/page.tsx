import {
  loadDashboardData,
  requireDashboardUser,
} from "@/lib/dashboard-data";
import { BotConfigView } from "@/components/dashboard/views/BotConfigView";

export default async function DashboardBotPage() {
  const access = await requireDashboardUser();
  const data = await loadDashboardData(access.user.id);

  return (
    <BotConfigView bot={data.bot} signalsTotal={data.signalsTotal} />
  );
}
