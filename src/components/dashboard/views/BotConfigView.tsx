"use client";

import { useT } from "@/components/i18n/T";
import { BotGuidedProfile } from "@/components/dashboard/BotGuidedProfile";
import type { DashboardBot } from "@/lib/dashboard-data";

export function BotConfigView({ bot }: { bot: DashboardBot | null }) {
  const t = useT();

  if (!bot) {
    return (
      <div>
        <h1 className="font-display text-3xl font-bold text-snow">
          {t.dash.navBotProfile}
        </h1>
        <p className="mt-4 text-sm text-snow/50">{t.dash.emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-snow">
          {t.dash.navBotProfile}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-snow/55">{t.dash.configLead}</p>
      </div>

      <BotGuidedProfile bot={bot} />
    </div>
  );
}
