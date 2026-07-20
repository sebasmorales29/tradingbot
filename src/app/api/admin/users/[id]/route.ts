import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionAccess } from "@/lib/auth/session";
import { getAdminUserDetail } from "@/lib/admin-users";
import { isRole, type Role } from "@/lib/roles";
import { isAdult, parseDateOfBirth } from "@/lib/identity";

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
    first_name?: string;
    last_name?: string;
    date_of_birth?: string | null;
    role?: string;
  };

  const patch: {
    first_name?: string | null;
    last_name?: string | null;
    date_of_birth?: string | null;
    full_name?: string | null;
    role?: Role;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };

  if (canManage) {
    if ("first_name" in body) {
      patch.first_name = body.first_name?.trim() || null;
    }
    if ("last_name" in body) {
      patch.last_name = body.last_name?.trim() || null;
    }
    if ("date_of_birth" in body) {
      if (body.date_of_birth) {
        const dob = parseDateOfBirth(body.date_of_birth);
        if (!dob || !isAdult(dob)) {
          return NextResponse.json(
            { error: "Fecha de nacimiento inválida o menor de 18" },
            { status: 400 },
          );
        }
        patch.date_of_birth = body.date_of_birth;
      } else {
        patch.date_of_birth = null;
      }
    }
    if ("first_name" in body || "last_name" in body) {
      const fn =
        patch.first_name !== undefined
          ? patch.first_name
          : body.first_name?.trim() || null;
      const ln =
        patch.last_name !== undefined
          ? patch.last_name
          : body.last_name?.trim() || null;
      patch.full_name = [fn, ln].filter(Boolean).join(" ") || null;
    }
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
