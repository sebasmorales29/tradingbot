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
    .limit(40);

  const { data: signals } = await supabase
    .from("signals")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: equityRows } = await supabase
    .from("equity_snapshots")
    .select("equity, recorded_at")
    .eq("user_id", userId)
    .order("recorded_at", { ascending: false })
    .limit(20);

  const { count: signalsTotal } = await supabase
    .from("signals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const equity = equityRows?.[0]?.equity ?? 10_000;
  const tradeList = trades ?? [];
  const openList = tradeList.filter((t) => t.status === "open");
  const closed = tradeList.filter((t) => t.status === "closed");
  const pnlTotal = closed.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0);
  const wins = closed.filter((t) => Number(t.pnl ?? 0) > 0).length;
  const winRate =
    closed.length > 0 ? Math.round((wins / closed.length) * 1000) / 10 : null;

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
      openTrades={openList.length}
      closedTrades={closed.length}
      pnlTotal={pnlTotal}
      winRate={winRate}
      signalsTotal={signalsTotal ?? 0}
      equityHistory={(equityRows ?? []).map((e) => ({
        equity: Number(e.equity),
        recorded_at: e.recorded_at,
      }))}
    />
  );
}
