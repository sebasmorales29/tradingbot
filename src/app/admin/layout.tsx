import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { roleLabel } from "@/lib/roles";
import { SignOutButton } from "@/components/dashboard/SignOutButton";
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
      <div className="min-h-[100svh] bg-ink">
        <header className="border-b border-snow/10">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 md:px-8">
            <div className="flex items-center gap-4">
              <Link href="/" className="font-display text-lg font-bold text-snow">
                Pulse<span className="text-pulse">Trade</span>
              </Link>
              <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-amber-300">
                {roleLabel(access.role)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-9 items-center rounded-lg border border-pulse/50 bg-pulse/15 px-3.5 text-sm font-semibold text-pulse transition hover:bg-pulse/25 hover:text-snow"
              >
                Ir al panel
              </Link>
              <span className="hidden max-w-[160px] truncate text-sm text-snow/40 md:inline">
                {access.user.email}
              </span>
              <SignOutButton />
            </div>
          </div>
        </header>

        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 md:flex-row md:px-8">
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
          />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </SandboxSessionProvider>
  );
}
