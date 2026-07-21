import { notFound, redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { getAdminUserDetail } from "@/lib/admin-users";
import { AdminUserDetailView } from "@/components/admin/views/AdminUserDetailView";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getSessionAccess();
  if (!access) redirect(`/login?next=/admin/usuarios/${id}`);
  if (
    !access.can("admin_manage_users") &&
    !access.can("admin_support_view") &&
    !access.can("admin_manage_roles")
  ) {
    redirect("/admin");
  }

  let user;
  try {
    user = await getAdminUserDetail(id);
  } catch {
    user = null;
  }
  if (!user) notFound();

  return (
    <AdminUserDetailView
      user={user}
      canManage={access.can("admin_manage_users")}
      canRoles={access.can("admin_manage_roles")}
      isSelf={access.user.id === user.id}
    />
  );
}
