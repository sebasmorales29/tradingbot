import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { CreateUserForm } from "@/components/admin/CreateUserForm";

export default async function AdminCreateUserPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login?next=/admin/usuarios/nuevo");
  if (!access.can("admin_manage_users")) redirect("/admin/usuarios");

  return (
    <div>
      <Link
        href="/admin/usuarios"
        className="text-sm text-snow/50 transition hover:text-snow"
      >
        ← Usuarios
      </Link>
      <h1 className="mt-4 font-display text-3xl font-bold text-snow">
        Agregar usuario
      </h1>
      <p className="mt-2 text-snow/60">
        Crea una cuenta con nombre, fecha de nacimiento (18+), correo y
        contraseña temporal.
      </p>
      <CreateUserForm />
    </div>
  );
}
