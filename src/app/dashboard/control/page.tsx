import { redirect } from "next/navigation";
import {
  loadDashboardData,
  requireDashboardUser,
} from "@/lib/dashboard-data";
import { ControlView } from "@/components/dashboard/views/ControlView";

export default async function DashboardControlPage() {
  const access = await requireDashboardUser();
  if (!access.can("bot_control")) redirect("/dashboard");

  const data = await loadDashboardData(access.user.id);
  return <ControlView bot={data.bot} />;
}
