"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/T";
import type { AdminTelemetry } from "@/lib/admin-telemetry";

export function AdminActivityView({
  data,
  error,
}: {
  data?: AdminTelemetry;
  error: string | null;
}) {
  const t = useT();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-snow">
        {t.admin.activityTitle}
      </h1>
      <p className="mt-2 text-snow/60">{t.admin.activityLead}</p>

      {error && <p className="mt-6 text-sm text-red-300">{error}</p>}

      {data && (
        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-xl font-bold text-snow">
              {t.admin.signals}
            </h2>
            {!data.recentSignals.length ? (
              <p className="mt-4 text-sm text-snow/50">{t.admin.noneYet}</p>
            ) : (
              <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto text-sm">
                {data.recentSignals.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-lg border border-snow/10 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="text-pulse">{s.side}</span> {s.pair}
                        {s.price != null
                          ? ` @ ${Number(s.price).toFixed(2)}`
                          : ""}
                      </span>
                      <Link
                        href={`/admin/usuarios/${s.user_id}`}
                        className="text-xs text-snow/45 hover:text-pulse"
                      >
                        {t.admin.viewUser}
                      </Link>
                    </div>
                    <div className="text-xs text-snow/40">{s.reason}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-snow">
              {t.admin.trades}
            </h2>
            {!data.recentTrades.length ? (
              <p className="mt-4 text-sm text-snow/50">{t.admin.noneYetM}</p>
            ) : (
              <ul className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto text-sm">
                {data.recentTrades.map((tr) => (
                  <li
                    key={tr.id}
                    className="rounded-lg border border-snow/10 px-3 py-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {tr.pair} · {tr.status} · qty{" "}
                        {Number(tr.qty).toFixed(5)}
                        {tr.pnl != null
                          ? ` · pnl ${Number(tr.pnl).toFixed(2)}`
                          : ""}
                      </span>
                      <Link
                        href={`/admin/usuarios/${tr.user_id}`}
                        className="text-xs text-snow/45 hover:text-pulse"
                      >
                        {t.admin.viewUser}
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
