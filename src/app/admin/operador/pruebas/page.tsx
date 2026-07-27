"use client";

import { OperatorTestsView } from "@/components/admin/operator/OperatorTestsView";
import { AdminOperatorShell } from "@/components/admin/views/AdminOperatorView";
import { useT } from "@/components/i18n/T";

export default function AdminOperatorTestsPage() {
  const t = useT();
  return (
    <AdminOperatorShell
      title={t.admin.operatorTestNav}
      lead={t.admin.operatorTestLead}
      compact
    >
      <OperatorTestsView />
    </AdminOperatorShell>
  );
}
