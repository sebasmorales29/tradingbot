"use client";

import { AdminStat } from "@/components/admin/AdminStat";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import type { AdminTelemetry } from "@/lib/admin-telemetry";

export function AdminOverviewView({
  data,
  loadError,
}: {
  data?: AdminTelemetry;
  loadError?: string | null;
}) {
  const t = useT();
  const { locale } = useLanguage();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-snow">
        {t.admin.overviewTitle}
      </h1>
      <p className="mt-2 text-snow/60">{t.admin.overviewLead}</p>

      {loadError && (
        <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300">
          {loadError === "Error cargando resumen"
            ? t.admin.overviewLoadError
            : loadError}
        </p>
      )}

      {data ? (
        <>
          <p className="mt-4 text-xs text-snow/40">
            {t.admin.overviewUpdated}:{" "}
            {new Date(data.generatedAt).toLocaleString(
              locale === "en" ? "en-US" : "es-CR",
            )}
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AdminStat label={t.admin.users} value={String(data.users)} />
            <AdminStat
              label={t.admin.activeBots}
              value={String(data.activeBots)}
              accent
            />
            <AdminStat
              label={t.admin.pausedBots}
              value={String(data.pausedBots)}
            />
            <AdminStat
              label={t.admin.openTrades}
              value={String(data.openTrades)}
            />
            <AdminStat
              label={t.admin.closedTrades}
              value={String(data.closedTrades)}
            />
            <AdminStat
              label={t.admin.signals24h}
              value={String(data.signals24h)}
            />
            <AdminStat
              label={t.admin.trades24h}
              value={String(data.trades24h)}
            />
            <AdminStat
              label={t.admin.closedPnl}
              value={`${data.totalPnlClosed >= 0 ? "+" : ""}${data.totalPnlClosed.toFixed(2)}`}
              accent
            />
          </div>
        </>
      ) : (
        !loadError && (
          <p className="mt-8 text-sm text-snow/50">
            {t.admin.overviewNoTelemetry}
          </p>
        )
      )}
    </div>
  );
}
