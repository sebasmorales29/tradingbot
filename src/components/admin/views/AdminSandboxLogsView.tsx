"use client";

import { SandboxSessionLogs } from "@/components/admin/SandboxSessionLogs";
import { useSandboxSessionOptional } from "@/components/admin/SandboxSessionProvider";
import { useT } from "@/components/i18n/T";

export function AdminSandboxLogsView() {
  const t = useT();
  const sandbox = useSandboxSessionOptional();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-3xl font-bold text-snow">
        {t.admin.logsTitle}
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-snow/50">{t.admin.logsLead}</p>

      <SandboxSessionLogs
        activeState={sandbox?.state ?? null}
        activeMarket={sandbox?.market ?? null}
        activeTickMs={sandbox?.tickMs ?? 20_000}
        refreshKey={0}
        embedded={false}
      />
    </div>
  );
}
