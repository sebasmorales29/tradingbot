import { NextResponse } from "next/server";
import { getSessionAccess } from "@/lib/auth/session";
import { fetchOHLCV } from "@/lib/trading/market";
import { runSandbox, type SandboxConfig } from "@/lib/trading/sandbox";
import {
  DEFAULT_TREND_PULSE,
  type TrendPulseParams,
} from "@/lib/trading/strategy/trend-pulse";
import { loadTrendPulseParams, validateTrendPulseParams } from "@/lib/trading/strategy/settings";
import type { Pair } from "@/lib/trading/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAIRS: Pair[] = ["BTC/USDT", "ETH/USDT"];

function isPair(v: unknown): v is Pair {
  return typeof v === "string" && (PAIRS as string[]).includes(v);
}

export async function GET() {
  const access = await getSessionAccess();
  if (!access?.can("admin_sandbox")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const params = await loadTrendPulseParams();
  return NextResponse.json({
    defaults: {
      pair: "BTC/USDT" as Pair,
      startingEquity: 10_000,
      riskPercent: 0.75,
      timeframe: params.timeframe || "4h",
      limit: 180,
      params,
    },
    canEdit: access.can("admin_sandbox_edit"),
  });
}

export async function POST(request: Request) {
  const access = await getSessionAccess();
  if (!access?.can("admin_sandbox")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    pair?: string;
    startingEquity?: number;
    riskPercent?: number;
    timeframe?: string;
    limit?: number;
    params?: Partial<TrendPulseParams>;
  };

  if (!isPair(body.pair)) {
    return NextResponse.json({ error: "Par inválido" }, { status: 400 });
  }

  const startingEquity = Number(body.startingEquity ?? 10_000);
  const riskPercent = Number(body.riskPercent ?? 0.75);
  const limit = Math.min(Math.max(Number(body.limit ?? 180), 80), 500);
  const timeframe = body.timeframe || "4h";

  if (
    !Number.isFinite(startingEquity) ||
    startingEquity < 100 ||
    startingEquity > 1_000_000
  ) {
    return NextResponse.json(
      { error: "Equity de prueba inválida (100–1,000,000)" },
      { status: 400 },
    );
  }
  if (
    !Number.isFinite(riskPercent) ||
    riskPercent < 0.1 ||
    riskPercent > 5
  ) {
    return NextResponse.json(
      { error: "Riesgo inválido (0.1–5%)" },
      { status: 400 },
    );
  }

  let params: TrendPulseParams = await loadTrendPulseParams();
  if (access.can("admin_sandbox_edit") && body.params) {
    const validated = validateTrendPulseParams({
      ...params,
      ...body.params,
    });
    if (!validated.ok) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }
    params = validated.value;
  } else if (!access.can("admin_sandbox_edit") && body.params) {
    // analyst: ignore overrides, use live strategy settings
    params = await loadTrendPulseParams();
  }

  try {
    const candles = await fetchOHLCV(body.pair, timeframe, limit);
    const config: SandboxConfig = {
      pair: body.pair,
      startingEquity,
      riskPercent,
      params,
    };
    const result = runSandbox(candles, config);

    return NextResponse.json({
      ok: true,
      canEdit: access.can("admin_sandbox_edit"),
      config: {
        ...config,
        timeframe,
        limit,
        params: params ?? DEFAULT_TREND_PULSE,
      },
      result: {
        ...result,
        // shrink payload slightly for client charts
        candles: result.candles.map((c) => ({
          timestamp: c.timestamp,
          close: c.close,
          high: c.high,
          low: c.low,
        })),
      },
    });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Error en sandbox",
      },
      { status: 500 },
    );
  }
}
