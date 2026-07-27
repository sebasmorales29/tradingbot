import type { Locale } from "@/lib/i18n/dictionary";
import type { BotPolicy, GuidedBotPreferences } from "../bot-profile";
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
import { detectMarketRegime, type MarketRegime, type RegimeReading } from "./regime";

export type OperatorMeta = {
  regime: MarketRegime;
  regimeDetail: string;
  modelScore: number | null;
  minScore: number;
  modelVersion: string;
  checklistScore: number;
  blockedBy: string | null;
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
): BotPolicy {
  const p = { ...policy };
  if (regime === "high_vol") {
    p.stopAtrMult = Math.min(3, p.stopAtrMult + 0.4);
    p.maxNotionalPct = Math.max(0.08, p.maxNotionalPct * 0.7);
    p.softFailTolerance = Math.max(0, p.softFailTolerance - 1);
    p.volumeMult = Math.min(1.5, p.volumeMult + 0.1);
  } else if (regime === "range") {
    p.softFailTolerance = 0;
    p.pullbackEntryMaxAtr = Math.min(p.pullbackEntryMaxAtr, 0.7);
    p.maxExtensionAtr = Math.min(p.maxExtensionAtr, 1.1);
  } else if (regime === "trend_down") {
    p.softFailTolerance = 0;
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

/**
 * Operador Keelra: régimen + Trend Pulse + calibración híbrida + score de modelo.
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

  let policy = regimeAdjustPolicy(ctx.policy, regime.regime);
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

  // Exits always allowed when in a position
  if (!hasOpenLong && decision.signal?.side === "long") {
    if (regime.regime === "trend_down") {
      blockedBy = "regime_trend_down";
      decision = blockSignal(
        decision,
        `Operator skip — downtrend (${regime.detail})`,
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
    } else if (regime.regime === "range") {
      const isPullback = decision.checks.some(
        (c) => c.id === "trigger" && c.pass && c.detail.toLowerCase().includes("pullback"),
      );
      if (!isPullback) {
        blockedBy = "regime_range_no_pullback";
        decision = blockSignal(
          decision,
          `Operator skip — range market, wait for clean pullback`,
          blockedBy,
          [
            {
              id: "regime",
              label: "Regime",
              tier: "hard",
              pass: false,
              detail: "range — only pullbacks",
            },
          ],
        );
      }
    }

    if (
      !blockedBy &&
      decision.signal?.side === "long" &&
      modelScore != null &&
      modelScore < minScore
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
    }
  }

  // Annotate enter reasons with operator context
  let signal: StrategySignal | null = decision.signal;
  if (signal) {
    signal = {
      ...signal,
      reason: `${signal.reason} · regime ${regime.regime} · model ${modelScore ?? "—"}`,
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

export function formatOperatorReason(
  decision: OperatorDecision,
): string {
  const m = decision.meta;
  const base = decision.signal?.reason ?? decision.summary;
  return `${base} · regime=${m.regime} · model=${m.modelScore ?? "—"}/${m.minScore}${
    m.blockedBy ? ` · blocked=${m.blockedBy}` : ""
  }`;
}
