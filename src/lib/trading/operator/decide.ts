import type { Locale } from "@/lib/i18n/dictionary";
import type { BotPolicy, GuidedBotPreferences } from "../bot-profile";
import { atr } from "../indicators";
import {
  decideTrendPulse,
  type DecisionCheck,
  type TrendPulseDecision,
  type TrendPulseParams,
} from "../strategy/trend-pulse";
import type { Candle, Pair, StrategySignal } from "../types";
import {
  applyCalibrationToPolicy,
  hybridMinScore,
  type CalibrationDeltas,
} from "./calibration";
import { extractOperatorFeatures, type OperatorFeatures } from "./features";
import { getOperatorModelInfo, scoreSetup } from "./model";
import {
  detectMarketRegime,
  type MarketRegime,
  type RegimeReading,
} from "./regime";

export type OperatorMeta = {
  regime: MarketRegime;
  regimeDetail: string;
  modelScore: number | null;
  minScore: number;
  modelVersion: string;
  checklistScore: number;
  blockedBy: string | null;
  entryMode: "trend_pulse" | "opportunity" | "exit" | "none";
};

export type OperatorDecision = TrendPulseDecision & {
  regime: RegimeReading;
  modelScore: number | null;
  minScore: number;
  features: OperatorFeatures | null;
  meta: OperatorMeta;
  policyUsed: BotPolicy;
};

export type OperatorContext = {
  htfCandles?: Candle[];
  locale?: Locale;
  policy: BotPolicy;
  prefs: GuidedBotPreferences;
  calibration?: CalibrationDeltas;
};

function regimeAdjustPolicy(
  policy: BotPolicy,
  regime: MarketRegime,
  prefs: GuidedBotPreferences,
): BotPolicy {
  const p = { ...policy };
  const aggressive = prefs.pace === "active" || prefs.autonomy === "standard";

  if (regime === "high_vol") {
    p.stopAtrMult = Math.min(3, p.stopAtrMult + 0.35);
    p.maxNotionalPct = Math.max(0.08, p.maxNotionalPct * (aggressive ? 0.85 : 0.7));
    if (!aggressive) {
      p.softFailTolerance = Math.max(0, p.softFailTolerance - 1);
    }
  } else if (regime === "range") {
    // En rango el operador sigue buscando: no congela soft fails a 0
    p.softFailTolerance = Math.max(p.softFailTolerance, aggressive ? 2 : 1);
    p.pullbackEntryMaxAtr = Math.min(p.pullbackEntryMaxAtr, aggressive ? 1.1 : 0.85);
  } else if (regime === "trend_down") {
    if (prefs.pace === "careful") {
      p.softFailTolerance = 0;
    } else {
      // Bounce hunting con stops más apretados
      p.stopAtrMult = Math.max(1.0, p.stopAtrMult - 0.2);
      p.tpAtrMult = Math.min(p.tpAtrMult, 1.8);
      p.softFailTolerance = Math.max(p.softFailTolerance, 1);
    }
  } else if (regime === "trend_up") {
    p.softFailTolerance = Math.min(3, p.softFailTolerance + (aggressive ? 1 : 0));
  }
  return p;
}

function blockSignal(
  base: TrendPulseDecision,
  summary: string,
  blockedBy: string,
  checks: DecisionCheck[],
): TrendPulseDecision {
  return {
    signal: null,
    verdict: "skip",
    score: base.score,
    checks: [
      ...base.checks,
      ...checks,
      {
        id: "operator_block",
        label: "Operator",
        tier: "hard",
        pass: false,
        detail: blockedBy,
      },
    ],
    summary,
  };
}

function buildOpportunityLong(
  pair: Pair,
  candles: Candle[],
  params: TrendPulseParams,
  policy: BotPolicy,
  modelScore: number,
  locale: Locale | undefined,
): StrategySignal | null {
  if (candles.length < 30) return null;
  const price = candles[candles.length - 1].close;
  const atrSeries = atr(candles, params.atrPeriod);
  const lastAtr = atrSeries[atrSeries.length - 1];
  if (!(lastAtr > 0) || !(price > 0)) return null;

  const stop = price - policy.stopAtrMult * lastAtr;
  const tp = price + policy.tpAtrMult * lastAtr;
  const reason =
    locale === "en"
      ? `Operator opportunity — model score ${modelScore}`
      : `Oportunidad del operador — score modelo ${modelScore}`;

  return {
    pair,
    side: "long",
    price,
    reason,
    stopLoss: stop,
    takeProfit: tp,
    atr: lastAtr,
    strength: modelScore,
  };
}

function allowsOpportunity(
  prefs: GuidedBotPreferences,
  regime: MarketRegime,
  features: OperatorFeatures,
  modelScore: number,
  minScore: number,
): boolean {
  if (modelScore < minScore) return false;
  // No perseguir extension extrema
  if (features.extensionAtr > 2.4) return false;
  if (features.rsi > 82) return false;

  if (regime === "trend_down") {
    // careful: no contra-tendencia; active/balanced: solo rebote con score alto
    if (prefs.pace === "careful") return false;
    return modelScore >= minScore + 8 && features.rsi < 45;
  }

  if (regime === "range") {
    return features.rsi <= 62 && features.extensionAtr <= 1.4;
  }

  return true;
}

/**
 * Operador Keelra activo:
 * - Usa Trend Pulse como checklist mental
 * - Si no hay disparo clásico pero el modelo ve edge → entra (opportunity)
 * - El perfil solo cambia agresividad, no apaga el bot
 */
export function decideAsOperator(
  pair: Pair,
  candles: Candle[],
  hasOpenLong: boolean,
  params: TrendPulseParams,
  ctx: OperatorContext,
): OperatorDecision {
  const regime = detectMarketRegime(
    candles,
    params.atrPeriod,
    params.fast,
    params.slow,
  );

  const cal = ctx.calibration ?? {
    softFailDelta: 0,
    volumeMultDelta: 0,
    minScore: getOperatorModelInfo().minScoreDefault,
    tradesCount: 0,
    winRate: null,
  };

  let policy = regimeAdjustPolicy(ctx.policy, regime.regime, ctx.prefs);
  // Operador activo: tolerancia mínima para que el checklist no lo congele
  if (ctx.prefs.pace !== "careful") {
    policy.softFailTolerance = Math.max(policy.softFailTolerance, 1);
  }
  if (ctx.prefs.pace === "active") {
    policy.softFailTolerance = Math.max(policy.softFailTolerance, 2);
    policy.volumeMult = Math.min(policy.volumeMult, 0.95);
  }

  policy = applyCalibrationToPolicy(policy, cal, ctx.prefs);
  const minScore = hybridMinScore(cal.minScore, ctx.prefs);
  const modelInfo = getOperatorModelInfo();

  const features = extractOperatorFeatures(
    candles,
    regime.regime,
    ctx.htfCandles,
    params.fast,
    params.slow,
    params.atrPeriod,
  );
  const modelScore = features ? scoreSetup(features) : null;

  let decision = decideTrendPulse(pair, candles, hasOpenLong, params, {
    htfCandles: ctx.htfCandles,
    locale: ctx.locale,
    policy,
  });

  let blockedBy: string | null = null;
  let entryMode: OperatorMeta["entryMode"] = "none";

  if (hasOpenLong) {
    entryMode = decision.signal?.side === "flat" ? "exit" : "none";
  } else if (decision.signal?.side === "long") {
    entryMode = "trend_pulse";
    // Bloqueo duro solo en careful + downtrend muy feo
    if (
      regime.regime === "trend_down" &&
      ctx.prefs.pace === "careful" &&
      (modelScore == null || modelScore < minScore + 10)
    ) {
      blockedBy = "regime_trend_down";
      decision = blockSignal(
        decision,
        `Operator skip — careful profile avoids downtrend`,
        blockedBy,
        [
          {
            id: "regime",
            label: "Regime",
            tier: "hard",
            pass: false,
            detail: "trend_down",
          },
        ],
      );
      entryMode = "none";
    } else if (
      modelScore != null &&
      modelScore < minScore - 5 &&
      ctx.prefs.pace === "careful"
    ) {
      blockedBy = "model_score";
      decision = blockSignal(
        decision,
        `Operator skip — setup score ${modelScore} < ${minScore}`,
        blockedBy,
        [
          {
            id: "model_score",
            label: "Model score",
            tier: "hard",
            pass: false,
            detail: `${modelScore} / min ${minScore}`,
          },
        ],
      );
      entryMode = "none";
    }
  } else if (
    !decision.signal &&
    features &&
    modelScore != null &&
    allowsOpportunity(ctx.prefs, regime.regime, features, modelScore, minScore)
  ) {
    const opp = buildOpportunityLong(
      pair,
      candles,
      params,
      policy,
      modelScore,
      ctx.locale,
    );
    if (opp) {
      entryMode = "opportunity";
      decision = {
        signal: opp,
        verdict: "enter",
        score: Math.max(decision.score, modelScore),
        checks: [
          ...decision.checks,
          {
            id: "opportunity",
            label: "Operator opportunity",
            tier: "soft",
            pass: true,
            detail: `model ${modelScore} ≥ ${minScore}`,
          },
        ],
        summary: opp.reason,
      };
    }
  }

  let signal: StrategySignal | null = decision.signal;
  if (signal) {
    signal = {
      ...signal,
      reason: `${signal.reason} · regime ${regime.regime} · model ${modelScore ?? "—"} · ${entryMode}`,
      strength: modelScore ?? signal.strength,
    };
  }

  const meta: OperatorMeta = {
    regime: regime.regime,
    regimeDetail: regime.detail,
    modelScore,
    minScore,
    modelVersion: modelInfo.version,
    checklistScore: decision.score,
    blockedBy,
    entryMode,
  };

  return {
    ...decision,
    signal,
    regime,
    modelScore,
    minScore,
    features,
    meta,
    policyUsed: policy,
  };
}

export function formatOperatorReason(decision: OperatorDecision): string {
  const m = decision.meta;
  const base = decision.signal?.reason ?? decision.summary;
  return `${base} · regime=${m.regime} · model=${m.modelScore ?? "—"}/${m.minScore} · mode=${m.entryMode}${
    m.blockedBy ? ` · blocked=${m.blockedBy}` : ""
  }`;
}
