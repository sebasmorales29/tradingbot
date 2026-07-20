import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionAccess } from "@/lib/auth/session";
import { isRole, type Role } from "@/lib/roles";

export async function GET() {
  const access = await getSessionAccess();
  if (!access?.can("admin_manage_roles")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("profiles")
    .select("id, email, role, created_at, updated_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users: data ?? [] });
}

export async function PATCH(request: Request) {
  const access = await getSessionAccess();
  if (!access?.can("admin_manage_roles")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { userId?: string; role?: string };
  if (!body.userId || !isRole(body.role)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  // No te quites el admin a ti mismo por accidente
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
