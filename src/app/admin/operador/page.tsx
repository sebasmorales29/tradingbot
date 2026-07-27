"use client";

import { OperatorSummaryView } from "@/components/admin/operator/OperatorSummaryView";
import { AdminOperatorShell } from "@/components/admin/views/AdminOperatorView";
import { useT } from "@/components/i18n/T";

export default function AdminOperatorSummaryPage() {
  const t = useT();
  return (
    <AdminOperatorShell
      title={t.admin.operatorSummaryTitle}
      lead={t.admin.operatorPageLead}
    >
      <OperatorSummaryView />
    </AdminOperatorShell>
  );
}
