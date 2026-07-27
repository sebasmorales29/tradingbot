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
