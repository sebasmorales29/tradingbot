import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { requireDashboardUser } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await requireDashboardUser();

  return (
    <DashboardShell
      email={access.user.email}
      showAdmin={access.can("admin_console")}
      role={access.role}
      canControlBot={access.can("bot_control")}
    >
      {children}
    </DashboardShell>
  );
}
