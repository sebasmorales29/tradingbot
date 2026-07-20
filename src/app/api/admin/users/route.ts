import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionAccess } from "@/lib/auth/session";
import { isRole, type Role } from "@/lib/roles";
import { listAdminUsers } from "@/lib/admin-users";

export async function GET() {
  const access = await getSessionAccess();
  if (
    !access?.can("admin_manage_users") &&
    !access?.can("admin_support_view") &&
    !access?.can("admin_manage_roles")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const users = await listAdminUsers();
    return NextResponse.json({ users });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  // Legacy: body { userId, role } — prefer /api/admin/users/[id]
  const access = await getSessionAccess();
  if (!access?.can("admin_manage_roles")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { userId?: string; role?: string };
  if (!body.userId || !isRole(body.role)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  if (body.userId === access.user.id && body.role !== "admin") {
    return NextResponse.json(
      { error: "No puedes quitarte el rol admin a ti mismo" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("profiles")
    .update({
      role: body.role as Role,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
