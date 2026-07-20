import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { loadTrendPulseParams } from "@/lib/trading/strategy/settings";
import { SandboxClient } from "@/components/admin/SandboxClient";
import type { Pair } from "@/lib/trading/types";

export default async function AdminSandboxPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin/sandbox");
  if (!access.can("admin_sandbox")) redirect("/admin");

  const params = await loadTrendPulseParams();

  return (
    <SandboxClient
      canEdit={access.can("admin_sandbox_edit")}
      initialDefaults={{
        pair: "BTC/USDT" as Pair,
        startingEquity: 10_000,
        riskPercent: 0.75,
        timeframe: "1h",
        params,
      }}
    />
  );
}
