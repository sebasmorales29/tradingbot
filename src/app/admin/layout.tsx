import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { AppTopNav } from "@/components/AppTopNav";
import { AdminNav } from "@/components/admin/AdminNav";
import { SandboxSessionProvider } from "@/components/admin/SandboxSessionProvider";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin");
  if (!access.can("admin_console")) redirect("/dashboard");

  const canSandbox = access.can("admin_sandbox");

  return (
    <SandboxSessionProvider enabled={canSandbox}>
      <div className="flex min-h-[100svh] flex-col bg-ink">
        <AppTopNav
          email={access.user.email}
          showAdmin={access.can("admin_console")}
          role={access.role}
        />

        <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-6 py-6 md:flex-row md:px-8 md:py-8">
          <AdminNav
            canUsers={
              access.can("admin_manage_users") ||
              access.can("admin_support_view") ||
              access.can("admin_manage_roles")
            }
            canBots={
              access.can("admin_support_view") || access.can("admin_telemetry")
            }
            canActivity={access.can("admin_telemetry")}
            canStrategy={
              access.can("admin_analytics") || access.can("admin_edit_strategy")
            }
            canSandbox={canSandbox}
            canOperator={
              access.can("admin_edit_strategy") ||
              access.can("admin_analytics") ||
              access.role === "admin"
            }
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
        </div>
      </div>
    </SandboxSessionProvider>
  );
}
