import { notFound, redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { getAdminBotDetail } from "@/lib/admin-bots";
import { AdminBotDetailView } from "@/components/admin/views/AdminBotDetailView";

export default async function AdminBotDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const access = await getSessionAccess();
  if (!access) redirect(`/login?next=/admin/bots/${userId}`);
  if (!access.can("admin_support_view") && !access.can("admin_telemetry")) {
    redirect("/admin");
  }

  let detail;
  try {
    detail = await getAdminBotDetail(userId);
  } catch {
    detail = null;
  }
  if (!detail) notFound();

  return (
    <AdminBotDetailView
      detail={detail}
      userId={userId}
      canEdit={access.can("admin_manage_users")}
    />
  );
}
