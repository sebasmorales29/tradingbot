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
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300/80">
        {t.admin.strategyBadge}
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold text-snow">
        {t.admin.strategyTitle}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-snow/60">
        {t.admin.strategyLead}
      </p>
      <StrategyEditor initial={initial} canEdit={canEdit} />
    </div>
  );
}
