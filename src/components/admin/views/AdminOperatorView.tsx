"use client";

import { OperatorBrainProvider } from "@/components/admin/operator/OperatorBrainProvider";
import { useT } from "@/components/i18n/T";

export function AdminOperatorShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  const t = useT();
  return (
    <OperatorBrainProvider>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse/80">
          {t.admin.navOperator}
        </p>
        <h1 className="mt-1 font-display text-3xl font-bold text-snow">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-snow/55">{lead}</p>
        <div className="mt-6">{children}</div>
      </div>
    </OperatorBrainProvider>
  );
}
