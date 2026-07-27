import type { OperatorBrain, OperatorKnowledge, KnowledgeEffect } from "./brain";
import { extractEffectFromText, inferKnowledgeKind } from "./brain";
import type { OperatorModelInfo } from "./model";

export type OperatorChatIntent = "question" | "teach";

export type OperatorChatComposeInput = {
  message: string;
  locale: "es" | "en";
  brain: OperatorBrain;
  knowledge: OperatorKnowledge[];
  model: OperatorModelInfo;
  calibration: Array<{
    regime: string;
    tradesCount: number;
    winRate: number | null;
  }>;
};

export type OperatorChatComposeResult = {
  intent: OperatorChatIntent;
  reply: string;
  shouldPersist: boolean;
  effect: KnowledgeEffect;
  kind: string;
  title: string;
};

const QUESTION_RE =
  /(\?|¿|^(hola|hello|hey|buenas)\b|\b(qué|que|cómo|como|cuál|cual|dime|explícame|explicame|cuéntame|cuentame|resume|resumen|aprendido|aprendiste|sabes|sabe|estado|status|what|how|tell me|summarize|learned|know|explain)\b)/i;

const TEACH_RE =
  /\b(preferir|prefer|evitar|avoid|siempre|nunca|never|always|regla|rule|más cauteloso|more careful|más agresivo|more aggressive|solo btc|btc only|cuidado en rango|cautious in range|alta volatilidad|high vol|no entrar|favor uptrend|en tendencia)\b/i;

export function classifyOperatorMessage(message: string): OperatorChatIntent {
  const t = message.trim();
  const looksQuestion = QUESTION_RE.test(t);
  const looksTeach = TEACH_RE.test(t);

  if (looksQuestion && !looksTeach) return "question";
  if (looksTeach && !looksQuestion) return "teach";
  if (looksQuestion) return "question";
  if (looksTeach) return "teach";
  // Frases cortas tipo instrucción sin signos → enseñar
  if (t.length <= 140 && !t.includes("?")) return "teach";
  return "question";
}

function sourceLabel(source: string, locale: "es" | "en"): string {
  if (source === "web_research") {
    return locale === "en" ? "web news" : "noticias web";
  }
  if (source === "chat") {
    return locale === "en" ? "manual lesson" : "lección manual";
  }
  if (source === "test_promote" || source === "test_lab") {
    return locale === "en" ? "promoted test" : "prueba promovida";
  }
  if (source === "sandbox") {
    return locale === "en" ? "sandbox experience" : "experiencia sandbox";
  }
  return source;
}

function kindLabel(kind: string, locale: "es" | "en"): string {
  const mapEs: Record<string, string> = {
    market: "mercado",
    strategy: "estrategia",
    rule: "regla",
    lesson: "lección",
  };
  const mapEn: Record<string, string> = {
    market: "market",
    strategy: "strategy",
    rule: "rule",
    lesson: "lesson",
  };
  return (locale === "en" ? mapEn : mapEs)[kind] ?? kind;
}

function summarizeEffects(
  knowledge: OperatorKnowledge[],
  locale: "es" | "en",
): string[] {
  const preferPairs = new Set<string>();
  const avoidPairs = new Set<string>();
  const preferRegimes = new Set<string>();
  const avoidRegimes = new Set<string>();
  let bias = 0;

  for (const k of knowledge) {
    k.effect.preferPairs?.forEach((p) => preferPairs.add(p));
    k.effect.avoidPairs?.forEach((p) => avoidPairs.add(p));
    if (k.effect.preferRegime) preferRegimes.add(k.effect.preferRegime);
    if (k.effect.avoidRegime) avoidRegimes.add(k.effect.avoidRegime);
    if (typeof k.effect.scoreDelta === "number") bias += k.effect.scoreDelta;
  }

  const lines: string[] = [];
  if (preferPairs.size) {
    lines.push(
      locale === "en"
        ? `I lean toward pairs: ${[...preferPairs].join(", ")}.`
        : `Inclino hacia pares: ${[...preferPairs].join(", ")}.`,
    );
  }
  if (avoidPairs.size) {
    lines.push(
      locale === "en"
        ? `I avoid or am stricter with: ${[...avoidPairs].join(", ")}.`
        : `Evito o soy más estricto con: ${[...avoidPairs].join(", ")}.`,
    );
  }
  if (preferRegimes.size) {
    lines.push(
      locale === "en"
        ? `Preferred regimes: ${[...preferRegimes].join(", ")}.`
        : `Regímenes que priorizo: ${[...preferRegimes].join(", ")}.`,
    );
  }
  if (avoidRegimes.size) {
    lines.push(
      locale === "en"
        ? `Regimes I treat carefully: ${[...avoidRegimes].join(", ")}.`
        : `Regímenes donde voy con cuidado: ${[...avoidRegimes].join(", ")}.`,
    );
  }
  if (bias !== 0) {
    lines.push(
      locale === "en"
        ? `Net score bias from lessons: ${bias > 0 ? "+" : ""}${bias}.`
        : `Sesgo neto de score por lecciones: ${bias > 0 ? "+" : ""}${bias}.`,
    );
  }
  return lines;
}

function pickHighlights(
  knowledge: OperatorKnowledge[],
  limit = 6,
): OperatorKnowledge[] {
  const manual = knowledge.filter(
    (k) =>
      k.source === "chat" ||
      k.source === "test_promote" ||
      k.source === "test_lab" ||
      k.source === "sandbox",
  );
  const web = knowledge.filter((k) => k.source === "web_research");
  const other = knowledge.filter(
    (k) =>
      k.source !== "chat" &&
      k.source !== "web_research" &&
      k.source !== "test_promote" &&
      k.source !== "test_lab" &&
      k.source !== "sandbox",
  );
  const out: OperatorKnowledge[] = [];
  for (const list of [manual, web, other]) {
    for (const k of list) {
      if (out.length >= limit) break;
      out.push(k);
    }
  }
  return out.slice(0, limit);
}

function cleanTitle(title: string): string {
  return title.replace(/\s+/g, " ").trim().slice(0, 110);
}

function composeQuestionReply(input: OperatorChatComposeInput): string {
  const { locale, brain, knowledge, model, calibration, message } = input;
  const highlights = pickHighlights(knowledge, 6);
  const effects = summarizeEffects(knowledge, locale);
  const webCount = knowledge.filter((k) => k.source === "web_research").length;
  const manualCount = knowledge.filter(
    (k) => k.source === "chat" || k.source === "test_promote",
  ).length;
  const active =
    locale === "en"
      ? brain.isActive
        ? "ON"
        : "OFF"
      : brain.isActive
        ? "encendido"
        : "apagado";

  const calLines = calibration
    .filter((c) => c.tradesCount > 0)
    .slice(0, 4)
    .map((c) => {
      const wr =
        c.winRate == null
          ? "—"
          : `${Math.round(c.winRate * 100)}%`;
      return locale === "en"
        ? `• ${c.regime}: ${c.tradesCount} trades, win rate ${wr}`
        : `• ${c.regime}: ${c.tradesCount} trades, win rate ${wr}`;
    });

  if (locale === "en") {
    const parts = [
      `Hi — I read your question (“${message.slice(0, 90)}${message.length > 90 ? "…" : ""}”) and reviewed my global brain.`,
      "",
      `Right now I'm ${active}. Model ${model.version}. Active lessons: ${knowledge.length} (${manualCount} manual, ${webCount} from web research).`,
      brain.lastResearchAt
        ? `Last web research: ${new Date(brain.lastResearchAt).toISOString().slice(0, 16).replace("T", " ")} UTC (learned ${brain.researchItemsCount} items that run).`
        : "I haven't run web research yet.",
      "",
      "What I've learned so far (highlights):",
    ];

    if (highlights.length === 0) {
      parts.push("• Still light on permanent lessons — teach me a rule or wait for the next research run.");
    } else {
      for (const k of highlights) {
        parts.push(
          `• [${kindLabel(k.kind, "en")} · ${sourceLabel(k.source, "en")}] ${cleanTitle(k.title)}`,
        );
      }
    }

    if (effects.length) {
      parts.push("", "How that shapes my trading:");
      for (const line of effects) parts.push(`• ${line}`);
    }

    if (calLines.length) {
      parts.push("", "Calibration from closed trades:");
      parts.push(...calLines);
    }

    parts.push(
      "",
      "I can enter when Trend Pulse or my opportunity score says go, biased by these lessons — unless I'm turned OFF.",
      "Want a deeper dive on one lesson, or teach me a new rule (e.g. “prefer uptrend”, “avoid ETH”)?",
    );
    return parts.join("\n");
  }

  const parts = [
    `Hola — leí tu pregunta (“${message.slice(0, 90)}${message.length > 90 ? "…" : ""}”) y revisé mi cerebro global.`,
    "",
    `Ahora mismo estoy ${active}. Modelo ${model.version}. Lecciones activas: ${knowledge.length} (${manualCount} manuales, ${webCount} de investigación web).`,
    brain.lastResearchAt
      ? `Última investigación web: ${new Date(brain.lastResearchAt).toISOString().slice(0, 16).replace("T", " ")} UTC (aprendí ${brain.researchItemsCount} ítems en esa corrida).`
      : "Todavía no he corrido investigación web.",
    "",
    "Por el momento he aprendido esto (resumen):",
  ];

  if (highlights.length === 0) {
    parts.push(
      "• Aún tengo pocas lecciones permanentes — enséñame una regla o espera la próxima research.",
    );
  } else {
    for (const k of highlights) {
      parts.push(
        `• [${kindLabel(k.kind, "es")} · ${sourceLabel(k.source, "es")}] ${cleanTitle(k.title)}`,
      );
    }
  }

  if (effects.length) {
    parts.push("", "Con eso, así pienso al operar:");
    for (const line of effects) parts.push(`• ${line}`);
  }

  if (calLines.length) {
    parts.push("", "Calibración con trades cerrados:");
    parts.push(...calLines);
  }

  parts.push(
    "",
    "Puedo entrar cuando Trend Pulse o mi score de oportunidad lo indiquen, sesgado por estas lecciones — salvo que esté apagado.",
    "¿Quieres que profundice en alguna lección, o me enseñas una regla nueva (ej. “preferir alcista”, “evitar ETH”)?",
  );
  return parts.join("\n");
}

function composeTeachHint(
  locale: "es" | "en",
  kind: string,
  effect: KnowledgeEffect,
): string {
  const keys = Object.keys(effect).filter((k) => k !== "note");
  if (locale === "en") {
    return keys.length
      ? `I understand that as a possible “${kind}” rule. Detected cues: ${keys.join(", ")}.`
      : `I read that as a possible “${kind}” lesson. Clearer rules work better (e.g. “prefer uptrend”, “avoid ETH”).`;
  }
  return keys.length
    ? `Entiendo eso como una posible regla “${kind}”. Señales detectadas: ${keys.join(", ")}.`
    : `Leí eso como una posible lección “${kind}”. Reglas claras funcionan mejor (ej. “preferir alcista”, “evitar ETH”).`;
}

/**
 * Analiza el mensaje + estado del cerebro y compone una respuesta conversacional.
 * Nunca persiste solo: aprender es explícito (botón Guardar / Testing / Sandbox).
 */
export function composeOperatorChatReply(
  input: OperatorChatComposeInput,
): OperatorChatComposeResult {
  const intent = classifyOperatorMessage(input.message);
  const effect = extractEffectFromText(input.message);
  const kind = inferKnowledgeKind(input.message);
  const title =
    input.message.length > 72
      ? `${input.message.slice(0, 69)}…`
      : input.message;

  if (intent === "question") {
    return {
      intent,
      reply: composeQuestionReply(input),
      shouldPersist: false,
      effect,
      kind,
      title,
    };
  }

  const tip =
    input.locale === "en"
      ? `\n\nIf you want me to keep this permanently, click “Save as lesson” on your message.`
      : `\n\nSi quieres que lo guarde para siempre, pulsa “Guardar como lección” en tu mensaje.`;

  return {
    intent: "teach",
    reply: `${composeTeachHint(input.locale, kind, effect)}${tip}`,
    shouldPersist: false,
    effect,
    kind,
    title,
  };
}
