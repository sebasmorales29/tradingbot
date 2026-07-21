import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { AdminSandboxLogsView } from "@/components/admin/views/AdminSandboxLogsView";

export default async function AdminSandboxLogsPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin/sandbox/logs");
  if (!access.can("admin_sandbox")) redirect("/admin");

  return <AdminSandboxLogsView />;
}
