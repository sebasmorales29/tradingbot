"use client";

import { OperatorBrainClient } from "@/components/admin/OperatorBrainClient";
import { useT } from "@/components/i18n/T";

export function AdminOperatorView() {
  const t = useT();
  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-snow">
        {t.admin.operatorTitle}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-snow/55">{t.admin.operatorPageLead}</p>
      <div className="mt-6">
        <OperatorBrainClient />
      </div>
    </div>
  );
}
