import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionAccess } from "@/lib/auth/session";
import { getAdminBotDetail } from "@/lib/admin-bots";

type Ctx = { params: Promise<{ userId: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { userId } = await ctx.params;
  const access = await getSessionAccess();
  if (!access?.can("admin_support_view") && !access?.can("admin_telemetry")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const bot = await getAdminBotDetail(userId);
    if (!bot) {
      return NextResponse.json({ error: "Bot no encontrado" }, { status: 404 });
    }
    return NextResponse.json({ bot });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { userId } = await ctx.params;
  const access = await getSessionAccess();
  if (!access?.can("admin_manage_users") && !access?.can("admin_support_view")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Solo admin puede editar config; support solo mira
  if (!access.can("admin_manage_users")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    is_active?: boolean;
    kill_switch?: boolean;
    risk_percent?: number;
    mode?: "paper" | "live";
  };

  const patch: {
    is_active?: boolean;
    kill_switch?: boolean;
    risk_percent?: number;
    mode?: "paper" | "live";
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.is_active === "boolean") patch.is_active = body.is_active;
  if (typeof body.kill_switch === "boolean") patch.kill_switch = body.kill_switch;
  if (body.mode === "paper" || body.mode === "live") patch.mode = body.mode;
  if (typeof body.risk_percent === "number") {
    if (body.risk_percent < 0.1 || body.risk_percent > 5) {
      return NextResponse.json(
        { error: "Riesgo debe estar entre 0.1% y 5%" },
        { status: 400 },
      );
    }
    patch.risk_percent = body.risk_percent;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("bot_configs")
    .update(patch)
    .eq("user_id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, message: "Bot actualizado" });
}
