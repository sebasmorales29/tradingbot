import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { isAdminEmail } from "@/lib/admin";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: bot } = await supabase
    .from("bot_configs")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: trades } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", user.id)
    .order("opened_at", { ascending: false })
    .limit(12);

  const { data: signals } = await supabase
    .from("signals")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(8);

  const { data: equityRows } = await supabase
    .from("equity_snapshots")
    .select("equity")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false })
    .limit(1);

  const equity = equityRows?.[0]?.equity ?? 10_000;
  const tradeList = trades ?? [];
  const openTrades = tradeList.filter((t) => t.status === "open").length;
  const closed = tradeList.filter((t) => t.status === "closed");
  const pnlTotal = closed.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0);

  return (
    <DashboardClient
      email={user.email}
      showAdmin={isAdminEmail(user.email)}
      bot={bot}
      trades={tradeList}
      signals={signals ?? []}
      equity={Number(equity)}
      openTrades={openTrades}
      pnlTotal={pnlTotal}
    />
  );
}
