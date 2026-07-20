import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type DashboardBot = {
  id: string;
  is_active: boolean;
  mode: "paper" | "live";
  risk_percent: number;
  pairs: string[];
  kill_switch: boolean;
  created_at: string;
  updated_at: string;
};

export type DashboardTrade = {
  id: string;
  pair: string;
  side: "buy" | "sell";
  qty: number;
  entry_price: number;
  exit_price: number | null;
  stop_loss: number | null;
  take_profit: number | null;
  pnl: number | null;
  status: "open" | "closed";
  opened_at: string;
};

export type DashboardSignal = {
  id: string;
  pair: string;
  side: "long" | "flat";
  reason: string | null;
  price: number | null;
  created_at: string;
};

export type DashboardData = {
  bot: DashboardBot | null;
  trades: DashboardTrade[];
  signals: DashboardSignal[];
  equity: number;
  openTrades: number;
  closedTrades: number;
  pnlTotal: number;
  winRate: number | null;
  signalsTotal: number;
  equityHistory: { equity: number; recorded_at: string }[];
};

export async function loadDashboardData(userId: string): Promise<DashboardData> {
  const supabase = await createClient();

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

  const tradeList = (trades ?? []) as DashboardTrade[];
  const openList = tradeList.filter((t) => t.status === "open");
  const closed = tradeList.filter((t) => t.status === "closed");
  const pnlTotal = closed.reduce((sum, t) => sum + Number(t.pnl ?? 0), 0);
  const wins = closed.filter((t) => Number(t.pnl ?? 0) > 0).length;
  const winRate =
    closed.length > 0 ? Math.round((wins / closed.length) * 1000) / 10 : null;

  return {
    bot: bot as DashboardBot | null,
    trades: tradeList,
    signals: (signals ?? []) as DashboardSignal[],
    equity: Number(equityRows?.[0]?.equity ?? 10_000),
    openTrades: openList.length,
    closedTrades: closed.length,
    pnlTotal,
    winRate,
    signalsTotal: signalsTotal ?? 0,
    equityHistory: (equityRows ?? []).map((e) => ({
      equity: Number(e.equity),
      recorded_at: e.recorded_at,
    })),
  };
}

export async function requireDashboardUser() {
  const { getSessionAccess } = await import("@/lib/auth/session");
  const access = await getSessionAccess();
  if (!access) redirect("/login");
  if (access.status === "suspended") redirect("/login?error=suspended");
  return access;
}
