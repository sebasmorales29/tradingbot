import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/roles";
import { displayName } from "@/lib/identity";

export type ProfileStatus = "active" | "suspended";

export type AdminUserListItem = {
  id: string;
  email: string | null;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
  display_name: string;
  role: Role;
  status: ProfileStatus;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  bot_active: boolean | null;
  bot_mode: string | null;
  open_trades: number;
  closed_trades: number;
  pnl_closed: number;
  equity: number | null;
};

export type AdminUserDetail = AdminUserListItem & {
  banned_until: string | null;
  factors_count: number;
  bot: {
    id: string;
    is_active: boolean;
    mode: string;
    risk_percent: number;
    pairs: string[];
    kill_switch: boolean;
    updated_at: string;
  } | null;
  trades: {
    id: string;
    pair: string;
    side: string;
    status: string;
    qty: number;
    entry_price: number;
    exit_price: number | null;
    pnl: number | null;
    opened_at: string;
  }[];
  signals: {
    id: string;
    pair: string;
    side: string;
    reason: string | null;
    price: number | null;
    created_at: string;
  }[];
  equity_history: { equity: number; recorded_at: string }[];
};

function asStatus(v: unknown): ProfileStatus {
  return v === "suspended" ? "suspended" : "active";
}

const PROFILE_COLS =
  "id, email, full_name, first_name, last_name, date_of_birth, role, status, created_at, updated_at";

export async function listAdminUsers(): Promise<AdminUserListItem[]> {
  const admin = createAdminClient();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select(PROFILE_COLS)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(error.message);

  const ids = (profiles ?? []).map((p) => p.id);
  if (!ids.length) return [];

  const [bots, trades, equityRows, authUsers] = await Promise.all([
    admin
      .from("bot_configs")
      .select("user_id, is_active, mode")
      .in("user_id", ids),
    admin.from("trades").select("user_id, status, pnl").in("user_id", ids),
    admin
      .from("equity_snapshots")
      .select("user_id, equity, recorded_at")
      .in("user_id", ids)
      .order("recorded_at", { ascending: false }),
    admin.auth.admin.listUsers({ page: 1, perPage: 200 }),
  ]);

  const botByUser = new Map(
    (bots.data ?? []).map((b) => [b.user_id, b] as const),
  );
  const authById = new Map(
    (authUsers.data?.users ?? []).map((u) => [u.id, u] as const),
  );

  const tradeStats = new Map<
    string,
    { open: number; closed: number; pnl: number }
  >();
  for (const t of trades.data ?? []) {
    const cur = tradeStats.get(t.user_id) ?? { open: 0, closed: 0, pnl: 0 };
    if (t.status === "open") cur.open += 1;
    else {
      cur.closed += 1;
      cur.pnl += Number(t.pnl ?? 0);
    }
    tradeStats.set(t.user_id, cur);
  }

  const equityByUser = new Map<string, number>();
  for (const row of equityRows.data ?? []) {
    if (!equityByUser.has(row.user_id)) {
      equityByUser.set(row.user_id, Number(row.equity));
    }
  }

  return (profiles ?? []).map((p) => {
    const bot = botByUser.get(p.id);
    const stats = tradeStats.get(p.id) ?? { open: 0, closed: 0, pnl: 0 };
    const auth = authById.get(p.id);
    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      first_name: p.first_name,
      last_name: p.last_name,
      date_of_birth: p.date_of_birth,
      display_name: displayName(p.first_name, p.last_name, p.full_name),
      role: p.role as Role,
      status: asStatus(p.status),
      created_at: p.created_at,
      updated_at: p.updated_at,
      last_sign_in_at: auth?.last_sign_in_at ?? null,
      email_confirmed_at: auth?.email_confirmed_at ?? null,
      bot_active: bot ? bot.is_active : null,
      bot_mode: bot?.mode ?? null,
      open_trades: stats.open,
      closed_trades: stats.closed,
      pnl_closed: stats.pnl,
      equity: equityByUser.get(p.id) ?? null,
    };
  });
}

export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select(PROFILE_COLS)
    .eq("id", userId)
    .maybeSingle();

  if (!profile) return null;

  const [botRes, tradesRes, signalsRes, equityRes, authRes] = await Promise.all(
    [
      admin.from("bot_configs").select("*").eq("user_id", userId).maybeSingle(),
      admin
        .from("trades")
        .select(
          "id, pair, side, status, qty, entry_price, exit_price, pnl, opened_at",
        )
        .eq("user_id", userId)
        .order("opened_at", { ascending: false })
        .limit(40),
      admin
        .from("signals")
        .select("id, pair, side, reason, price, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(20),
      admin
        .from("equity_snapshots")
        .select("equity, recorded_at")
        .eq("user_id", userId)
        .order("recorded_at", { ascending: false })
        .limit(30),
      admin.auth.admin.getUserById(userId),
    ],
  );

  let factorsCount = 0;
  try {
    const { data: factorsData } = await admin.auth.admin.mfa.listFactors({
      userId,
    });
    factorsCount = factorsData?.factors?.length ?? 0;
  } catch {
    factorsCount = 0;
  }

  const trades = tradesRes.data ?? [];
  const open = trades.filter((t) => t.status === "open").length;
  const closed = trades.filter((t) => t.status === "closed");
  const pnl = closed.reduce((s, t) => s + Number(t.pnl ?? 0), 0);
  const bot = botRes.data;
  const auth = authRes.data?.user;

  return {
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    first_name: profile.first_name,
    last_name: profile.last_name,
    date_of_birth: profile.date_of_birth,
    display_name: displayName(
      profile.first_name,
      profile.last_name,
      profile.full_name,
    ),
    role: profile.role as Role,
    status: asStatus(profile.status),
    created_at: profile.created_at,
    updated_at: profile.updated_at,
    last_sign_in_at: auth?.last_sign_in_at ?? null,
    email_confirmed_at: auth?.email_confirmed_at ?? null,
    banned_until: auth?.banned_until ?? null,
    factors_count: factorsCount,
    bot_active: bot ? bot.is_active : null,
    bot_mode: bot?.mode ?? null,
    open_trades: open,
    closed_trades: closed.length,
    pnl_closed: pnl,
    equity: equityRes.data?.[0] ? Number(equityRes.data[0].equity) : null,
    bot: bot
      ? {
          id: bot.id,
          is_active: bot.is_active,
          mode: bot.mode,
          risk_percent: Number(bot.risk_percent),
          pairs: bot.pairs ?? [],
          kill_switch: bot.kill_switch,
          updated_at: bot.updated_at,
        }
      : null,
    trades: trades.map((t) => ({
      id: t.id,
      pair: t.pair,
      side: t.side,
      status: t.status,
      qty: Number(t.qty),
      entry_price: Number(t.entry_price),
      exit_price: t.exit_price != null ? Number(t.exit_price) : null,
      pnl: t.pnl != null ? Number(t.pnl) : null,
      opened_at: t.opened_at,
    })),
    signals: (signalsRes.data ?? []).map((s) => ({
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
