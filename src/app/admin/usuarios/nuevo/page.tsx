import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { AdminCreateUserView } from "@/components/admin/views/AdminCreateUserView";

export default async function AdminCreateUserPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin/usuarios/nuevo");
  if (!access.can("admin_manage_users")) redirect("/admin/usuarios");

  return <AdminCreateUserView />;
}
