"use client";

import { OperatorLearningView } from "@/components/admin/operator/OperatorLearningView";
import { AdminOperatorShell } from "@/components/admin/views/AdminOperatorView";
import { useT } from "@/components/i18n/T";

export default function AdminOperatorLearningPage() {
  const t = useT();
  return (
    <AdminOperatorShell
      title={t.admin.operatorLearnNav}
      lead={t.admin.operatorChatLead}
    >
      <OperatorLearningView />
    </AdminOperatorShell>
  );
}
