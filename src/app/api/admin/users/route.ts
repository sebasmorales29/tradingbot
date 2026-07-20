import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionAccess } from "@/lib/auth/session";
import { isRole, type Role } from "@/lib/roles";
import { listAdminUsers } from "@/lib/admin-users";
import { isAdult, parseDateOfBirth } from "@/lib/identity";

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

export async function POST(request: Request) {
  const access = await getSessionAccess();
  if (!access?.can("admin_manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    email?: string;
    password?: string;
    first_name?: string;
    last_name?: string;
    date_of_birth?: string;
    role?: string;
  };

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const firstName = body.first_name?.trim() ?? "";
  const lastName = body.last_name?.trim() ?? "";
  const role: Role = isRole(body.role) ? body.role : "user";

  if (!email || password.length < 6 || !firstName || !lastName) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const dob = body.date_of_birth
    ? parseDateOfBirth(body.date_of_birth)
    : null;
  if (!dob || !isAdult(dob)) {
    return NextResponse.json(
      { error: "Fecha de nacimiento inválida o menor de 18" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const fullName = `${firstName} ${lastName}`.trim();

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: body.date_of_birth,
      full_name: fullName,
    },
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "No se pudo crear" },
      { status: 500 },
    );
  }

  // Trigger creates profile; ensure fields + role
  const { error: profileErr } = await admin
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      date_of_birth: body.date_of_birth!,
      full_name: fullName,
      role,
      email,
      updated_at: new Date().toISOString(),
    })
    .eq("id", data.user.id);

  if (profileErr) {
    return NextResponse.json(
      { error: profileErr.message, id: data.user.id },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, id: data.user.id });
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
