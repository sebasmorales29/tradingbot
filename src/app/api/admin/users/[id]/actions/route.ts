import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionAccess } from "@/lib/auth/session";

type Ctx = { params: Promise<{ id: string }> };

const ACTIONS = [
  "reset_password",
  "reset_mfa",
  "suspend",
  "unsuspend",
  "delete",
] as const;
type Action = (typeof ACTIONS)[number];

function isAction(v: unknown): v is Action {
  return typeof v === "string" && (ACTIONS as readonly string[]).includes(v);
}

export async function POST(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const access = await getSessionAccess();
  if (!access?.can("admin_manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as { action?: string };
  if (!isAction(body.action)) {
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  }

  if (
    (body.action === "suspend" || body.action === "delete") &&
    id === access.user.id
  ) {
    return NextResponse.json(
      { error: "No puedes aplicar esta acción a tu propia cuenta" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  try {
    switch (body.action) {
      case "reset_password": {
        const { data: profile } = await admin
          .from("profiles")
          .select("email")
          .eq("id", id)
          .maybeSingle();
        const email = profile?.email;
        if (!email) {
          return NextResponse.json(
            { error: "Usuario sin email" },
            { status: 400 },
          );
        }
        const { error } = await admin.auth.resetPasswordForEmail(email, {
          redirectTo: `${siteUrl}/login`,
        });
        if (error) throw error;
        return NextResponse.json({
          ok: true,
          message: `Email de recuperación enviado a ${email}`,
        });
      }

      case "reset_mfa": {
        const { data, error } = await admin.auth.admin.mfa.listFactors({
          userId: id,
        });
        if (error) throw error;

        const factors = data?.factors ?? [];
        for (const f of factors) {
          const del = await admin.auth.admin.mfa.deleteFactor({
            id: f.id,
            userId: id,
          });
          if (del.error) throw del.error;
        }
        return NextResponse.json({
          ok: true,
          message:
            factors.length === 0
              ? "No había factores MFA"
              : `Se eliminaron ${factors.length} factor(es) MFA`,
        });
      }

      case "suspend": {
        const { error: banErr } = await admin.auth.admin.updateUserById(id, {
          ban_duration: "876000h",
        });
        if (banErr) throw banErr;
        const { error } = await admin
          .from("profiles")
          .update({
            status: "suspended",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (error) throw error;
        // Pausar bot
        await admin
          .from("bot_configs")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("user_id", id);
        return NextResponse.json({
          ok: true,
          message: "Cuenta suspendida y bot pausado",
        });
      }

      case "unsuspend": {
        const { error: banErr } = await admin.auth.admin.updateUserById(id, {
          ban_duration: "none",
        });
        if (banErr) throw banErr;
        const { error } = await admin
          .from("profiles")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
        if (error) throw error;
        return NextResponse.json({
          ok: true,
          message: "Cuenta reactivada",
        });
      }

      case "delete": {
        const { error } = await admin.auth.admin.deleteUser(id);
        if (error) throw error;
        return NextResponse.json({
          ok: true,
          message: "Cuenta eliminada",
          redirect: "/admin/usuarios",
        });
      }
    }
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

