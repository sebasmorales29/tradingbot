import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { listAdminUsers, type AdminUserListItem } from "@/lib/admin-users";
import { AdminUsersView } from "@/components/admin/views/AdminUsersView";

export default async function AdminUsersPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin/usuarios");
  if (
    !access.can("admin_manage_users") &&
    !access.can("admin_support_view") &&
    !access.can("admin_manage_roles")
  ) {
    redirect("/admin");
  }

  let users: AdminUserListItem[] = [];
  let error: string | null = null;
  try {
    users = await listAdminUsers();
  } catch (e) {
    error = e instanceof Error ? e.message : "Error cargando usuarios";
  }

  return (
    <AdminUsersView
      users={users}
      error={error}
      canCreate={access.can("admin_manage_users")}
    />
  );
}
