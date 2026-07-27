"use client";

import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { OperatorStatus } from "@/lib/trading/operator/status";

function regimeLabel(
  regime: string | undefined,
  t: ReturnType<typeof useT>["dash"]["operator"],
): string {
  switch (regime) {
    case "trend_up":
      return t.regimeTrendUp;
    case "trend_down":
      return t.regimeTrendDown;
    case "range":
      return t.regimeRange;
    case "high_vol":
      return t.regimeHighVol;
    default:
      return t.regimeUnknown;
  }
}

export function OperatorStatusPanel({ status }: { status: OperatorStatus }) {
  const t = useT();
  const { locale } = useLanguage();
  const op = t.dash.operator;
  const meta = status.lastDecision?.meta;
  const dateLocale = locale === "en" ? "en-US" : "es-CR";

  return (
    <section className="mt-10 rounded-xl border border-snow/10 bg-slate/30 p-5 sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-pulse/80">
            {op.badge}
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-snow">
            {op.title}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-snow/55">{op.lead}</p>
        </div>
        <p className="text-xs text-snow/40">
          {op.modelLabel}: {status.model.version} ·{" "}
          {new Date(status.model.trainedAt).toLocaleDateString(dateLocale)}
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-snow/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-snow/40">
            {op.lastRegime}
          </p>
          <p className="mt-1 text-lg font-semibold text-snow">
            {regimeLabel(meta?.regime, op)}
          </p>
        </div>
        <div className="rounded-lg border border-snow/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-snow/40">
            {op.lastScore}
          </p>
          <p className="mt-1 text-lg font-semibold text-pulse">
            {meta?.modelScore != null
              ? `${meta.modelScore} / ${meta.minScore}`
              : "—"}
          </p>
        </div>
        <div className="rounded-lg border border-snow/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-snow/40">
            {op.calibratedTrades}
          </p>
          <p className="mt-1 text-lg font-semibold text-snow">
            {status.totalCalibratedTrades}
          </p>
        </div>
        <div className="rounded-lg border border-snow/10 px-4 py-3">
          <p className="text-xs uppercase tracking-wider text-snow/40">
            {op.buckets}
          </p>
          <p className="mt-1 text-lg font-semibold text-snow">
            {status.calibratedBuckets}
          </p>
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-snow/10 bg-ink/40 px-4 py-3">
        <p className="text-xs uppercase tracking-wider text-snow/40">
          {op.lastDecision}
        </p>
        {status.lastDecision ? (
          <>
            <p className="mt-2 text-sm text-snow/80">
              {status.lastDecision.pair} · {status.lastDecision.side}
              {meta?.blockedBy
                ? ` · ${op.blocked}: ${meta.blockedBy}`
                : ""}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-snow/55">
              {status.lastDecision.reason ?? op.noDecision}
            </p>
            <p className="mt-2 text-xs text-snow/35">
              {new Date(status.lastDecision.createdAt).toLocaleString(
                dateLocale,
              )}
            </p>
          </>
        ) : (
          <p className="mt-2 text-sm text-snow/45">{op.noDecision}</p>
        )}
      </div>

      {status.calibration.length > 0 && (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-wider text-snow/40">
            {op.calibrationTitle}
          </p>
          <ul className="mt-2 divide-y divide-snow/10 rounded-lg border border-snow/10">
            {status.calibration.map((row) => (
              <li
                key={`${row.pair}-${row.regime}`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm"
              >
                <span className="text-snow/80">
                  {regimeLabel(row.regime, op)}
                </span>
                <span className="text-snow/45">
                  {row.tradesCount} {op.trades} ·{" "}
                  {row.winRate != null
                    ? `${row.winRate}% ${op.winRate}`
                    : op.notEnoughData}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
