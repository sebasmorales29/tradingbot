"use client";

import { useT } from "@/components/i18n/T";
import { InfoCard } from "@/components/dashboard/views/OverviewView";
import type { DashboardBot } from "@/lib/dashboard-data";

export function BotConfigView({
  bot,
  signalsTotal,
}: {
  bot: DashboardBot | null;
  signalsTotal: number;
}) {
  const t = useT();

  if (!bot) {
    return (
      <div>
        <h1 className="font-display text-3xl font-bold text-snow">
          {t.dash.navBot}
        </h1>
        <p className="mt-4 text-sm text-snow/50">{t.dash.emptyText}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-snow">
        {t.dash.navBot}
      </h1>
      <p className="mt-2 text-sm text-snow/55">{t.dash.configLead}</p>
      <p className="mt-1 text-xs text-snow/40">{t.dash.transparency}</p>

      <dl className="mt-8 grid gap-3 text-sm sm:grid-cols-2">
        <InfoCard
          label={t.dash.status}
          value={bot.is_active ? t.dash.active : t.dash.paused}
          tone={bot.is_active ? "ok" : "warn"}
        />
        <InfoCard label={t.dash.mode} value={bot.mode} />
        <InfoCard label={t.dash.risk} value={`${bot.risk_percent}%`} />
        <InfoCard
          label={t.dash.killSwitch}
          value={bot.kill_switch ? t.dash.killOnLabel : t.dash.killOffLabel}
          tone={bot.kill_switch ? "warn" : undefined}
        />
        <InfoCard
          label={t.dash.pairs}
          value={(bot.pairs ?? []).join(", ") || "—"}
        />
        <InfoCard label={t.dash.signalsCount} value={String(signalsTotal)} />
        <InfoCard label={t.dash.botId} value={bot.id} mono />
        <InfoCard
          label={t.dash.updated}
          value={new Date(bot.updated_at).toLocaleString()}
        />
        <InfoCard
          label={t.dash.created}
          value={new Date(bot.created_at).toLocaleString()}
        />
      </dl>
    </div>
  );
}
