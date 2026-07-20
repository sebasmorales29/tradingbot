"use client";

import { StrategyEditor } from "@/components/admin/StrategyEditor";
import { useT } from "@/components/i18n/T";
import type { TrendPulseParams } from "@/lib/trading/strategy/trend-pulse";

export function AdminStrategyView({
  initial,
  canEdit,
}: {
  initial: TrendPulseParams;
  canEdit: boolean;
}) {
  const t = useT();
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-snow">
        {t.admin.strategyTitle}
      </h1>
      <p className="mt-2 text-snow/60">{t.admin.strategyLead}</p>
      <StrategyEditor initial={initial} canEdit={canEdit} />
    </div>
  );
}
