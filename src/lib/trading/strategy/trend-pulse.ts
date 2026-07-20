import {
  atr,
  atrPercent,
  ema,
  higherTimeframe,
  rsi,
  seriesSlope,
  volumeSma,
} from "../indicators";
import type { Candle, Pair, StrategySignal } from "../types";

export type TrendPulseParams = {
  name: string;
  timeframe: string;
  fast: number;
  slow: number;
  atrPeriod: number;
  stopAtr: number;
  tpAtr: number;
  minAtrPct: number;
  maxAtrPct: number;
};

export const DEFAULT_TREND_PULSE: TrendPulseParams = {
  name: "Trend Pulse",
  timeframe: "4h",
  fast: 20,
  slow: 50,
  atrPeriod: 14,
  stopAtr: 1.5,
  tpAtr: 2.5,
  minAtrPct: 0.25,
  maxAtrPct: 8,
};

/**
 * Umbrales de calidad — firmes, pero realistas en crypto.
 * En TF cortos el ATR% natural es más bajo; el volumen se mide en la
 * última vela CERRADA (la vela en curso casi siempre va "floja").
 */
const EXPERT = {
  rsiMin: 40,
  rsiMax: 72,
  rsiExitExhaustion: 80,
  volumeMult: 1.05,
  maxExtensionAtr: 1.6,
  minSlowSlopePct: 0.008,
  pullbackEntryMaxAtr: 1.0,
  candleCloseStrength: 0.45,
} as const;

/** Escala el mínimo de ATR% según timeframe (15m suele vivir bajo 0.4). */
function effectiveMinAtrPct(timeframe: string, configuredMin: number): number {
  const scale: Record<string, number> = {
    "15m": 0.5,
    "1h": 0.7,
    "4h": 1,
    "1d": 1.15,
  };
  return configuredMin * (scale[timeframe] ?? 1);
}

export type DecisionCheck = {
  id: string;
  label: string;
  pass: boolean;
  detail: string;
};

export type TrendPulseDecision = {
  signal: StrategySignal | null;
  verdict: "enter" | "exit" | "hold" | "skip";
  score: number;
  checks: DecisionCheck[];
  summary: string;
};

export type TrendPulseContext = {
  /** Velas del timeframe superior para sesgo de tendencia */
  htfCandles?: Candle[];
};

function scoreFromChecks(checks: DecisionCheck[]): number {
  if (!checks.length) return 0;
  const passed = checks.filter((c) => c.pass).length;
  return Math.round((passed / checks.length) * 100);
}

/**
 * Trend Pulse Pro — long-only con checklist de calidad:
 * cruce EMA + régimen ATR + RSI sano + volumen + pendiente +
 * no perseguir + sesgo HTF + vela de confirmación.
 * Sale en cruce bajista, agotamiento RSI o ruptura de estructura.
 */
export function decideTrendPulse(
  pair: Pair,
  candles: Candle[],
  hasOpenLong: boolean,
  params: TrendPulseParams = DEFAULT_TREND_PULSE,
  ctx: TrendPulseContext = {},
): TrendPulseDecision {
  const {
    fast: FAST,
    slow: SLOW,
    atrPeriod: ATR_PERIOD,
    stopAtr: STOP_ATR,
    tpAtr: TP_ATR,
    minAtrPct: MIN_ATR_PCT,
    maxAtrPct: MAX_ATR_PCT,
  } = params;

  const checks: DecisionCheck[] = [];

  if (candles.length < SLOW + 10) {
    return {
      signal: null,
      verdict: "hold",
      score: 0,
      checks: [
        {
          id: "data",
          label: "Datos",
          pass: false,
          detail: "Insuficientes velas para evaluar",
        },
      ],
      summary: "Esperando más datos de mercado",
    };
  }

  const closes = candles.map((c) => c.close);
  const fastSeries = ema(closes, FAST);
  const slowSeries = ema(closes, SLOW);
  const atrSeries = atr(candles, ATR_PERIOD);
  const atrPct = atrPercent(candles, ATR_PERIOD);
  const rsiSeries = rsi(closes, 14);
  const volSma = volumeSma(candles, 20);

  if (
    fastSeries.length < 3 ||
    slowSeries.length < 3 ||
    !atrSeries.length ||
    !rsiSeries.length
  ) {
    return {
      signal: null,
      verdict: "hold",
      score: 0,
      checks: [
        {
          id: "indicators",
          label: "Indicadores",
          pass: false,
          detail: "Indicadores aún no listos",
        },
      ],
      summary: "Calentando indicadores",
    };
  }

  const last = candles[candles.length - 1];
  const price = last.close;
  const fast = fastSeries[fastSeries.length - 1];
  const slow = slowSeries[slowSeries.length - 1];
  const prevFast = fastSeries[fastSeries.length - 2];
  const prevSlow = slowSeries[slowSeries.length - 2];
  const lastAtr = atrSeries[atrSeries.length - 1];
  const lastRsi = rsiSeries[rsiSeries.length - 1];
  const prevRsi = rsiSeries[rsiSeries.length - 2] ?? lastRsi;
  const lastVol = last.volume;
  const lastVolSma = volSma.length ? volSma[volSma.length - 1] : 0;
  const slowSlope = seriesSlope(slowSeries, 5);
  const slowSlopePct =
    slowSlope != null && price > 0 ? (slowSlope / price) * 100 : null;
  const extensionAtr = lastAtr > 0 ? (price - fast) / lastAtr : 99;

  const bullishCross = prevFast <= prevSlow && fast > slow;
  const bearishCross = prevFast >= prevSlow && fast < slow;
  const alignedBull = fast > slow && price > slow;
  const pullbackToFast =
    alignedBull &&
    last.low <= fast * 1.002 &&
    price >= fast &&
    extensionAtr <= EXPERT.pullbackEntryMaxAtr;

  // —— Gestión de posición abierta ——
  if (hasOpenLong) {
    const structureBreak = price < slow && last.close < last.open;
    const rsiExhaust =
      lastRsi >= EXPERT.rsiExitExhaustion && lastRsi < prevRsi;

    if (bearishCross) {
      return {
        signal: {
          pair,
          side: "flat",
          price,
          reason: "Salida experta — cruce EMA bajista (fin de impulso)",
          atr: lastAtr,
          strength: atrPct ?? undefined,
        },
        verdict: "exit",
        score: 100,
        checks: [
          {
            id: "bearish_cross",
            label: "Cruce bajista",
            pass: true,
            detail: "EMA fast cruzó bajo slow",
          },
        ],
        summary: "Cerrar long: momentum se giró",
      };
    }

    if (structureBreak) {
      return {
        signal: {
          pair,
          side: "flat",
          price,
          reason: "Salida experta — ruptura bajo EMA lenta + vela bajista",
          atr: lastAtr,
          strength: atrPct ?? undefined,
        },
        verdict: "exit",
        score: 90,
        checks: [
          {
            id: "structure",
            label: "Estructura",
            pass: true,
            detail: "Precio perdió la EMA lenta con cierre rojo",
          },
        ],
        summary: "Cerrar long: estructura rota",
      };
    }

    if (rsiExhaust) {
      return {
        signal: {
          pair,
          side: "flat",
          price,
          reason: `Salida experta — RSI agotado (${lastRsi.toFixed(0)}) y bajando`,
          atr: lastAtr,
          strength: atrPct ?? undefined,
        },
        verdict: "exit",
        score: 85,
        checks: [
          {
            id: "rsi_exit",
            label: "Agotamiento",
            pass: true,
            detail: `RSI ${lastRsi.toFixed(1)} en zona de distribución`,
          },
        ],
        summary: "Cerrar long: toma de ganancias por agotamiento",
      };
    }

    return {
      signal: null,
      verdict: "hold",
      score: 70,
      checks: [
        {
          id: "trend_intact",
          label: "Tendencia",
          pass: price > slow,
          detail:
            price > slow
              ? "Estructura alcista intacta — dejar correr"
              : "Cerca de EMA lenta — vigilando",
        },
        {
          id: "rsi_hold",
          label: "RSI",
          pass: lastRsi < EXPERT.rsiExitExhaustion,
          detail: `RSI ${lastRsi.toFixed(1)}`,
        },
      ],
      summary: "Posición abierta — sin señal de salida",
    };
  }

  // —— Checklist de entrada ——
  const entryTrigger = bullishCross || pullbackToFast;

  checks.push({
    id: "trigger",
    label: "Disparador",
    pass: entryTrigger,
    detail: bullishCross
      ? "Cruce EMA alcista fresco"
      : pullbackToFast
        ? "Pullback a EMA rápida en tendencia"
        : "Sin cruce ni pullback de calidad",
  });

  checks.push({
    id: "above_slow",
    label: "Sobre EMA lenta",
    pass: price > slow,
    detail:
      price > slow
        ? "Precio por encima de la media lenta"
        : "Precio bajo EMA lenta — sesgo bajista/neutral",
  });

  const minAtrEffective = effectiveMinAtrPct(params.timeframe, MIN_ATR_PCT);
  const regimeOk =
    atrPct != null && atrPct >= minAtrEffective && atrPct <= MAX_ATR_PCT;
  checks.push({
    id: "atr_regime",
    label: "Régimen volatilidad",
    pass: regimeOk,
    detail:
      atrPct == null
        ? "ATR% no disponible"
        : regimeOk
          ? `ATR% ${atrPct.toFixed(2)} — rango operable (≥${minAtrEffective.toFixed(2)} en ${params.timeframe})`
          : `ATR% ${atrPct.toFixed(2)} fuera de ${minAtrEffective.toFixed(2)}–${MAX_ATR_PCT} (${params.timeframe})`,
  });

  const rsiOk = lastRsi >= EXPERT.rsiMin && lastRsi <= EXPERT.rsiMax;
  checks.push({
    id: "rsi",
    label: "RSI sano",
    pass: rsiOk,
    detail: rsiOk
      ? `RSI ${lastRsi.toFixed(1)} — momentum sin agotar`
      : `RSI ${lastRsi.toFixed(1)} — ${lastRsi > EXPERT.rsiMax ? "sobrecompra / chase" : "demasiado débil"}`,
  });

  // Volumen de la última vela CERRADA (la en curso suele ir incompleta en live)
  const closedIdx = candles.length >= 2 ? candles.length - 2 : candles.length - 1;
  const closedVol = candles[closedIdx].volume;
  const volBasis = candles.slice(0, closedIdx + 1);
  const volSmaClosed = volumeSma(volBasis, 20);
  const closedVolSma = volSmaClosed.length
    ? volSmaClosed[volSmaClosed.length - 1]
    : lastVolSma;
  const volOk =
    closedVolSma > 0 && closedVol >= closedVolSma * EXPERT.volumeMult;
  checks.push({
    id: "volume",
    label: "Volumen",
    pass: volOk,
    detail: volOk
      ? `Vol. vela cerrada ${(closedVol / closedVolSma).toFixed(2)}× media`
      : `Vol. vela cerrada flojo (${closedVolSma > 0 ? (closedVol / closedVolSma).toFixed(2) : "—"}×) — sin participación`,
  });

  const slopeOk =
    slowSlopePct != null && slowSlopePct >= EXPERT.minSlowSlopePct;
  checks.push({
    id: "slope",
    label: "Pendiente tendencia",
    pass: slopeOk,
    detail:
      slowSlopePct == null
        ? "Pendiente no disponible"
        : slopeOk
          ? `EMA lenta subiendo (${slowSlopePct.toFixed(3)}%/barra)`
          : `EMA lenta plana/bajista (${slowSlopePct.toFixed(3)}%/barra)`,
  });

  const notChasing = extensionAtr <= EXPERT.maxExtensionAtr;
  checks.push({
    id: "extension",
    label: "No perseguir",
    pass: notChasing,
    detail: notChasing
      ? `Extensión ${extensionAtr.toFixed(2)} ATR — entrada limpia`
      : `Precio ${extensionAtr.toFixed(2)} ATR lejos de EMA — chase`,
  });

  const range = last.high - last.low || 1;
  const closeStrength = (last.close - last.low) / range;
  const confirmCandle =
    last.close >= last.open &&
    closeStrength >= EXPERT.candleCloseStrength;
  checks.push({
    id: "candle",
    label: "Vela confirmación",
    pass: confirmCandle,
    detail: confirmCandle
      ? "Cierre alcista con fuerza razonable"
      : "Vela débil / indecisa — esperar confirmación",
  });

  let htfOk = true;
  if (ctx.htfCandles && ctx.htfCandles.length >= SLOW + 5) {
    const htfCloses = ctx.htfCandles.map((c) => c.close);
    const htfFast = ema(htfCloses, FAST);
    const htfSlow = ema(htfCloses, SLOW);
    if (htfFast.length && htfSlow.length) {
      const hf = htfFast[htfFast.length - 1];
      const hs = htfSlow[htfSlow.length - 1];
      const hp = htfCloses[htfCloses.length - 1];
      htfOk = hf > hs && hp > hs;
      checks.push({
        id: "htf",
        label: `Sesgo ${higherTimeframe(params.timeframe)}`,
        pass: htfOk,
        detail: htfOk
          ? "Timeframe superior alcista — confluencia"
          : "Timeframe superior no alcista — no pelear la marea",
      });
    }
  } else {
    checks.push({
      id: "htf",
      label: "Sesgo HTF",
      pass: true,
      detail: "HTF no cargado — se evalúa solo TF operativo",
    });
  }

  const allPass = checks.every((c) => c.pass);
  const score = scoreFromChecks(checks);

  if (allPass) {
    const reason = bullishCross
      ? `Entrada experta — cruce EMA · RSI ${lastRsi.toFixed(0)} · ATR% ${atrPct!.toFixed(2)} · score ${score}`
      : `Entrada experta — pullback EMA · RSI ${lastRsi.toFixed(0)} · score ${score}`;

    return {
      signal: {
        pair,
        side: "long",
        price,
        reason,
        stopLoss: price - STOP_ATR * lastAtr,
        takeProfit: price + TP_ATR * lastAtr,
        atr: lastAtr,
        strength: score,
      },
      verdict: "enter",
      score,
      checks,
      summary: reason,
    };
  }

  const failed = checks.filter((c) => !c.pass).map((c) => c.label);
  return {
    signal: null,
    verdict: entryTrigger ? "skip" : "hold",
    score,
    checks,
    summary: entryTrigger
      ? `Señal cruda filtrada (${failed.join(", ")}) — score ${score}`
      : `Sin disparador — mercado en observación · score ${score}`,
  };
}

/** Compat: solo el signal (engine / legacy). */
export function evaluateTrendPulse(
  pair: Pair,
  candles: Candle[],
  hasOpenLong: boolean,
  params: TrendPulseParams = DEFAULT_TREND_PULSE,
  ctx: TrendPulseContext = {},
): StrategySignal | null {
  return decideTrendPulse(pair, candles, hasOpenLong, params, ctx).signal;
}

/** @deprecated usar DEFAULT_TREND_PULSE / loadTrendPulseParams */
export const TREND_PULSE_META = DEFAULT_TREND_PULSE;
