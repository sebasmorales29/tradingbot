import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionAccess } from "@/lib/auth/session";
import { getAdminUserDetail } from "@/lib/admin-users";
import { isRole, type Role } from "@/lib/roles";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const access = await getSessionAccess();
  if (
    !access?.can("admin_manage_users") &&
    !access?.can("admin_support_view") &&
    !access?.can("admin_manage_roles")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const user = await getAdminUserDetail(id);
    if (!user) {
      return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const access = await getSessionAccess();
  if (!access) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const canManage = access.can("admin_manage_users");
  const canRoles = access.can("admin_manage_roles");
  if (!canManage && !canRoles) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    full_name?: string;
    role?: string;
  };

  const patch: {
    full_name?: string | null;
    role?: Role;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };

  if (canManage && "full_name" in body) {
    patch.full_name = body.full_name?.trim() || null;
  }

  if (canRoles && body.role !== undefined) {
    if (!isRole(body.role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }
    if (id === access.user.id && body.role !== "admin") {
      return NextResponse.json(
        { error: "No puedes quitarte el rol admin a ti mismo" },
        { status: 400 },
      );
    }
    patch.role = body.role;
  }

  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update(patch).eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Perfil actualizado" });
}
