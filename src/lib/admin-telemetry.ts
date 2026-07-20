import { createAdminClient } from "@/lib/supabase/admin";
import { TREND_PULSE_META } from "@/lib/trading/strategy/trend-pulse";

export type AdminTelemetry = {
  users: number;
  activeBots: number;
  pausedBots: number;
  openTrades: number;
  closedTrades: number;
  signals24h: number;
  trades24h: number;
  totalPnlClosed: number;
  recentSignals: {
    id: string;
    user_id: string;
    pair: string;
    side: string;
    reason: string | null;
    price: number | null;
    created_at: string;
  }[];
  recentTrades: {
    id: string;
    user_id: string;
    pair: string;
    side: string;
    status: string;
    qty: number;
    entry_price: number;
    pnl: number | null;
    opened_at: string;
  }[];
  bots: {
    user_id: string;
    is_active: boolean;
    mode: string;
    risk_percent: number;
    pairs: string[];
    kill_switch: boolean;
    updated_at: string;
  }[];
  strategy: typeof TREND_PULSE_META;
  generatedAt: string;
};

function hoursAgoISO(h: number) {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

export async function loadAdminTelemetry(): Promise<AdminTelemetry> {
  const admin = createAdminClient();
  const since24h = hoursAgoISO(24);

  const [
    profiles,
    bots,
    openTrades,
    closedTrades,
    signals24h,
    trades24h,
    recentSignals,
    recentTrades,
    closedWithPnl,
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("bot_configs").select(
      "user_id, is_active, mode, risk_percent, pairs, kill_switch, updated_at",
    ),
    admin
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    admin
      .from("trades")
      .select("id", { count: "exact", head: true })
      .eq("status", "closed"),
    admin
      .from("signals")
      .select("id", { count: "exact", head: true })
      .gte("created_at", since24h),
    admin
      .from("trades")
      .select("id", { count: "exact", head: true })
      .gte("opened_at", since24h),
    admin
      .from("signals")
      .select("id, user_id, pair, side, reason, price, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
    admin
      .from("trades")
      .select(
        "id, user_id, pair, side, status, qty, entry_price, pnl, opened_at",
      )
      .order("opened_at", { ascending: false })
      .limit(20),
    admin.from("trades").select("pnl").eq("status", "closed"),
  ]);

  const botRows = bots.data ?? [];
  const activeBots = botRows.filter((b) => b.is_active).length;
  const totalPnlClosed = (closedWithPnl.data ?? []).reduce(
    (s, t) => s + Number(t.pnl ?? 0),
    0,
  );

  return {
    users: profiles.count ?? 0,
    activeBots,
    pausedBots: botRows.length - activeBots,
    openTrades: openTrades.count ?? 0,
    closedTrades: closedTrades.count ?? 0,
    signals24h: signals24h.count ?? 0,
    trades24h: trades24h.count ?? 0,
    totalPnlClosed,
    recentSignals: recentSignals.data ?? [],
    recentTrades: recentTrades.data ?? [],
    bots: botRows.map((b) => ({
      user_id: b.user_id,
      is_active: b.is_active,
      mode: b.mode,
      risk_percent: Number(b.risk_percent),
      pairs: b.pairs ?? [],
      kill_switch: b.kill_switch,
      updated_at: b.updated_at,
    })),
    strategy: TREND_PULSE_META,
    generatedAt: new Date().toISOString(),
  };
}
