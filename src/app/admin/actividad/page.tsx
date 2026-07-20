import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { loadAdminTelemetry } from "@/lib/admin-telemetry";
import { AdminActivityView } from "@/components/admin/views/AdminActivityView";

export default async function AdminActivityPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin/actividad");
  if (!access.can("admin_telemetry")) redirect("/admin");

  let data;
  let error: string | null = null;
  try {
    data = await loadAdminTelemetry();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error";
  }

  return <AdminActivityView data={data} error={error} />;
}
