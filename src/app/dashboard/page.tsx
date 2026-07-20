import { redirect } from "next/navigation";
import {
  loadDashboardData,
  requireDashboardUser,
} from "@/lib/dashboard-data";
import { OverviewView } from "@/components/dashboard/views/OverviewView";

export default async function DashboardPage() {
  const access = await requireDashboardUser();
  const data = await loadDashboardData(access.user.id);

  return (
    <OverviewView
      canControlBot={access.can("bot_control")}
      bot={data.bot}
      equity={data.equity}
      openTrades={data.openTrades}
      closedTrades={data.closedTrades}
      pnlTotal={data.pnlTotal}
      winRate={data.winRate}
    />
  );
}
