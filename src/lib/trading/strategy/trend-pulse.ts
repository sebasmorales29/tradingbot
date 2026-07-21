import type { Locale } from "@/lib/i18n/dictionary";
import { getStrategyCopy } from "@/lib/i18n/strategy-copy";
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
  /** hard = obligatorio para entrar; soft = calidad (se tolera 1 fallo) */
  tier?: "hard" | "soft";
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
  locale?: Locale;
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
  const copy = getStrategyCopy(ctx.locale ?? "es");
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
          label: copy.dataLabel,
          pass: false,
          detail: copy.dataDetail,
        },
      ],
      summary: copy.waitingData,
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
          label: copy.indicatorsLabel,
          pass: false,
          detail: copy.indicatorsDetail,
        },
      ],
      summary: copy.warming,
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
          reason: copy.exitBearishReason,
          atr: lastAtr,
          strength: atrPct ?? undefined,
        },
        verdict: "exit",
        score: 100,
        checks: [
          {
            id: "bearish_cross",
            label: copy.exitBearishLabel,
            pass: true,
            detail: copy.exitBearishDetail,
          },
        ],
        summary: copy.exitBearishSummary,
      };
    }

    if (structureBreak) {
      return {
        signal: {
          pair,
          side: "flat",
          price,
          reason: copy.exitStructureReason,
          atr: lastAtr,
          strength: atrPct ?? undefined,
        },
        verdict: "exit",
        score: 90,
        checks: [
          {
            id: "structure",
            label: copy.exitStructureLabel,
            pass: true,
            detail: copy.exitStructureDetail,
          },
        ],
        summary: copy.exitStructureSummary,
      };
    }

    if (rsiExhaust) {
      return {
        signal: {
          pair,
          side: "flat",
          price,
          reason: copy.exitRsiReason(lastRsi.toFixed(0)),
          atr: lastAtr,
          strength: atrPct ?? undefined,
        },
        verdict: "exit",
        score: 85,
        checks: [
          {
            id: "rsi_exit",
            label: copy.exitRsiLabel,
            pass: true,
            detail: copy.exitRsiDetail(lastRsi.toFixed(1)),
          },
        ],
        summary: copy.exitRsiSummary,
      };
    }

    return {
      signal: null,
      verdict: "hold",
      score: 70,
      checks: [
        {
          id: "trend_intact",
          label: copy.holdTrendLabel,
          pass: price > slow,
          detail:
            price > slow ? copy.holdTrendOk : copy.holdTrendWatch,
        },
        {
          id: "rsi_hold",
          label: copy.holdRsiLabel,
          pass: lastRsi < EXPERT.rsiExitExhaustion,
          detail: `RSI ${lastRsi.toFixed(1)}`,
        },
      ],
      summary: copy.holdSummary,
    };
  }

  // —— Checklist de entrada ——
  const entryTrigger = bullishCross || pullbackToFast;

  checks.push({
    id: "trigger",
    label: copy.triggerLabel,
    tier: "hard",
    pass: entryTrigger,
    detail: bullishCross
      ? copy.triggerCross
      : pullbackToFast
        ? copy.triggerPullback
        : copy.triggerNone,
  });

  checks.push({
    id: "above_slow",
    label: copy.aboveSlowLabel,
    tier: "hard",
    pass: price > slow,
    detail: price > slow ? copy.aboveSlowOk : copy.aboveSlowFail,
  });

  const minAtrEffective = effectiveMinAtrPct(params.timeframe, MIN_ATR_PCT);
  const regimeOk =
    atrPct != null && atrPct >= minAtrEffective && atrPct <= MAX_ATR_PCT;
  checks.push({
    id: "atr_regime",
    label: copy.atrLabel,
    tier: "hard",
    pass: regimeOk,
    detail:
      atrPct == null
        ? copy.atrMissing
        : regimeOk
          ? copy.atrOk(
              atrPct.toFixed(2),
              minAtrEffective.toFixed(2),
              params.timeframe,
            )
          : copy.atrFail(
              atrPct.toFixed(2),
              minAtrEffective.toFixed(2),
              String(MAX_ATR_PCT),
              params.timeframe,
            ),
  });

  const rsiOk = lastRsi >= EXPERT.rsiMin && lastRsi <= EXPERT.rsiMax;
  checks.push({
    id: "rsi",
    label: copy.rsiLabel,
    tier: "soft",
    pass: rsiOk,
    detail: rsiOk
      ? copy.rsiOk(lastRsi.toFixed(1))
      : lastRsi > EXPERT.rsiMax
        ? copy.rsiHigh(lastRsi.toFixed(1))
        : copy.rsiLow(lastRsi.toFixed(1)),
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
    label: copy.volumeLabel,
    tier: "soft",
    pass: volOk,
    detail: volOk
      ? copy.volumeOk((closedVol / closedVolSma).toFixed(2))
      : copy.volumeFail(
          closedVolSma > 0 ? (closedVol / closedVolSma).toFixed(2) : "—",
        ),
  });

  const slopeOk =
    slowSlopePct != null && slowSlopePct >= EXPERT.minSlowSlopePct;
  checks.push({
    id: "slope",
    label: copy.slopeLabel,
    tier: "soft",
    pass: slopeOk,
    detail:
      slowSlopePct == null
        ? copy.slopeMissing
        : slopeOk
          ? copy.slopeOk(slowSlopePct.toFixed(3))
          : copy.slopeFail(slowSlopePct.toFixed(3)),
  });

  const notChasing = extensionAtr <= EXPERT.maxExtensionAtr;
  checks.push({
    id: "extension",
    label: copy.extensionLabel,
    tier: "hard",
    pass: notChasing,
    detail: notChasing
      ? copy.extensionOk(extensionAtr.toFixed(2))
      : copy.extensionFail(extensionAtr.toFixed(2)),
  });

  const range = last.high - last.low || 1;
  const closeStrength = (last.close - last.low) / range;
  const confirmCandle =
    last.close >= last.open &&
    closeStrength >= EXPERT.candleCloseStrength;
  checks.push({
    id: "candle",
    label: copy.candleLabel,
    tier: "soft",
    pass: confirmCandle,
    detail: confirmCandle ? copy.candleOk : copy.candleFail,
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
        label: copy.htfLabel(higherTimeframe(params.timeframe)),
        tier: "hard",
        pass: htfOk,
        detail: htfOk ? copy.htfOk : copy.htfFail,
      });
    }
  } else {
    checks.push({
      id: "htf",
      label: copy.htfMissingLabel,
      tier: "hard",
      pass: true,
      detail: copy.htfMissingDetail,
    });
  }

  const score = scoreFromChecks(checks);
  const hardChecks = checks.filter((c) => c.tier === "hard");
  const softChecks = checks.filter((c) => c.tier !== "hard");
  const hardOk = hardChecks.every((c) => c.pass);
  const softFails = softChecks.filter((c) => !c.pass).length;
  // Modo equilibrado: obligatorios OK + como máximo 1 fallo de calidad
  const canEnter = hardOk && softFails <= 1;

  if (canEnter) {
    const softNote =
      softFails === 0
        ? copy.softComplete
        : copy.softSkipped(
            softChecks
              .filter((c) => !c.pass)
              .map((c) => c.label)
              .join(", "),
          );
    const reason = bullishCross
      ? copy.enterCross(lastRsi.toFixed(0), score, softNote)
      : copy.enterPullback(lastRsi.toFixed(0), score, softNote);

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

  const failedHard = hardChecks.filter((c) => !c.pass).map((c) => c.label);
  const failedSoft = softChecks.filter((c) => !c.pass).map((c) => c.label);
  return {
    signal: null,
    verdict: entryTrigger ? "skip" : "hold",
    score,
    checks,
    summary: !entryTrigger
      ? copy.noTrigger(score)
      : !hardOk
        ? copy.missingHard(failedHard.join(", "), score)
        : copy.softInsufficient(failedSoft.join(", "), score),
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
