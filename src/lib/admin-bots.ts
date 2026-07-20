import { createAdminClient } from "@/lib/supabase/admin";
import { displayName } from "@/lib/identity";

export type AdminBotDetail = {
  user_id: string;
  email: string | null;
  display_name: string;
  bot: {
    id: string;
    is_active: boolean;
    mode: "paper" | "live";
    risk_percent: number;
    pairs: string[];
    kill_switch: boolean;
    created_at: string;
    updated_at: string;
  };
  metrics: {
    equity: number | null;
    open_trades: number;
    closed_trades: number;
    pnl_closed: number;
    win_rate: number | null;
    signals_total: number;
    signals_24h: number;
    avg_pnl: number | null;
  };
  open_trades: {
    id: string;
    pair: string;
    side: string;
    qty: number;
    entry_price: number;
    stop_loss: number | null;
    take_profit: number | null;
    opened_at: string;
  }[];
  recent_trades: {
    id: string;
    pair: string;
    side: string;
    status: string;
    qty: number;
    entry_price: number;
    exit_price: number | null;
    pnl: number | null;
    opened_at: string;
    closed_at: string | null;
  }[];
  recent_signals: {
    id: string;
    pair: string;
    side: string;
    reason: string | null;
    price: number | null;
    created_at: string;
  }[];
  equity_history: { equity: number; recorded_at: string }[];
};

export async function getAdminBotDetail(
  userId: string,
): Promise<AdminBotDetail | null> {
  const admin = createAdminClient();

  const [{ data: bot }, { data: profile }] = await Promise.all([
    admin.from("bot_configs").select("*").eq("user_id", userId).maybeSingle(),
    admin
      .from("profiles")
      .select("id, email, first_name, last_name, full_name")
      .eq("id", userId)
      .maybeSingle(),
  ]);

  if (!bot) return null;

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [tradesRes, signalsRes, signals24h, equityRes] = await Promise.all([
    admin
      .from("trades")
      .select(
        "id, pair, side, status, qty, entry_price, exit_price, stop_loss, take_profit, pnl, opened_at, closed_at",
      )
      .eq("user_id", userId)
      .order("opened_at", { ascending: false })
      .limit(50),
    admin
      .from("signals")
      .select("id, pair, side, reason, price, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(25),
    admin
      .from("signals")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since24h),
    admin
      .from("equity_snapshots")
      .select("equity, recorded_at")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: false })
      .limit(40),
  ]);

  const trades = tradesRes.data ?? [];
  const open = trades.filter((t) => t.status === "open");
  const closed = trades.filter((t) => t.status === "closed");
  const pnlClosed = closed.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
  const wins = closed.filter((t) => Number(t.pnl ?? 0) > 0).length;
  const winRate =
    closed.length > 0 ? Math.round((wins / closed.length) * 1000) / 10 : null;
  const avgPnl =
    closed.length > 0
      ? Math.round((pnlClosed / closed.length) * 100) / 100
      : null;

  const { count: signalsTotal } = await admin
    .from("signals")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  return {
    user_id: userId,
    email: profile?.email ?? null,
    display_name: displayName(
      profile?.first_name,
      profile?.last_name,
      profile?.full_name ?? profile?.email,
    ),
    bot: {
      id: bot.id,
      is_active: bot.is_active,
      mode: bot.mode,
      risk_percent: Number(bot.risk_percent),
      pairs: bot.pairs ?? [],
      kill_switch: bot.kill_switch,
      created_at: bot.created_at,
      updated_at: bot.updated_at,
    },
    metrics: {
      equity: equityRes.data?.[0]
        ? Number(equityRes.data[0].equity)
        : null,
      open_trades: open.length,
      closed_trades: closed.length,
      pnl_closed: pnlClosed,
      win_rate: winRate,
      signals_total: signalsTotal ?? 0,
      signals_24h: signals24h.count ?? 0,
      avg_pnl: avgPnl,
    },
    open_trades: open.map((t) => ({
      id: t.id,
      pair: t.pair,
      side: t.side,
      qty: Number(t.qty),
      entry_price: Number(t.entry_price),
      stop_loss: t.stop_loss != null ? Number(t.stop_loss) : null,
      take_profit: t.take_profit != null ? Number(t.take_profit) : null,
      opened_at: t.opened_at,
    })),
    recent_trades: trades.slice(0, 20).map((t) => ({
      id: t.id,
      pair: t.pair,
      side: t.side,
      status: t.status,
      qty: Number(t.qty),
      entry_price: Number(t.entry_price),
      exit_price: t.exit_price != null ? Number(t.exit_price) : null,
      pnl: t.pnl != null ? Number(t.pnl) : null,
      opened_at: t.opened_at,
      closed_at: t.closed_at,
    })),
    recent_signals: (signalsRes.data ?? []).map((s) => ({
      id: s.id,
      pair: s.pair,
      side: s.side,
      reason: s.reason,
      price: s.price != null ? Number(s.price) : null,
      created_at: s.created_at,
    })),
    equity_history: (equityRes.data ?? []).map((e) => ({
      equity: Number(e.equity),
      recorded_at: e.recorded_at,
    })),
  };
}
