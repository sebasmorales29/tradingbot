import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSessionAccess } from "@/lib/auth/session";
import {
  loadTrendPulseParams,
  validateTrendPulseParams,
} from "@/lib/trading/strategy/settings";
import type { TrendPulseParams } from "@/lib/trading/strategy/trend-pulse";

export async function GET() {
  const access = await getSessionAccess();
  if (!access?.can("admin_analytics") && !access?.can("admin_edit_strategy")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const params = await loadTrendPulseParams();
  return NextResponse.json({ params });
}

export async function PUT(request: Request) {
  const access = await getSessionAccess();
  if (!access?.can("admin_edit_strategy")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as Partial<TrendPulseParams>;
  const validated = validateTrendPulseParams(body);
  if (!validated.ok) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  const v = validated.value;
  const admin = createAdminClient();
  const { error } = await admin.from("strategy_settings").upsert({
    id: "trend_pulse",
    name: v.name,
    timeframe: v.timeframe,
    fast: v.fast,
    slow: v.slow,
    atr_period: v.atrPeriod,
    stop_atr: v.stopAtr,
    tp_atr: v.tpAtr,
    min_atr_pct: v.minAtrPct,
    max_atr_pct: v.maxAtrPct,
    updated_at: new Date().toISOString(),
    updated_by: access.user.id,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, params: v });
}
