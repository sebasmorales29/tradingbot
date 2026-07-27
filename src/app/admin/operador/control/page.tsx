"use client";

import { OperatorControlView } from "@/components/admin/operator/OperatorControlView";
import { AdminOperatorShell } from "@/components/admin/views/AdminOperatorView";
import { useT } from "@/components/i18n/T";

export default function AdminOperatorControlPage() {
  const t = useT();
  return (
    <AdminOperatorShell
      title={t.admin.operatorControlNav}
      lead={t.admin.operatorControlLead}
    >
      <OperatorControlView />
    </AdminOperatorShell>
  );
}
