"use client";

import { useOperatorBrain } from "@/components/admin/operator/OperatorBrainProvider";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-snow/10 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-snow/40">{label}</p>
      <p className="mt-1 text-sm font-semibold text-snow">{value}</p>
    </div>
  );
}

export function OperatorSummaryView() {
  const t = useT();
  const { locale } = useLanguage();
  const { data, loading, error } = useOperatorBrain();
  const dateLocale = locale === "en" ? "en-US" : "es-CR";

  if (loading && !data) {
    return <p className="text-sm text-snow/45">{t.admin.operatorLoading}</p>;
  }
  if (error && !data) {
    return <p className="text-sm text-red-300">{error}</p>;
  }
  if (!data) return null;

  const active = data.brain.isActive;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-pulse/20 bg-gradient-to-br from-slate/50 to-ink/70 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse">
          {t.admin.operatorBadge}
        </p>
        <h2 className="mt-1 font-display text-2xl font-bold text-snow">
          {data.brain.displayName}
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-snow/55">
          {t.admin.operatorSummaryLead}
        </p>
        <div className="mt-4 rounded-lg border border-snow/10 bg-ink/40 px-3 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-pulse">
            {t.admin.operatorNorthStarTitle}
          </p>
          <p className="mt-1 text-sm text-snow/70">{t.admin.operatorNorthStarBody}</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Stat
            label={t.admin.operatorStatus}
            value={active ? t.admin.operatorOn : t.admin.operatorOff}
          />
          <Stat label={t.admin.operatorModel} value={data.model.version} />
          <Stat
            label={t.admin.operatorTrained}
            value={
              data.brain.lastTrainedAt || data.model.trainedAt
                ? new Date(
                    data.brain.lastTrainedAt ?? data.model.trainedAt,
                  ).toLocaleString(dateLocale)
                : "—"
            }
          />
          <Stat
            label={t.admin.operatorUpdated}
            value={
              data.brain.updatedAt
                ? new Date(data.brain.updatedAt).toLocaleString(dateLocale)
                : "—"
            }
          />
          <Stat
            label={t.admin.operatorSamples}
            value={`${data.brain.trainSampleWins || "—"}W / ${data.brain.trainSampleLosses || "—"}L`}
          />
          <Stat
            label={t.admin.operatorKnowledgeCount}
            value={String(data.knowledgeCount ?? data.knowledge.length)}
          />
          <Stat
            label={t.admin.operatorLastResearch}
            value={
              data.brain.lastResearchAt
                ? new Date(data.brain.lastResearchAt).toLocaleString(dateLocale)
                : "—"
            }
          />
          <Stat
            label={t.admin.operatorResearchLearned}
            value={String(data.brain.researchItemsCount ?? 0)}
          />
        </div>
      </section>

      {data.researchRuns && data.researchRuns.length > 0 && (
        <section className="rounded-xl border border-snow/10 bg-slate/30 p-4">
          <p className="text-xs uppercase tracking-wide text-snow/40">
            {t.admin.operatorResearchHistory}
          </p>
          <ul className="mt-2 space-y-2 text-sm text-snow/65">
            {data.researchRuns.map((r) => (
              <li key={r.id} className="rounded-lg border border-snow/10 px-3 py-2">
                <p>
                  {new Date(r.started_at).toLocaleString(dateLocale)} ·{" "}
                  {r.triggered_by} · +{r.items_learned} / {r.items_seen}
                </p>
                {r.summary && (
                  <p className="mt-1 text-xs text-snow/45">{r.summary}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {data.calibration.length > 0 && (
        <section className="rounded-xl border border-snow/10 bg-slate/30 p-4">
          <p className="text-xs uppercase tracking-wide text-snow/40">
            {t.admin.operatorCalibration}
          </p>
          <ul className="mt-2 space-y-1 text-sm text-snow/65">
            {data.calibration.map((c) => (
              <li key={c.regime}>
                {c.regime}: {c.tradesCount} trades
                {c.winRate != null ? ` · ${c.winRate}%` : ""}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
