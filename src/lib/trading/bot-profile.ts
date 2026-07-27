export type BotPace = "careful" | "balanced" | "active";
export type BotStress = "low" | "medium" | "high";
export type BotFocus = "btc" | "majors";
export type BotAutonomy = "guarded" | "standard";

export type GuidedBotPreferences = {
  pace: BotPace;
  stress: BotStress;
  focus: BotFocus;
  autonomy: BotAutonomy;
};

export const DEFAULT_GUIDED_BOT_PREFERENCES: GuidedBotPreferences = {
  pace: "balanced",
  stress: "medium",
  focus: "majors",
  autonomy: "guarded",
};

export function normalizeGuidedBotPreferences(
  raw: unknown,
): GuidedBotPreferences {
  const obj = raw && typeof raw === "object" ? raw : {};
  const safe = obj as Partial<GuidedBotPreferences>;
  return {
    pace:
      safe.pace === "careful" || safe.pace === "balanced" || safe.pace === "active"
        ? safe.pace
        : DEFAULT_GUIDED_BOT_PREFERENCES.pace,
    stress:
      safe.stress === "low" || safe.stress === "medium" || safe.stress === "high"
        ? safe.stress
        : DEFAULT_GUIDED_BOT_PREFERENCES.stress,
    focus:
      safe.focus === "btc" || safe.focus === "majors"
        ? safe.focus
        : DEFAULT_GUIDED_BOT_PREFERENCES.focus,
    autonomy:
      safe.autonomy === "guarded" || safe.autonomy === "standard"
        ? safe.autonomy
        : DEFAULT_GUIDED_BOT_PREFERENCES.autonomy,
  };
}

export function deriveBotConfigFromPreferences(
  prefs: GuidedBotPreferences,
): { riskPercent: number; pairs: string[] } {
  const baseRisk =
    prefs.stress === "low" ? 0.35 : prefs.stress === "medium" ? 0.75 : 1.25;
  const paceDelta =
    prefs.pace === "careful" ? -0.1 : prefs.pace === "active" ? 0.25 : 0;
  const autonomyDelta = prefs.autonomy === "standard" ? 0.15 : 0;
  const riskPercent = Math.max(
    0.1,
    Math.min(5, Math.round((baseRisk + paceDelta + autonomyDelta) * 100) / 100),
  );

  return {
    riskPercent,
    pairs: prefs.focus === "btc" ? ["BTC/USDT"] : ["BTC/USDT", "ETH/USDT"],
  };
}

/* ------------------------------------------------------------------ */
/*  Policy layer — traduce preferencias humanas en umbrales técnicos  */
/* ------------------------------------------------------------------ */

export type BotPolicy = {
  rsiMin: number;
  rsiMax: number;
  rsiExitExhaustion: number;
  volumeMult: number;
  maxExtensionAtr: number;
  minSlowSlopePct: number;
  pullbackEntryMaxAtr: number;
  candleCloseStrength: number;
  /** Max soft-check failures tolerated to still enter */
  softFailTolerance: number;
  /** ATR multiplier for stop loss */
  stopAtrMult: number;
  /** ATR multiplier for take profit */
  tpAtrMult: number;
  /** Max % of equity in a single position */
  maxNotionalPct: number;
};

const BASE_POLICY: BotPolicy = {
  rsiMin: 40,
  rsiMax: 72,
  rsiExitExhaustion: 80,
  volumeMult: 1.05,
  maxExtensionAtr: 1.6,
  minSlowSlopePct: 0.008,
  pullbackEntryMaxAtr: 1.0,
  candleCloseStrength: 0.45,
  softFailTolerance: 1,
  stopAtrMult: 1.5,
  tpAtrMult: 2.5,
  maxNotionalPct: 0.25,
};

/**
 * Genera una policy completa a partir de las preferencias del usuario.
 *
 *  careful / low  → filtros estrictos, stops amplios, TP conservador
 *  active / high  → filtros relajados, stops apretados, TP agresivo
 */
export function deriveBotPolicy(prefs: GuidedBotPreferences): BotPolicy {
  const p = { ...BASE_POLICY };

  // — Pace: cuántas operaciones quiere el usuario —
  if (prefs.pace === "careful") {
    p.rsiMax = 68;
    p.volumeMult = 1.15;
    p.minSlowSlopePct = 0.012;
    p.candleCloseStrength = 0.55;
    p.softFailTolerance = 0;
    p.maxExtensionAtr = 1.3;
    p.pullbackEntryMaxAtr = 0.8;
  } else if (prefs.pace === "active") {
    p.rsiMax = 76;
    p.volumeMult = 0.9;
    p.minSlowSlopePct = 0.004;
    p.candleCloseStrength = 0.35;
    p.softFailTolerance = 2;
    p.maxExtensionAtr = 2.0;
    p.pullbackEntryMaxAtr = 1.3;
  }

  // — Stress: cuánto riesgo tolera —
  if (prefs.stress === "low") {
    p.stopAtrMult = 2.0;
    p.tpAtrMult = 2.0;
    p.maxNotionalPct = 0.15;
    p.rsiExitExhaustion = 75;
  } else if (prefs.stress === "high") {
    p.stopAtrMult = 1.2;
    p.tpAtrMult = 3.0;
    p.maxNotionalPct = 0.35;
    p.rsiExitExhaustion = 84;
  }

  // — Autonomy: guarded tightens everything slightly —
  if (prefs.autonomy === "guarded") {
    p.softFailTolerance = Math.max(0, p.softFailTolerance - 1);
    p.maxNotionalPct = Math.min(p.maxNotionalPct, 0.20);
  }

  return p;
}
