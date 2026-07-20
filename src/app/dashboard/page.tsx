import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionAccess } from "@/lib/auth/session";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login");
  if (access.status === "suspended") {
    redirect("/login?error=suspended");
  }

  const supabase = await createClient();
  const userId = access.user.id;

  const { data: bot } = await supabase
    .from("bot_configs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", userId)
    .order("opened_at", { ascending: false })
    .limit(12);

  const { data: signals } = await supabase
    .from("signals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: equityRows } = await supabase
    .from("equity_snapshots")
    .select("equity")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(1);

  const equity = equityRows?.[0]?.equity ?? 10_000;
  const tradeList = trades ?? [];
  const openTrades = tradeList.filter((t) => t.status === "open").length;
  const closed = tradeList.filter((t) => t.status === "closed");
  const pnlTotal = closed.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0);

  return (
    <DashboardClient
      email={access.user.email}
      showAdmin={access.can("admin_console")}
      canControlBot={access.can("bot_control")}
      role={access.role}
      bot={bot}
      trades={tradeList}
      signals={signals ?? []}
      equity={Number(equity)}
      openTrades={openTrades}
      pnlTotal={pnlTotal}
    />
  );
}
