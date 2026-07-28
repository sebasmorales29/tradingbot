import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { atr } from "../indicators";
import { fetchOHLCV } from "../market";
import type { Candle, Pair } from "../types";
import { extractOperatorFeatures, type OperatorFeatures } from "./features";
import { detectMarketRegime } from "./regime";

export type TrainedModelArtifact = {
  version: string;
  trainedAt: string;
  description: string;
  minScoreDefault: number;
  sampleWins: number;
  sampleLosses: number;
  weights: {
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
  bins: {
    rsiIdealMin: number;
    rsiIdealMax: number;
    atrMin: number;
    atrMax: number;
    slopeMin: number;
    extensionMax: number;
    volMin: number;
  };
};

type Sample = {
  features: OperatorFeatures;
  label: 1 | 0; // 1 = hit +R before -R
  forwardRet: number;
};

function labelForward(
  candles: Candle[],
  i: number,
  atrPeriod: number,
  horizon: number,
): { label: 1 | 0; forwardRet: number } | null {
  if (i + horizon >= candles.length) return null;
  const window = candles.slice(0, i + 1);
  const atrSeries = atr(window, atrPeriod);
  if (!atrSeries.length) return null;
  const lastAtr = atrSeries[atrSeries.length - 1];
  const entry = candles[i].close;
  if (!(lastAtr > 0) || !(entry > 0)) return null;

  const tp = entry + 1.6 * lastAtr;
  const sl = entry - 1.1 * lastAtr;
  let hit: 1 | 0 | null = null;

  for (let j = i + 1; j <= i + horizon && j < candles.length; j++) {
    const c = candles[j];
    if (c.low <= sl) {
      hit = 0;
      break;
    }
    if (c.high >= tp) {
      hit = 1;
      break;
    }
  }

  const exit = candles[Math.min(i + horizon, candles.length - 1)].close;
  const forwardRet = (exit - entry) / entry;
  if (hit == null) {
    hit = forwardRet > 0.002 ? 1 : 0;
  }
  return { label: hit, forwardRet };
}

function mean(xs: number[]): number {
  if (!xs.length) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function collectSamples(
  candles: Candle[],
  atrPeriod = 14,
  horizon = 12,
): Sample[] {
  const out: Sample[] = [];
  const warm = 60;
  for (let i = warm; i < candles.length - horizon - 1; i += 1) {
    const window = candles.slice(0, i + 1);
    const regime = detectMarketRegime(window, atrPeriod);
    const features = extractOperatorFeatures(
      window,
      regime.regime,
      undefined,
      20,
      50,
      atrPeriod,
    );
    if (!features) continue;
    const labeled = labelForward(candles, i, atrPeriod, horizon);
    if (!labeled) continue;
    // Subsample: keep all wins, 40% of losses to balance a bit
    if (labeled.label === 0 && Math.random() > 0.4) continue;
    out.push({ features, label: labeled.label, forwardRet: labeled.forwardRet });
  }
  return out;
}

/**
 * Entrena pesos del score a partir de diferencias win vs loss en features.
 * Es un learner batch interpretable (no black-box) listo para producción.
 */
export function trainWeightedModel(samples: Sample[]): TrainedModelArtifact {
  const wins = samples.filter((s) => s.label === 1);
  const losses = samples.filter((s) => s.label === 0);

  const wRsi = mean(wins.map((s) => s.features.rsi));
  const lRsi = mean(losses.map((s) => s.features.rsi));
  const wSlope = mean(wins.map((s) => s.features.slowSlopePct));
  const lSlope = mean(losses.map((s) => s.features.slowSlopePct));
  const wExt = mean(wins.map((s) => s.features.extensionAtr));
  const lExt = mean(losses.map((s) => s.features.extensionAtr));
  const wVol = mean(wins.map((s) => s.features.volRatio));
  const lVol = mean(losses.map((s) => s.features.volRatio));
  const wAtr = mean(wins.map((s) => s.features.atrPct));
  const lAtr = mean(losses.map((s) => s.features.atrPct));
  const wUp = mean(wins.map((s) => s.features.regimeTrendUp));
  const lUp = mean(losses.map((s) => s.features.regimeTrendUp));
  const wDown = mean(wins.map((s) => s.features.regimeTrendDown));
  const lDown = mean(losses.map((s) => s.features.regimeTrendDown));
  const wRange = mean(wins.map((s) => s.features.regimeRange));
  const lRange = mean(losses.map((s) => s.features.regimeRange));
  const wHv = mean(wins.map((s) => s.features.regimeHighVol));
  const lHv = mean(losses.map((s) => s.features.regimeHighVol));
  const wHtf = mean(wins.map((s) => s.features.htfBias));
  const lHtf = mean(losses.map((s) => s.features.htfBias));

  const clampW = (n: number, lo: number, hi: number) =>
    Math.max(lo, Math.min(hi, Math.round(n)));

  // Más peso si el feature separa wins de losses
  const slopeEdge = (wSlope - lSlope) * 800;
  const extEdge = (lExt - wExt) * 10; // wins suelen estar menos extendidos
  const volEdge = (wVol - lVol) * 20;
  const upEdge = (wUp - lUp) * 20;
  const downEdge = (wDown - lDown) * 25;
  const rangeEdge = (wRange - lRange) * 18;
  const hvEdge = (wHv - lHv) * 18;
  const htfEdge = (wHtf - lHtf) * 14;

  const artifact: TrainedModelArtifact = {
    version: "v2",
    trainedAt: new Date().toISOString(),
    description:
      "Batch-trained from Binance OHLCV forward outcomes (+1.6ATR vs -1.1ATR). Interpretable weighted score.",
    minScoreDefault: 32,
    sampleWins: wins.length,
    sampleLosses: losses.length,
    weights: {
      rsiMid: clampW(14 + Math.abs(wRsi - lRsi) * 0.4, 8, 22),
      atrOk: clampW(10 + Math.abs(wAtr - lAtr) * 2, 6, 18),
      slopeUp: clampW(12 + slopeEdge, 8, 26),
      notExtended: clampW(12 + extEdge, 8, 24),
      volume: clampW(10 + volEdge, 6, 20),
      htfBull: clampW(10 + htfEdge, 6, 20),
      regimeTrendUp: clampW(10 + upEdge, 6, 22),
      regimeHighVolPenalty: clampW(-6 - hvEdge, -18, -2),
      regimeRangePenalty: clampW(-4 - rangeEdge, -14, 0),
      regimeTrendDownPenalty: clampW(-8 - downEdge, -24, -2),
    },
    bins: {
      rsiIdealMin: Math.max(35, Math.min(48, Math.round(wRsi - 8))),
      rsiIdealMax: Math.max(60, Math.min(74, Math.round(wRsi + 8))),
      atrMin: Math.max(0.15, Math.min(0.5, wAtr * 0.45)),
      atrMax: Math.max(3.5, Math.min(8, wAtr * 2.2 + 2)),
      slopeMin: Math.max(0.001, Math.min(0.012, wSlope * 0.6)),
      extensionMax: Math.max(1.0, Math.min(2.2, (wExt + lExt) / 2 + 0.4)),
      volMin: Math.max(0.75, Math.min(1.05, (wVol + lVol) / 2 * 0.9)),
    },
  };

  return artifact;
}

export async function trainOperatorFromMarket(options?: {
  pairs?: Pair[];
  timeframe?: string;
  limit?: number;
  outPath?: string;
  /** Si false, no escribe el JSON (útil en Vercel read-only). */
  persistFile?: boolean;
}): Promise<TrainedModelArtifact> {
  const pairs = options?.pairs ?? (["BTC/USDT", "ETH/USDT"] as Pair[]);
  const timeframe = options?.timeframe ?? "4h";
  const limit = options?.limit ?? 1000;
  const outPath =
    options?.outPath ??
    resolve(
      process.cwd(),
      "src/lib/trading/operator/models/operator_model_v1.json",
    );

  const all: Sample[] = [];
  for (const pair of pairs) {
    const candles = await fetchOHLCV(pair, timeframe, limit);
    const samples = collectSamples(candles);
    console.log(
      `${pair} ${timeframe}: ${candles.length} candles → ${samples.length} samples`,
    );
    all.push(...samples);
  }

  if (all.length < 80) {
    throw new Error(
      `Too few training samples (${all.length}). Need market history.`,
    );
  }

  const artifact = trainWeightedModel(all);
  if (options?.persistFile !== false) {
    try {
      writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`, "utf8");
      console.log(
        `Wrote ${outPath} · wins=${artifact.sampleWins} losses=${artifact.sampleLosses} minScore=${artifact.minScoreDefault}`,
      );
    } catch (e) {
      console.warn(
        "[operator-train] could not persist model file (ok on serverless):",
        e instanceof Error ? e.message : e,
      );
    }
  }
  return artifact;
}
