import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { loadAdminTelemetry } from "@/lib/admin-telemetry";
import { AdminOverviewView } from "@/components/admin/views/AdminOverviewView";

export default async function AdminOverviewPage() {
  const access = await getSessionAccess();
  if (!access?.can("admin_console")) redirect("/dashboard");

  let data;
  let loadError: string | null = null;
  try {
    if (access.can("admin_telemetry") || access.can("admin_analytics")) {
      data = await loadAdminTelemetry();
    }
  } catch (e) {
    loadError = e instanceof Error ? e.message : "Error cargando resumen";
  }

  return <AdminOverviewView data={data} loadError={loadError} />;
}
