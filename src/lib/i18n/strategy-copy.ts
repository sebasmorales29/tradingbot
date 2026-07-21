import type { Locale } from "@/lib/i18n/dictionary";

export type StrategyCopy = ReturnType<typeof buildStrategyCopy>;

function buildStrategyCopy(locale: Locale) {
  if (locale === "en") {
    return {
      dataLabel: "Data",
      dataDetail: "Not enough candles to evaluate",
      waitingData: "Waiting for more market data",
      indicatorsLabel: "Indicators",
      indicatorsDetail: "Indicators not ready yet",
      warming: "Warming up indicators",
      exitBearishReason: "Expert exit — bearish EMA cross (momentum ended)",
      exitBearishLabel: "Bearish cross",
      exitBearishDetail: "EMA fast crossed below slow",
      exitBearishSummary: "Close long: momentum flipped",
      exitStructureReason:
        "Expert exit — broke below slow EMA + bearish candle",
      exitStructureLabel: "Structure",
      exitStructureDetail: "Price lost the slow EMA with a red close",
      exitStructureSummary: "Close long: structure broken",
      exitRsiReason: (rsi: string) =>
        `Expert exit — RSI exhausted (${rsi}) and falling`,
      exitRsiLabel: "Exhaustion",
      exitRsiDetail: (rsi: string) => `RSI ${rsi} in distribution zone`,
      exitRsiSummary: "Close long: take profit on exhaustion",
      holdTrendLabel: "Trend",
      holdTrendOk: "Bullish structure intact — let it run",
      holdTrendWatch: "Near slow EMA — watching",
      holdRsiLabel: "RSI",
      holdSummary: "Open position — no exit signal",
      triggerLabel: "Trigger",
      triggerCross: "Fresh bullish EMA cross",
      triggerPullback: "Pullback to fast EMA in trend",
      triggerNone: "No quality cross or pullback",
      aboveSlowLabel: "Above slow EMA",
      aboveSlowOk: "Price above the slow average",
      aboveSlowFail: "Price below slow EMA — bearish/neutral bias",
      atrLabel: "Volatility regime",
      atrMissing: "ATR% unavailable",
      atrOk: (atr: string, min: string, tf: string) =>
        `ATR% ${atr} — tradeable (≥${min} on ${tf})`,
      atrFail: (atr: string, min: string, max: string, tf: string) =>
        `ATR% ${atr} outside ${min}–${max} (${tf})`,
      rsiLabel: "Healthy RSI",
      rsiOk: (rsi: string) => `RSI ${rsi} — momentum not exhausted`,
      rsiHigh: (rsi: string) => `RSI ${rsi} — overbought / chase`,
      rsiLow: (rsi: string) => `RSI ${rsi} — too weak`,
      volumeLabel: "Volume",
      volumeOk: (x: string) => `Closed-candle vol ${x}× average`,
      volumeFail: (x: string) =>
        `Weak closed-candle vol (${x}×) — no participation`,
      slopeLabel: "Trend slope",
      slopeMissing: "Slope unavailable",
      slopeOk: (s: string) => `Slow EMA rising (${s}%/bar)`,
      slopeFail: (s: string) => `Slow EMA flat/bearish (${s}%/bar)`,
      extensionLabel: "Do not chase",
      extensionOk: (x: string) => `Extension ${x} ATR — clean entry`,
      extensionFail: (x: string) => `Price ${x} ATR from EMA — chase`,
      candleLabel: "Confirmation candle",
      candleOk: "Bullish close with reasonable strength",
      candleFail: "Weak / indecisive candle — wait for confirmation",
      htfLabel: (tf: string) => `Bias ${tf}`,
      htfOk: "Higher timeframe bullish — confluence",
      htfFail: "Higher timeframe not bullish — don’t fight the tide",
      htfMissingLabel: "HTF bias",
      htfMissingDetail: "HTF not loaded — evaluating operating TF only",
      enterCross: (rsi: string, score: number, note: string) =>
        `Entry — EMA cross · RSI ${rsi} · score ${score} · ${note}`,
      enterPullback: (rsi: string, score: number, note: string) =>
        `Entry — EMA pullback · RSI ${rsi} · score ${score} · ${note}`,
      softComplete: "full checklist",
      softSkipped: (labels: string) => `1 soft filter skipped (${labels})`,
      noTrigger: (score: number) =>
        `No trigger — market under watch · score ${score}`,
      missingHard: (labels: string, score: number) =>
        `Missing key filters (${labels}) — score ${score}`,
      softInsufficient: (labels: string, score: number) =>
        `Quality insufficient (${labels}; max 1 soft miss) — score ${score}`,
      riskKill: "Kill-switch active",
      riskDaily: "Daily loss limit reached",
      riskStop: "Invalid stop",
      riskQty: "Quantity too small",
      sessionStart: (
        pair: string,
        tf: string,
        htf: string,
        eq: number,
        risk: number,
      ) =>
        `Live session · ${pair} · ${tf} (+ ${htf} bias) · equity $${eq} · risk ${risk}%`,
      sessionCreated: "Session created — waiting for first tick",
      stopTrail: "Stop / trailing (real market)",
      takeProfit: "Take profit (real market)",
      riskBlocked: (reason: string) =>
        `Checklist OK but risk blocks · ${reason}`,
      signalIgnored: (reason: string) => `Signal skipped: ${reason}`,
      stopLossEngine: "Stop loss (protected / trailing)",
      takeProfitEngine: "Take profit",
      botPaused: "Bot paused",
      killActive: "Kill-switch active",
      tickDone: "Tick completed",
      noBotConfig: "No bot configuration",
    } as const;
  }

  return {
    dataLabel: "Datos",
    dataDetail: "Insuficientes velas para evaluar",
    waitingData: "Esperando más datos de mercado",
    indicatorsLabel: "Indicadores",
    indicatorsDetail: "Indicadores aún no listos",
    warming: "Calentando indicadores",
    exitBearishReason: "Salida experta — cruce EMA bajista (fin de impulso)",
    exitBearishLabel: "Cruce bajista",
    exitBearishDetail: "EMA fast cruzó bajo slow",
    exitBearishSummary: "Cerrar long: momentum se giró",
    exitStructureReason:
      "Salida experta — ruptura bajo EMA lenta + vela bajista",
    exitStructureLabel: "Estructura",
    exitStructureDetail: "Precio perdió la EMA lenta con cierre rojo",
    exitStructureSummary: "Cerrar long: estructura rota",
    exitRsiReason: (rsi: string) =>
      `Salida experta — RSI agotado (${rsi}) y bajando`,
    exitRsiLabel: "Agotamiento",
    exitRsiDetail: (rsi: string) => `RSI ${rsi} en zona de distribución`,
    exitRsiSummary: "Cerrar long: toma de ganancias por agotamiento",
    holdTrendLabel: "Tendencia",
    holdTrendOk: "Estructura alcista intacta — dejar correr",
    holdTrendWatch: "Cerca de EMA lenta — vigilando",
    holdRsiLabel: "RSI",
    holdSummary: "Posición abierta — sin señal de salida",
    triggerLabel: "Disparador",
    triggerCross: "Cruce EMA alcista fresco",
    triggerPullback: "Pullback a EMA rápida en tendencia",
    triggerNone: "Sin cruce ni pullback de calidad",
    aboveSlowLabel: "Sobre EMA lenta",
    aboveSlowOk: "Precio por encima de la media lenta",
    aboveSlowFail: "Precio bajo EMA lenta — sesgo bajista/neutral",
    atrLabel: "Régimen volatilidad",
    atrMissing: "ATR% no disponible",
    atrOk: (atr: string, min: string, tf: string) =>
      `ATR% ${atr} — rango operable (≥${min} en ${tf})`,
    atrFail: (atr: string, min: string, max: string, tf: string) =>
      `ATR% ${atr} fuera de ${min}–${max} (${tf})`,
    rsiLabel: "RSI sano",
    rsiOk: (rsi: string) => `RSI ${rsi} — momentum sin agotar`,
    rsiHigh: (rsi: string) => `RSI ${rsi} — sobrecompra / chase`,
    rsiLow: (rsi: string) => `RSI ${rsi} — demasiado débil`,
    volumeLabel: "Volumen",
    volumeOk: (x: string) => `Vol. vela cerrada ${x}× media`,
    volumeFail: (x: string) =>
      `Vol. vela cerrada flojo (${x}×) — sin participación`,
    slopeLabel: "Pendiente tendencia",
    slopeMissing: "Pendiente no disponible",
    slopeOk: (s: string) => `EMA lenta subiendo (${s}%/barra)`,
    slopeFail: (s: string) => `EMA lenta plana/bajista (${s}%/barra)`,
    extensionLabel: "No perseguir",
    extensionOk: (x: string) => `Extensión ${x} ATR — entrada limpia`,
    extensionFail: (x: string) => `Precio ${x} ATR lejos de EMA — chase`,
    candleLabel: "Vela confirmación",
    candleOk: "Cierre alcista con fuerza razonable",
    candleFail: "Vela débil / indecisa — esperar confirmación",
    htfLabel: (tf: string) => `Sesgo ${tf}`,
    htfOk: "Timeframe superior alcista — confluencia",
    htfFail: "Timeframe superior no alcista — no pelear la marea",
    htfMissingLabel: "Sesgo HTF",
    htfMissingDetail: "HTF no cargado — se evalúa solo TF operativo",
    enterCross: (rsi: string, score: number, note: string) =>
      `Entrada — cruce EMA · RSI ${rsi} · score ${score} · ${note}`,
    enterPullback: (rsi: string, score: number, note: string) =>
      `Entrada — pullback EMA · RSI ${rsi} · score ${score} · ${note}`,
    softComplete: "checklist completa",
    softSkipped: (labels: string) => `1 filtro blando omitido (${labels})`,
    noTrigger: (score: number) =>
      `Sin disparador — mercado en observación · score ${score}`,
    missingHard: (labels: string, score: number) =>
      `Faltan filtros clave (${labels}) — score ${score}`,
    softInsufficient: (labels: string, score: number) =>
      `Calidad insuficiente (${labels}; máx. 1 fallo blando) — score ${score}`,
    riskKill: "Kill-switch activo",
    riskDaily: "Tope de pérdida diaria alcanzado",
    riskStop: "Stop inválido",
    riskQty: "Qty demasiado pequeña",
    sessionStart: (
      pair: string,
      tf: string,
      htf: string,
      eq: number,
      risk: number,
    ) =>
      `Sesión en vivo · ${pair} · ${tf} (+ sesgo ${htf}) · equity $${eq} · riesgo ${risk}%`,
    sessionCreated: "Sesión creada — esperando primer tick",
    stopTrail: "Stop / trailing (mercado real)",
    takeProfit: "Take profit (mercado real)",
    riskBlocked: (reason: string) =>
      `Checklist OK pero riesgo bloquea · ${reason}`,
    signalIgnored: (reason: string) => `Señal ignorada: ${reason}`,
    stopLossEngine: "Stop loss (protegido / trailing)",
    takeProfitEngine: "Take profit",
    botPaused: "Bot en pausa",
    killActive: "Kill-switch activo",
    tickDone: "Tick completado",
    noBotConfig: "No hay configuración de bot",
  } as const;
}

export function getStrategyCopy(locale: Locale = "es"): StrategyCopy {
  return buildStrategyCopy(locale);
}

export function localeFromCookieHeader(
  cookieHeader: string | null,
): Locale {
  if (!cookieHeader) return "es";
  const match = cookieHeader.match(
    /(?:^|;\s*)(?:keelra-locale|pulsetrade-locale)=(es|en)/,
  );
  return match?.[1] === "en" ? "en" : "es";
}
