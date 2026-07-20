import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { fetchOHLCV, fetchTickerPrice } from "./market";
import { atr, higherTimeframe } from "./indicators";
import { decideTrendPulse } from "./strategy/trend-pulse";
import { loadTrendPulseParams } from "./strategy/settings";
import { sizePosition } from "./risk";
import type { Pair } from "./types";

const DEFAULT_EQUITY = 10_000;
const MAX_DAILY_LOSS_PERCENT = 3;
const SLIPPAGE = 0.0005;

type Client = SupabaseClient<Database>;

export type TickResult = {
  ok: boolean;
  message: string;
  signals: number;
  tradesOpened: number;
  tradesClosed: number;
  equity: number;
};

function todayStartISO() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function runBotTick(
  supabase: Client,
  userId: string,
): Promise<TickResult> {
  const { data: bot, error: botErr } = await supabase
    .from("bot_configs")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (botErr || !bot) {
    return emptyFail("No hay configuración de bot");
  }

  let equity = await getEquity(supabase, userId, bot.mode);

  if (!bot.is_active) {
    return {
      ok: true,
      message: "Bot en pausa",
      signals: 0,
      tradesOpened: 0,
      tradesClosed: 0,
      equity,
    };
  }

  if (bot.kill_switch) {
    return {
      ok: true,
      message: "Kill-switch activo",
      signals: 0,
      tradesOpened: 0,
      tradesClosed: 0,
      equity,
    };
  }

  const pairs = (
    bot.pairs?.length ? bot.pairs : ["BTC/USDT", "ETH/USDT"]
  ) as Pair[];

  let signals = 0;
  let tradesOpened = 0;
  let tradesClosed = 0;

  const strategyParams = await loadTrendPulseParams();
  const htf = higherTimeframe(strategyParams.timeframe);

  const { data: openTrades } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", userId)
    .eq("status", "open");

  // 1) Manage open positions: stop / take-profit / trailing
  for (const trade of openTrades ?? []) {
    const pair = trade.pair as Pair;
    const price = await fetchTickerPrice(pair);
    const entry = Number(trade.entry_price);
    let stop =
      trade.stop_loss != null ? Number(trade.stop_loss) : entry * 0.985;
    const tp =
      trade.take_profit != null ? Number(trade.take_profit) : entry * 1.025;

    // Trailing: después de 1R, subir stop a breakeven; luego trail con ATR
    try {
      const candles = await fetchOHLCV(pair, strategyParams.timeframe, 80);
      const atrSeries = atr(candles, strategyParams.atrPeriod);
      const lastAtr = atrSeries[atrSeries.length - 1];
      if (lastAtr > 0) {
        const risk = entry - stop;
        const oneR = risk > 0 ? entry + risk : entry + lastAtr * strategyParams.stopAtr;
        if (price >= oneR) {
          const breakeven = entry * (1 + SLIPPAGE);
          const trail = price - strategyParams.stopAtr * lastAtr;
          const nextStop = Math.max(stop, breakeven, trail);
          if (nextStop > stop + lastAtr * 0.05) {
            stop = nextStop;
            await supabase
              .from("trades")
              .update({ stop_loss: stop })
              .eq("id", trade.id);
          }
        }
      }
    } catch {
      // trailing best-effort
    }

    let reason: string | null = null;
    if (price <= stop) reason = "Stop loss (protegido / trailing)";
    else if (price >= tp) reason = "Take profit";
    if (!reason) continue;

    const fill = price * (1 - SLIPPAGE);
    const pnl = (fill - entry) * Number(trade.qty);
    equity += pnl;

    await supabase
      .from("trades")
      .update({
        status: "closed",
        exit_price: fill,
        pnl,
        closed_at: new Date().toISOString(),
      })
      .eq("id", trade.id);

    await supabase.from("signals").insert({
      user_id: userId,
      pair,
      side: "flat",
      reason,
      price: fill,
    });

    tradesClosed += 1;
    signals += 1;
  }

  // 2) Strategy evaluation with HTF confluence
  for (const pair of pairs) {
    const candles = await fetchOHLCV(pair, strategyParams.timeframe, 150);
    const htfCandles =
      htf === strategyParams.timeframe
        ? undefined
        : await fetchOHLCV(pair, htf, 120);

    const { count } = await supabase
      .from("trades")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("pair", pair)
      .eq("status", "open");

    const hasOpenLong = (count ?? 0) > 0;
    const decision = decideTrendPulse(
      pair,
      candles,
      hasOpenLong,
      strategyParams,
      { htfCandles },
    );
    const signal = decision.signal;
    if (!signal) continue;

    signals += 1;
    await supabase.from("signals").insert({
      user_id: userId,
      pair: signal.pair,
      side: signal.side,
      reason: `${signal.reason} · score ${decision.score}`,
      price: signal.price,
    });

    if (signal.side === "flat" && hasOpenLong) {
      const { data: openTrade } = await supabase
        .from("trades")
        .select("*")
        .eq("user_id", userId)
        .eq("pair", pair)
        .eq("status", "open")
        .maybeSingle();

      if (openTrade) {
        const fill = signal.price * (1 - SLIPPAGE);
        const pnl =
          (fill - Number(openTrade.entry_price)) * Number(openTrade.qty);
        equity += pnl;
        await supabase
          .from("trades")
          .update({
            status: "closed",
            exit_price: fill,
            pnl,
            closed_at: new Date().toISOString(),
          })
          .eq("id", openTrade.id);
        tradesClosed += 1;
      }
      continue;
    }

    if (signal.side === "long" && !hasOpenLong && signal.stopLoss != null) {
      const dayPnl = await getDayPnl(supabase, userId);
      const sized = sizePosition({
        equity,
        riskPercent: Number(bot.risk_percent),
        maxDailyLossPercent: MAX_DAILY_LOSS_PERCENT,
        dayPnl,
        killSwitch: bot.kill_switch,
        price: signal.price,
        stopLoss: signal.stopLoss,
      });

      if (!sized.allowed) continue;

      const fill = signal.price * (1 + SLIPPAGE);
      await supabase.from("trades").insert({
        user_id: userId,
        pair,
        side: "buy",
        qty: sized.qty,
        entry_price: fill,
        mode: bot.mode,
        status: "open",
        stop_loss: signal.stopLoss,
        take_profit: signal.takeProfit ?? null,
      });
      tradesOpened += 1;
    }
  }

  await supabase.from("equity_snapshots").insert({
    user_id: userId,
    equity,
    mode: bot.mode,
  });

  return {
    ok: true,
    message: "Tick completado",
    signals,
    tradesOpened,
    tradesClosed,
    equity,
  };
}

function emptyFail(message: string): TickResult {
  return {
    ok: false,
    message,
    signals: 0,
    tradesOpened: 0,
    tradesClosed: 0,
    equity: DEFAULT_EQUITY,
  };
}

async function getEquity(
  supabase: Client,
  userId: string,
  mode: "paper" | "live",
): Promise<number> {
  const { data } = await supabase
    .from("equity_snapshots")
    .select("equity")
    .eq("user_id", userId)
    .eq("mode", mode)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.equity != null) return Number(data.equity);

  await supabase.from("equity_snapshots").insert({
    user_id: userId,
    equity: DEFAULT_EQUITY,
    mode,
  });
  return DEFAULT_EQUITY;
}

async function getDayPnl(supabase: Client, userId: string): Promise<number> {
  const { data } = await supabase
    .from("trades")
    .select("pnl")
    .eq("user_id", userId)
    .eq("status", "closed")
    .gte("closed_at", todayStartISO());

  return (data ?? []).reduce((s, t) => s + Number(t.pnl ?? 0), 0);
}
