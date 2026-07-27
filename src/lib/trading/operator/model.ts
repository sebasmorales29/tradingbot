import type { OperatorFeatures } from "./features";
import modelArtifact from "./models/operator_model_v1.json";

export type OperatorModelInfo = {
  version: string;
  trainedAt: string;
  minScoreDefault: number;
};

type ModelWeights = {
  rsiMid: number;
  atrOk: number;
  slopeUp: number;
  notExtended: number;
  volume: number;
  htfBull: number;
  regimeTrendUp: number;
  regimeHighVolPenalty: number;
  regimeRangePenalty: number;
  regimeTrendDownPenalty: number;
};

type ModelBins = {
  rsiIdealMin: number;
  rsiIdealMax: number;
  atrMin: number;
  atrMax: number;
  slopeMin: number;
  extensionMax: number;
  volMin: number;
};

type ModelArtifact = {
  version: string;
  trainedAt: string;
  minScoreDefault: number;
  weights: ModelWeights;
  bins: ModelBins;
};

const model = modelArtifact as ModelArtifact;

export function getOperatorModelInfo(): OperatorModelInfo {
  return {
    version: model.version,
    trainedAt: model.trainedAt,
    minScoreDefault: model.minScoreDefault,
  };
}

/**
 * Score 0–100 de calidad de setup.
 * Contrato estable: se puede reemplazar el artefacto sin cambiar callers.
 */
export function scoreSetup(features: OperatorFeatures): number {
  const w = model.weights;
  const b = model.bins;
  let raw = 40;

  if (features.rsi >= b.rsiIdealMin && features.rsi <= b.rsiIdealMax) {
    raw += w.rsiMid;
  } else if (features.rsi > b.rsiIdealMax && features.rsi < 78) {
    raw += w.rsiMid * 0.35;
  }

  if (features.atrPct >= b.atrMin && features.atrPct <= b.atrMax) {
    raw += w.atrOk;
  }

  if (features.slowSlopePct >= b.slopeMin) {
    raw += w.slopeUp;
  }

  if (features.extensionAtr <= b.extensionMax) {
    raw += w.notExtended;
  }

  if (features.volRatio >= b.volMin) {
    raw += w.volume;
  }

  if (features.htfBias > 0) {
    raw += w.htfBull;
  } else if (features.htfBias < 0) {
    raw -= w.htfBull * 0.6;
  }

  raw += features.regimeTrendUp * w.regimeTrendUp;
  raw += features.regimeHighVol * w.regimeHighVolPenalty;
  raw += features.regimeRange * w.regimeRangePenalty;
  raw += features.regimeTrendDown * w.regimeTrendDownPenalty;

  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function defaultMinScore(): number {
  return model.minScoreDefault;
}
