import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runOperatorWebResearch } from "@/lib/trading/operator/research";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Investigación web periódica del Operador Keelra.
 * Entrena con teoría/métodos + tape de mercado.
 * Auth: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

async function handle(request: NextRequest) {
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
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const provided = bearer || headerSecret || querySecret;
  if (provided !== expected) {
    return NextResponse.json({ ok: false, message: "No autorizado" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const { data: brain } = await admin
      .from("operator_brain")
      .select("auto_research_enabled, is_active")
      .eq("id", "keelra")
      .maybeSingle();

    if (brain && brain.auto_research_enabled === false) {
      return NextResponse.json({
        ok: true,
        skipped: true,
        reason: "auto_research_disabled",
      });
    }

    const result = await runOperatorWebResearch(admin, {
      triggeredBy: "cron",
      maxLearn: 14,
      focus: "all",
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "research error";
    console.error("[cron/operator-research]", err);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
