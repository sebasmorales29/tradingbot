import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runBotTick } from "@/lib/trading/engine";
import { tickDueSandboxSessions } from "@/lib/trading/sandbox-session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Cron 24/7: escanea todos los bots activos.
 * Auth: Authorization: Bearer <CRON_SECRET>
 * o header x-cron-secret / ?secret=
 */
export async function GET(request: NextRequest) {
  return handleCron(request);
}

export async function POST(request: NextRequest) {
  return handleCron(request);
}

async function handleCron(request: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      { ok: false, message: "CRON_SECRET no configurado" },
      { status: 500 },
    );
  }

  const auth = request.headers.get("authorization");
  const headerSecret = request.headers.get("x-cron-secret");
  const querySecret = request.nextUrl.searchParams.get("secret");
  const bearer =
    auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = bearer || headerSecret || querySecret;

  // Vercel Cron envía Authorization: Bearer <CRON_SECRET> si está configurado
  if (provided !== expected) {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: bots, error } = await admin
      .from("bot_configs")
      .select("user_id, is_active")
      .eq("is_active", true);

    if (error) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: 500 },
      );
    }

    const results = [];
    for (const bot of bots ?? []) {
      const tick = await runBotTick(admin, bot.user_id);
      results.push({ userId: bot.user_id, ...tick });
    }

    const sandbox = await tickDueSandboxSessions();

    return NextResponse.json({
      ok: true,
      processed: results.length,
      sandboxProcessed: sandbox.length,
      at: new Date().toISOString(),
      results,
      sandbox,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error en cron";
    console.error("[cron/tick]", err);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
