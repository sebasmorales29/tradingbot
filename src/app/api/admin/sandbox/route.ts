import { NextResponse } from "next/server";
import { getSessionAccess } from "@/lib/auth/session";
import { localeFromCookieHeader } from "@/lib/i18n/strategy-copy";
import { higherTimeframe } from "@/lib/trading/indicators";
import { fetchOHLCV, fetchTickerPrice } from "@/lib/trading/market";
import {
  createLiveSession,
  liveSandboxTick,
  type LiveSandboxState,
} from "@/lib/trading/live-sandbox";
import {
  archiveSandboxSession,
  getSandboxSessionLog,
  listSandboxSessionLogs,
  loadSandboxSession,
  patchSandboxSession,
  runPersistedSandboxTick,
  saveSandboxSession,
  stopSandboxSession,
} from "@/lib/trading/sandbox-session";
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

export async function GET(request: Request) {
  const access = await getSessionAccess();
  if (!access?.can("admin_sandbox")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  localeFromCookieHeader(request.headers.get("cookie"));

  const url = new URL(request.url);
  const view = url.searchParams.get("view");
  const logId = url.searchParams.get("logId");

  if (view === "logs") {
    try {
      const logs = await listSandboxSessionLogs(access.user.id);
      return NextResponse.json({ logs });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Error listando logs" },
        { status: 500 },
      );
    }
  }

  if (logId) {
    try {
      const log = await getSandboxSessionLog(access.user.id, logId);
      if (!log) {
        return NextResponse.json({ error: "Log no encontrado" }, { status: 404 });
      }
      return NextResponse.json({ log });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Error cargando log" },
        { status: 500 },
      );
    }
  }

  const params = await loadTrendPulseParams();
  let active = null;
  try {
    active = await loadSandboxSession(access.user.id);
  } catch {
    active = null;
  }

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
    active: active
      ? {
          state: active.state,
          market: active.market,
          candles: active.candles,
          tickIntervalMs: active.tickIntervalMs,
          liveOn: active.liveOn,
          lastTickAt: active.lastTickAt,
        }
      : null,
  });
}

/**
 * POST actions:
 * - start | tick | stop | patch (liveOn / tickIntervalMs)
 */
export async function POST(request: Request) {
  const access = await getSessionAccess();
  if (!access?.can("admin_sandbox")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const localeFromCookie = localeFromCookieHeader(
    request.headers.get("cookie"),
  );

  const body = (await request.json()) as {
    action?: "start" | "tick" | "stop" | "patch";
    pair?: string;
    startingEquity?: number;
    riskPercent?: number;
    timeframe?: string;
    tickIntervalMs?: number;
    liveOn?: boolean;
    locale?: "es" | "en";
    params?: Partial<TrendPulseParams>;
    state?: LiveSandboxState;
  };

  const locale =
    body.locale === "en" || body.locale === "es"
      ? body.locale
      : localeFromCookie;

  try {
    if (body.action === "stop") {
      await stopSandboxSession(access.user.id);
      return NextResponse.json({ ok: true, active: null });
    }

    if (body.action === "patch") {
      const session = await patchSandboxSession(access.user.id, {
        liveOn: body.liveOn,
        tickIntervalMs: body.tickIntervalMs,
      });
      if (!session) {
        return NextResponse.json(
          { error: "No hay sesión activa" },
          { status: 404 },
        );
      }
      return NextResponse.json({
        ok: true,
        state: session.state,
        market: session.market,
        candles: session.candles,
        tickIntervalMs: session.tickIntervalMs,
        liveOn: session.liveOn,
      });
    }

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
      const tickIntervalMs = Math.min(
        300_000,
        Math.max(5_000, Number(body.tickIntervalMs ?? 20_000)),
      );

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

      // Si ya hay sesión activa, archivar antes de reemplazar
      const previous = await loadSandboxSession(access.user.id);
      if (previous) {
        try {
          await archiveSandboxSession(access.user.id, previous);
        } catch (e) {
          console.error("[sandbox-archive-on-start]", e);
        }
      }

      const state = createLiveSession({
        pair: body.pair,
        timeframe,
        startingEquity,
        riskPercent,
        params: { ...params, timeframe },
        locale,
      });

      const candles = await fetchOHLCV(body.pair, timeframe, 150);
      const htf = higherTimeframe(timeframe);
      const htfCandles =
        htf === timeframe
          ? undefined
          : await fetchOHLCV(body.pair, htf, 120);
      const ticker = await fetchTickerPrice(body.pair);
      const tick = liveSandboxTick(state, candles, ticker, htfCandles, locale);

      await saveSandboxSession({
        userId: access.user.id,
        state: tick.state,
        market: tick.market,
        candles: tick.candles,
        tickIntervalMs,
        liveOn: true,
        isActive: true,
      });

      return NextResponse.json({
        ok: true,
        mode: "live",
        canEdit: access.can("admin_sandbox_edit"),
        tickIntervalMs,
        liveOn: true,
        ...tick,
      });
    }

    if (body.action === "tick") {
      let riskPercent: number | undefined;
      let params: TrendPulseParams | undefined;
      if (access.can("admin_sandbox_edit")) {
        if (body.riskPercent != null) {
          const r = Number(body.riskPercent);
          if (r >= 0.1 && r <= 5) riskPercent = r;
        }
        if (body.params) {
          const existing =
            body.state?.params ??
            (await loadSandboxSession(access.user.id))?.state.params;
          if (existing) {
            const validated = validateTrendPulseParams({
              ...existing,
              ...body.params,
            });
            if (validated.ok) params = validated.value;
          }
        }
      }

      const tick = await runPersistedSandboxTick(access.user.id, {
        state: body.state,
        riskPercent,
        params,
        locale,
      });

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
