import { NextResponse } from "next/server";
import { getSessionAccess } from "@/lib/auth/session";
import { higherTimeframe } from "@/lib/trading/indicators";
import { fetchOHLCV, fetchTickerPrice } from "@/lib/trading/market";
import {
  createLiveSession,
  liveSandboxTick,
  type LiveSandboxState,
} from "@/lib/trading/live-sandbox";
import {
  DEFAULT_TREND_PULSE,
  type TrendPulseParams,
} from "@/lib/trading/strategy/trend-pulse";
import {
  loadTrendPulseParams,
  validateTrendPulseParams,
} from "@/lib/trading/strategy/settings";
import type { Pair } from "@/lib/trading/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAIRS: Pair[] = ["BTC/USDT", "ETH/USDT"];
const TIMEFRAMES = ["15m", "1h", "4h"] as const;

function isPair(v: unknown): v is Pair {
  return typeof v === "string" && (PAIRS as string[]).includes(v);
}

async function resolveParams(
  access: NonNullable<Awaited<ReturnType<typeof getSessionAccess>>>,
  bodyParams?: Partial<TrendPulseParams>,
): Promise<TrendPulseParams> {
  let params = await loadTrendPulseParams();
  if (access.can("admin_sandbox_edit") && bodyParams) {
    const validated = validateTrendPulseParams({ ...params, ...bodyParams });
    if (!validated.ok) throw new Error(validated.error);
    params = validated.value;
  }
  return params;
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
      timeframe: "1h",
      params,
    },
    canEdit: access.can("admin_sandbox_edit"),
    timeframes: TIMEFRAMES,
  });
}

/**
 * POST actions:
 * - start: crea sesión en vivo
 * - tick: evalúa mercado real ahora con el estado paper enviado
 */
export async function POST(request: Request) {
  const access = await getSessionAccess();
  if (!access?.can("admin_sandbox")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    action?: "start" | "tick";
    pair?: string;
    startingEquity?: number;
    riskPercent?: number;
    timeframe?: string;
    params?: Partial<TrendPulseParams>;
    state?: LiveSandboxState;
  };

  try {
    if (body.action === "start") {
      if (!isPair(body.pair)) {
        return NextResponse.json({ error: "Par inválido" }, { status: 400 });
      }
      const startingEquity = Number(body.startingEquity ?? 10_000);
      const riskPercent = Number(body.riskPercent ?? 0.75);
      const timeframe = TIMEFRAMES.includes(
        body.timeframe as (typeof TIMEFRAMES)[number],
      )
        ? (body.timeframe as string)
        : "1h";

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

      const params = await resolveParams(access, body.params);
      const state = createLiveSession({
        pair: body.pair,
        timeframe,
        startingEquity,
        riskPercent,
        params: { ...params, timeframe },
      });

      const candles = await fetchOHLCV(body.pair, timeframe, 150);
      const htf = higherTimeframe(timeframe);
      const htfCandles =
        htf === timeframe
          ? undefined
          : await fetchOHLCV(body.pair, htf, 120);
      const ticker = await fetchTickerPrice(body.pair);
      const tick = liveSandboxTick(state, candles, ticker, htfCandles);

      return NextResponse.json({
        ok: true,
        mode: "live",
        canEdit: access.can("admin_sandbox_edit"),
        ...tick,
      });
    }

    if (body.action === "tick") {
      if (!body.state?.sessionId || !isPair(body.state.pair)) {
        return NextResponse.json(
          { error: "Estado de sesión inválido" },
          { status: 400 },
        );
      }

      // Si puede editar, permite actualizar params/riesgo en caliente
      const state: LiveSandboxState = {
        ...body.state,
        lastScore: body.state.lastScore ?? 0,
        lastChecks: body.state.lastChecks ?? [],
      };
      if (access.can("admin_sandbox_edit")) {
        if (body.riskPercent != null) {
          const r = Number(body.riskPercent);
          if (r >= 0.1 && r <= 5) state.riskPercent = r;
        }
        if (body.params) {
          const validated = validateTrendPulseParams({
            ...state.params,
            ...body.params,
          });
          if (validated.ok) state.params = validated.value;
        }
      }

      const candles = await fetchOHLCV(state.pair, state.timeframe, 150);
      const htf = higherTimeframe(state.timeframe);
      const htfCandles =
        htf === state.timeframe
          ? undefined
          : await fetchOHLCV(state.pair, htf, 120);
      const ticker = await fetchTickerPrice(state.pair);
      const tick = liveSandboxTick(state, candles, ticker, htfCandles);

      return NextResponse.json({
        ok: true,
        mode: "live",
        canEdit: access.can("admin_sandbox_edit"),
        ...tick,
      });
    }

    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      {
        error: e instanceof Error ? e.message : "Error en sandbox en vivo",
        defaults: DEFAULT_TREND_PULSE,
      },
      { status: 500 },
    );
  }
}
