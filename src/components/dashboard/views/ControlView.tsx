"use client";

import { useT } from "@/components/i18n/T";
import { UserBotDangerZone } from "@/components/dashboard/UserBotDangerZone";
import type { DashboardBot } from "@/lib/dashboard-data";

export function ControlView({ bot }: { bot: DashboardBot | null }) {
  const t = useT();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-snow">
        {t.dash.navControl}
      </h1>
      <p className="mt-2 max-w-xl text-sm text-snow/55">{t.dash.dangerLead}</p>

      {!bot ? (
        <p className="mt-8 text-sm text-snow/50">{t.dash.emptyText}</p>
      ) : (
        <div className="mt-2">
          <UserBotDangerZone
            botId={bot.id}
            isActive={bot.is_active}
            killSwitch={bot.kill_switch}
            riskPercent={Number(bot.risk_percent)}
            mode={bot.mode}
          />
        </div>
      )}
    </div>
  );
}
