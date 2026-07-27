"use client";

import { OperatorBrainProvider } from "@/components/admin/operator/OperatorBrainProvider";
import { useT } from "@/components/i18n/T";

export function AdminOperatorShell({
  title,
  lead,
  children,
  compact,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <OperatorBrainProvider>
      <div className={compact ? "flex min-h-0 flex-col" : undefined}>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse/80">
          {t.admin.navOperator}
        </p>
        <h1
          className={`mt-1 font-display font-bold text-snow ${
            compact ? "text-2xl" : "text-3xl"
          }`}
        >
          {title}
        </h1>
        <p
          className={`mt-1 max-w-2xl text-snow/55 ${
            compact ? "text-xs" : "mt-2 text-sm"
          }`}
        >
          {lead}
        </p>
        <div className={compact ? "mt-3 min-h-0" : "mt-6"}>{children}</div>
      </div>
    </OperatorBrainProvider>
  );
}
