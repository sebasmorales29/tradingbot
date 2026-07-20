"use client";

import { useT } from "@/components/i18n/T";
import type {
  DashboardBot,
  DashboardSignal,
  DashboardTrade,
} from "@/lib/dashboard-data";

export function ActivityView({
  bot,
  trades,
  signals,
  equityHistory,
}: {
  bot: DashboardBot | null;
  trades: DashboardTrade[];
  signals: DashboardSignal[];
  equityHistory: { equity: number; recorded_at: string }[];
}) {
  const t = useT();
  const openList = trades.filter((tr) => tr.status === "open");

  return (
    <div className="space-y-12">
      <div>
        <h1 className="font-display text-3xl font-bold text-snow">
          {t.dash.navActivity}
        </h1>
        <p className="mt-2 text-sm text-snow/55">
          {t.dash.pairs}: {(bot?.pairs ?? ["BTC/USDT", "ETH/USDT"]).join(" · ")}
        </p>
      </div>

      <section>
        <h2 className="font-display text-xl font-bold text-snow">
          {t.dash.openTradesTitle}
        </h2>
        {!openList.length ? (
          <p className="mt-4 text-sm text-snow/50">{t.dash.noOpenTrades}</p>
        ) : (
          <ul className="mt-4 space-y-2 text-sm">
            {openList.map((tr) => (
              <li
                key={tr.id}
                className="rounded-lg border border-snow/10 px-4 py-3"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-snow">
                    {tr.pair} · {tr.side.toUpperCase()} · qty{" "}
                    {Number(tr.qty).toFixed(6)}
                  </span>
                  <span className="text-snow/50">
                    entry {Number(tr.entry_price).toFixed(2)}
                  </span>
                </div>
                <p className="mt-1 text-xs text-snow/40">
                  {t.dash.stopLoss}{" "}
                  {tr.stop_loss != null
                    ? Number(tr.stop_loss).toFixed(2)
                    : "—"}{" "}
                  · {t.dash.takeProfit}{" "}
                  {tr.take_profit != null
                    ? Number(tr.take_profit).toFixed(2)
                    : "—"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-snow">
          {t.dash.lastSignals}
        </h2>
        {!signals.length ? (
          <p className="mt-4 text-sm text-snow/50">{t.dash.noSignals}</p>
        ) : (
          <ul className="mt-4 divide-y divide-snow/10 rounded-xl border border-snow/10">
            {signals.map((s) => (
              <li
                key={s.id}
                className="flex flex-col gap-1 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="text-snow">
                  <span className="text-pulse">{s.side.toUpperCase()}</span>
                  {" · "}
                  {s.pair}
                  {s.price != null ? ` @ ${Number(s.price).toFixed(2)}` : ""}
                </span>
                <span className="text-snow/45">{s.reason}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="font-display text-xl font-bold text-snow">
          {t.dash.lastTrades}
        </h2>
        {!trades.length ? (
          <div className="mt-4 rounded-xl border border-snow/10 bg-slate/30 px-5 py-10 text-center">
            <p className="font-display text-lg font-semibold text-snow">
              {t.dash.emptyTitle}
            </p>
            <p className="mx-auto mt-2 max-w-md text-sm text-snow/55">
              {t.dash.emptyText}
            </p>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-snow/10 rounded-xl border border-snow/10">
            {trades.map((trade) => (
              <li
                key={trade.id}
                className="flex items-center justify-between px-5 py-4 text-sm"
              >
                <span className="text-snow">
                  {trade.pair} · {trade.side.toUpperCase()} · qty{" "}
                  {Number(trade.qty).toFixed(6)}
                </span>
                <span className="text-snow/50">
                  {trade.status}
                  {trade.pnl != null
                    ? ` · ${Number(trade.pnl).toFixed(2)}`
                    : ` · entry ${Number(trade.entry_price).toFixed(2)}`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {equityHistory.length > 1 && (
        <section>
          <h2 className="font-display text-xl font-bold text-snow">Equity</h2>
          <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto text-sm text-snow/70">
            {equityHistory.map((e, i) => (
              <li
                key={`${e.recorded_at}-${i}`}
                className="flex justify-between border-b border-snow/5 py-2"
              >
                <span>
                  $
                  {e.equity.toLocaleString("en-US", {
                    maximumFractionDigits: 2,
                  })}
                </span>
                <span className="text-xs text-snow/40">
                  {new Date(e.recorded_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
