import type { OperatorBrain, OperatorKnowledge, KnowledgeEffect } from "./brain";
import { extractEffectFromText, inferKnowledgeKind } from "./brain";
import type { OperatorModelInfo } from "./model";
import type { ResearchRunResult } from "./research";
import { getKeelraOperatorSystemPrompt } from "./system-prompt";

export type AgentIntent =
  | "status"
  | "concept"
  | "research"
  | "teach"
  | "general";

export type AgentComposeInput = {
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
  /** Resultado de una research recién hecha para esta pregunta */
  research?: ResearchRunResult | null;
  /** Lecciones nuevas de esa research */
  freshLessons?: OperatorKnowledge[];
};

export type AgentComposeResult = {
  intent: AgentIntent;
  reply: string;
  /** Si true, el API debería lanzar web research antes de responder */
  needsResearch: boolean;
  /** Si true, auto-guardar una lección del concepto/respuesta */
  autoLearn: boolean;
  autoLearnTitle?: string;
  autoLearnContent?: string;
  effect: KnowledgeEffect;
  kind: string;
};

const STATUS_RE =
  /\b(qué has aprendido|que has aprendido|qué aprendiste|que aprendiste|what have you learned|what do you know|muéstrame lo que sabes|muestrame lo que sabes|resumen de (tu |lo )?(cerebro|lecciones)|estado del (bot|operador|cerebro)|brain status|show me what you know)\b/i;

const RESEARCH_RE =
  /\b(noticias|news|hoy|ahora|mercado actual|precio|price|investig|busca en (internet|la web)|search|look up|latest|qué pasa (hoy|en el mercado)|que pasa (hoy|en el mercado)|wall street|fed|etf)\b/i;

const CONCEPT_RE =
  /\b(qué es|que es|qué significa|que significa|explicame|explícame|explica|sabes lo que|sabes qué|sabes que|definición|definicion|diferencia entre|alcista|bajista|bull market|bear market|tendencia|volatilidad|what is|what's|whats|explain|mean by)\b/i;

const TEACH_RE =
  /\b(preferir|prefer|evitar|avoid|siempre|nunca|never|always|regla|rule|más cauteloso|more careful|más agresivo|more aggressive|solo btc|btc only)\b/i;

export function classifyAgentIntent(message: string): AgentIntent {
  const t = message.trim();
  if (TEACH_RE.test(t) && !/\?|¿/.test(t) && !CONCEPT_RE.test(t)) {
    return "teach";
  }
  if (STATUS_RE.test(t)) return "status";
  if (CONCEPT_RE.test(t)) return "concept";
  if (RESEARCH_RE.test(t)) return "research";
  if (/\?|¿/.test(t) || /^(hola|hello|hey|buenas)\b/i.test(t)) {
    return "general";
  }
  if (t.length <= 140 && TEACH_RE.test(t)) return "teach";
  return "general";
}

function relatedKnowledge(
  knowledge: OperatorKnowledge[],
  message: string,
  limit = 5,
): OperatorKnowledge[] {
  const tokens = message
    .toLowerCase()
    .split(/[^a-záéíóúñ0-9]+/i)
    .filter((w) => w.length > 3);
  const scored = knowledge.map((k) => {
    const blob = `${k.title} ${k.content}`.toLowerCase();
    let score = 0;
    for (const tok of tokens) {
      if (blob.includes(tok)) score += 1;
    }
    return { k, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.k);
}

function explainConcept(message: string, locale: "es" | "en"): string | null {
  const t = message.toLowerCase();

  if (
    /\b(alcista|bajista|bull|bear|tendencia alcista|tendencia bajista)\b/.test(t)
  ) {
    if (locale === "en") {
      return [
        "Yes — and this is core to how I trade.",
        "",
        "**Bull market (mercado alcista):** prices make higher highs and higher lows over time. Buyers dominate. Trend-following usually works better: I prefer regimes like `trend_up`, look for pullbacks into support, and I’m more willing to take long setups.",
        "",
        "**Bear market (mercado bajista):** prices make lower highs and lower lows. Sellers dominate. In `trend_down` I get stricter — higher score thresholds, fewer entries, or I stay flat until structure improves.",
        "",
        "**How I use it:** my Operator model + Trend Pulse don’t just “feel” bullish/bearish — they estimate a regime (`trend_up`, `trend_down`, `range`, `high_vol`) from EMAs, slope and volatility. Lessons you teach me (or web research) can bias those regimes.",
        "",
        "Want me to also pull fresh market headlines and say whether the tape looks closer to bull or bear right now?",
      ].join("\n");
    }
    return [
      "Sí — y eso es central en cómo opero.",
      "",
      "**Mercado alcista (bull):** el precio hace máximos y mínimos cada vez más altos. Dominan los compradores. Suele funcionar mejor seguir tendencia: priorizo regímenes como `trend_up`, busco retrocesos a soporte y soy más abierto a entradas long.",
      "",
      "**Mercado bajista (bear):** el precio hace máximos y mínimos cada vez más bajos. Dominan los vendedores. En `trend_down` me pongo más estricto: subo el umbral de score, entro menos, o me quedo flat hasta que mejore la estructura.",
      "",
      "**Cómo lo uso yo:** mi modelo + Trend Pulse no “sienten” alcista/bajista a ojo — estiman un régimen (`trend_up`, `trend_down`, `range`, `high_vol`) con EMAs, pendiente y volatilidad. Las lecciones que me enseñas (o la research web) pueden sesgar esos regímenes.",
      "",
      "¿Quieres que además revise titulares frescos y te diga si el tape se ve más alcista o bajista ahora mismo?",
    ].join("\n");
  }

  if (/\b(volatilidad|volatility|high.?vol)\b/.test(t)) {
    return locale === "en"
      ? [
          "**Volatility** is how violently price moves.",
          "High vol (`high_vol`) means wider swings → I widen caution (stops, fewer marginal entries).",
          "Low/normal vol with a clean trend is usually where Trend Pulse has a cleaner edge.",
        ].join("\n")
      : [
          "**Volatilidad** es qué tan violento se mueve el precio.",
          "Alta vol (`high_vol`) = vaivenes grandes → voy más cauteloso (stops, menos entradas flojas).",
          "Vol normal/baja con tendencia limpia suele ser donde Trend Pulse tiene mejor edge.",
        ].join("\n");
  }

  if (/\b(rsi|ema|atr|stop|take.?profit)\b/.test(t)) {
    return locale === "en"
      ? [
          "Quick toolkit:",
          "• **EMA**: trend direction/structure.",
          "• **ATR**: volatility sizing for stops/targets.",
          "• **RSI**: exhaustion / overbought-oversold filter.",
          "• **Stop / take-profit**: risk and reward rails on every trade.",
          "I combine checklist quality + model score + your lessons before entering.",
        ].join("\n")
      : [
          "Kit rápido:",
          "• **EMA**: dirección/estructura de tendencia.",
          "• **ATR**: volatilidad para stops/objetivos.",
          "• **RSI**: filtro de agotamiento / sobrecompra-sobreventa.",
          "• **Stop / take-profit**: rieles de riesgo y recompensa en cada trade.",
          "Combino calidad del checklist + score del modelo + tus lecciones antes de entrar.",
        ].join("\n");
  }

  return null;
}

function composeStatusReply(input: AgentComposeInput): string {
  const { locale, brain, knowledge, model, calibration } = input;
  const highlights = knowledge.slice(0, 6);
  const webCount = knowledge.filter(
    (k) => k.source === "web_research" || k.source === "ai_consult",
  ).length;
  const active = brain.isActive
    ? locale === "en"
      ? "ON"
      : "encendido"
    : locale === "en"
      ? "OFF"
      : "apagado";

  if (locale === "en") {
    const parts = [
      `Here's my current brain state — not a generic dump for every question, only because you asked what I know.`,
      "",
      `Status: ${active}. Model ${model.version}. Active lessons: ${knowledge.length} (${webCount} from web).`,
      "",
      "Highlights:",
    ];
    for (const k of highlights) {
      parts.push(`• ${k.title.slice(0, 100)}`);
    }
    if (calibration.some((c) => c.tradesCount > 0)) {
      parts.push("", "Calibration samples:");
      for (const c of calibration.filter((x) => x.tradesCount > 0).slice(0, 4)) {
        parts.push(
          `• ${c.regime}: ${c.tradesCount} trades, WR ${
            c.winRate == null ? "—" : `${Math.round(c.winRate * 100)}%`
          }`,
        );
      }
    }
    return parts.join("\n");
  }

  const parts = [
    `Este es el estado de mi cerebro — no es mi respuesta por defecto a cualquier pregunta; lo doy porque me pediste qué sé.`,
    "",
    `Estado: ${active}. Modelo ${model.version}. Lecciones activas: ${knowledge.length} (${webCount} de web).`,
    "",
    "Destacados:",
  ];
  for (const k of highlights) {
    parts.push(`• ${k.title.slice(0, 100)}`);
  }
  if (calibration.some((c) => c.tradesCount > 0)) {
    parts.push("", "Muestras de calibración:");
    for (const c of calibration.filter((x) => x.tradesCount > 0).slice(0, 4)) {
      parts.push(
        `• ${c.regime}: ${c.tradesCount} trades, WR ${
          c.winRate == null ? "—" : `${Math.round(c.winRate * 100)}%`
        }`,
      );
    }
  }
  return parts.join("\n");
}

function composeResearchReply(input: AgentComposeInput): string {
  const { locale, research, freshLessons, knowledge, message } = input;
  const lessons = freshLessons?.length
    ? freshLessons
    : relatedKnowledge(knowledge, message, 6);

  if (locale === "en") {
    const parts = [
      `I went out and checked live trading/crypto feeds for: “${message.slice(0, 100)}”.`,
      research
        ? `Research run: ${research.sourcesOk} sources ok, saw ${research.itemsSeen}, learned ${research.itemsLearned} new items.`
        : "Using the freshest lessons already in my brain.",
      "",
      "What stands out:",
    ];
    if (!lessons.length) {
      parts.push("• No strong new headlines matched — I can dig again or you can narrow the topic.");
    } else {
      for (const k of lessons.slice(0, 6)) {
        parts.push(`• ${k.title}`);
      }
    }
    parts.push(
      "",
      "How I’ll use it: bias entries toward supportive pairs/regimes and stay stricter where news looks risk-off.",
      "If this read is useful, hit “Save exchange” so we keep this analysis together.",
    );
    return parts.join("\n");
  }

  const parts = [
    `Salí a revisar feeds vivos de trading/crypto por: “${message.slice(0, 100)}”.`,
    research
      ? `Corrida: ${research.sourcesOk} fuentes ok, vi ${research.itemsSeen}, aprendí ${research.itemsLearned} ítems nuevos.`
      : "Uso las lecciones más frescas que ya tengo en el cerebro.",
    "",
    "Lo que destaca:",
  ];
  if (!lessons.length) {
    parts.push(
      "• No hubo titulares fuertes nuevos — puedo volver a investigar o acotas el tema.",
    );
  } else {
    for (const k of lessons.slice(0, 6)) {
      parts.push(`• ${k.title}`);
    }
  }
  parts.push(
    "",
    "Cómo lo uso: sesgo entradas hacia pares/regímenes favorables y más estricto si el tape se ve risk-off.",
    "Si este análisis te sirve, pulsa “Guardar intercambio” para conservar pregunta + respuesta.",
  );
  return parts.join("\n");
}

function composeGeneralReply(input: AgentComposeInput): string {
  const related = relatedKnowledge(input.knowledge, input.message, 4);
  const concept = explainConcept(input.message, input.locale);

  if (concept) return concept;

  if (input.locale === "en") {
    const parts = [
      `I read your message carefully: “${input.message.slice(0, 160)}”.`,
      "",
      "I’m not dumping my whole brain unless you ask for status. Here’s a direct take:",
    ];
    if (related.length) {
      parts.push("", "Related things I already know:");
      for (const k of related) parts.push(`• ${k.title}`);
    } else {
      parts.push(
        "",
        "I don’t have a matching lesson yet. I can research the web for fresh context if you ask me to investigate, or teach me a rule.",
      );
    }
    parts.push(
      "",
      "Ask me a sharper question (concept, news, or “what have you learned”) and I’ll go deeper — including live research when needed.",
    );
    return parts.join("\n");
  }

  const parts = [
    `Leí con cuidado tu mensaje: “${input.message.slice(0, 160)}”.`,
    "",
    "No te voy a tirar todo el cerebro a menos que pidas estado. Aquí va una respuesta directa:",
  ];
  if (related.length) {
    parts.push("", "Cosas relacionadas que ya sé:");
    for (const k of related) parts.push(`• ${k.title}`);
  } else {
    parts.push(
      "",
      "Todavía no tengo una lección que encaje. Puedo investigar en internet si me pides que busque, o me enseñas una regla.",
    );
  }
  parts.push(
    "",
    "Hazme una pregunta más concreta (concepto, noticias, o “qué has aprendido”) y profundizo — incluyendo research en vivo cuando haga falta.",
  );
  return parts.join("\n");
}

function composeTeachReply(locale: "es" | "en", kind: string, effect: KnowledgeEffect): string {
  const keys = Object.keys(effect).filter((k) => k !== "note");
  if (locale === "en") {
    return [
      keys.length
        ? `Got it as a possible “${kind}” rule. Cues: ${keys.join(", ")}.`
        : `I hear a possible “${kind}” lesson.`,
      "",
      "I won’t lock it in until you click “Save exchange” — that keeps your words and my analysis together, like a human deciding what matters.",
    ].join("\n");
  }
  return [
    keys.length
      ? `Lo tomo como posible regla “${kind}”. Señales: ${keys.join(", ")}.`
      : `Escucho una posible lección “${kind}”.`,
    "",
    "No la fijo hasta que pulses “Guardar intercambio” — así conservamos tus palabras y mi análisis, como un humano eligiendo qué importa.",
  ].join("\n");
}

/**
 * Primera pasada: decide intent y si necesita salir a internet.
 * Si needsResearch=true, el API debe investigar y volver a llamar con research/freshLessons.
 */
export function planOperatorAgent(input: AgentComposeInput): AgentComposeResult {
  const intent = classifyAgentIntent(input.message);
  const effect = extractEffectFromText(input.message);
  const kind = inferKnowledgeKind(input.message);

  if (intent === "research" && !input.research) {
    return {
      intent,
      reply: "",
      needsResearch: true,
      autoLearn: false,
      effect,
      kind,
    };
  }

  return finalizeOperatorAgent(input, intent);
}

export function finalizeOperatorAgent(
  input: AgentComposeInput,
  intent: AgentIntent = classifyAgentIntent(input.message),
): AgentComposeResult {
  const effect = extractEffectFromText(input.message);
  const kind = inferKnowledgeKind(input.message);

  if (intent === "status") {
    return {
      intent,
      reply: composeStatusReply(input),
      needsResearch: false,
      autoLearn: false,
      effect,
      kind,
    };
  }

  if (intent === "teach") {
    return {
      intent,
      reply: composeTeachReply(input.locale, kind, effect),
      needsResearch: false,
      autoLearn: false,
      effect,
      kind,
    };
  }

  if (intent === "research") {
    return {
      intent,
      reply: composeResearchReply(input),
      needsResearch: false,
      autoLearn: false,
      effect,
      kind,
    };
  }

  if (intent === "concept") {
    const explained = explainConcept(input.message, input.locale);
    const related = relatedKnowledge(input.knowledge, input.message, 3);
    let reply =
      explained ??
      (input.locale === "en"
        ? `Here’s how I understand it as a trading operator.\n\n${composeGeneralReply(input)}`
        : `Así lo entiendo como operador de trading.\n\n${composeGeneralReply(input)}`);

    if (explained && related.length) {
      reply +=
        input.locale === "en"
          ? `\n\nRelated lessons I already hold:\n${related.map((k) => `• ${k.title}`).join("\n")}`
          : `\n\nLecciones relacionadas que ya tengo:\n${related.map((k) => `• ${k.title}`).join("\n")}`;
    }

    const autoTitle =
      input.locale === "en"
        ? `Concept: ${input.message.slice(0, 80)}`
        : `Concepto: ${input.message.slice(0, 80)}`;

    return {
      intent,
      reply,
      needsResearch: false,
      autoLearn: Boolean(explained),
      autoLearnTitle: autoTitle,
      autoLearnContent: reply.slice(0, 2000),
      effect: {
        ...effect,
        note: autoTitle.slice(0, 240),
        ...(explained && /alcista|bull/i.test(input.message)
          ? { preferRegime: "trend_up" as const, scoreDelta: 2 }
          : {}),
        ...(explained && /bajista|bear/i.test(input.message)
          ? { avoidRegime: "trend_down" as const, minScoreDelta: 2 }
          : {}),
      },
      kind: "lesson",
    };
  }

  // general — if it smells like current market, research
  if (RESEARCH_RE.test(input.message) && !input.research) {
    return {
      intent: "research",
      reply: "",
      needsResearch: true,
      autoLearn: false,
      effect,
      kind,
    };
  }

  return {
    intent: "general",
    reply: composeGeneralReply(input),
    needsResearch: false,
    autoLearn: false,
    effect,
    kind,
  };
}

/** Compatible wrapper usado por Testing / código viejo */
export function composeOperatorChatReply(input: AgentComposeInput) {
  const planned = planOperatorAgent(input);
  const final =
    planned.needsResearch && !input.research
      ? finalizeOperatorAgent(input, "general")
      : planned.needsResearch
        ? finalizeOperatorAgent(input, planned.intent)
        : planned;

  return {
    intent: final.intent === "teach" ? ("teach" as const) : ("question" as const),
    reply: final.reply,
    shouldPersist: false,
    effect: final.effect,
    kind: final.kind,
    title: input.message.slice(0, 72),
    agent: final,
  };
}

/**
 * Capa de VOZ / interpretación (Groq u OpenAI).
 * NO es la conciencia del bot: el borrador local (knowledge + oficio + research)
 * es la fuente de verdad. El LLM solo aclara y comunica ese borrador.
 * Si falla o no hay key → null y el caller usa el draft.
 */
export async function refineReplyWithLlm(opts: {
  locale: "es" | "en";
  message: string;
  draftReply: string;
  knowledgeTitles: string[];
  /** Fragmentos de lecciones (contenido), no solo títulos */
  knowledgeSnippets?: string[];
  researchSummary?: string;
}): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const key = groqKey || openaiKey;
  if (!key) return null;

  const usingGroq = Boolean(groqKey);
  const baseUrl = usingGroq
    ? "https://api.groq.com/openai/v1"
    : process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model =
    process.env.GROQ_MODEL ||
    process.env.OPENAI_MODEL ||
    (usingGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini");

  const voiceRules =
    opts.locale === "en"
      ? `## Intermediary + study voice (CRITICAL)
You help the human talk to Keelra Operator and help the Operator interpret clearly.
- The DRAFT is the Operator's current answer from its own memory/craft. Do not contradict it.
- Clarify language; you may lightly structure it. Do not invent prices, setups, or rules absent from draft/lessons/research.
- You are a tutor/bridge while the Operator is still learning — not the owner of its conscience.
- Max ~400 words.`
      : `## Intermediario + voz de estudio (CRÍTICO)
Ayudas al humano a hablar con el Operador Keelra y al Operador a interpretarse con claridad.
- El BORRADOR es la respuesta actual del Operador desde su memoria/oficio. No lo contradigas.
- Aclara el lenguaje; puedes estructurar un poco. No inventes precios, setups o reglas ausentes del borrador/lecciones/research.
- Eres puente/tutor mientras el Operador aún aprende — no el dueño de su conciencia.
- Máx ~400 palabras.`;

  const system = `${getKeelraOperatorSystemPrompt(opts.locale)}

${voiceRules}`;

  const snippets = (opts.knowledgeSnippets ?? []).filter(Boolean).slice(0, 6);

  const user = [
    `User question: ${opts.message}`,
    `OPERATOR DRAFT (source of truth — do not contradict):\n${opts.draftReply}`,
    opts.knowledgeTitles.length
      ? `Lesson titles on file:\n${opts.knowledgeTitles.map((t) => `- ${t}`).join("\n")}`
      : "",
    snippets.length
      ? `Lesson excerpts (Operator memory):\n${snippets.map((s, i) => `(${i + 1}) ${s}`).join("\n\n")}`
      : "",
    opts.researchSummary
      ? `Research summary already absorbed by Operator:\n${opts.researchSummary}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.15,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[operator-llm]", res.status, errText.slice(0, 200));
      return null;
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = json.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch (e) {
    console.error("[operator-llm]", e);
    return null;
  }
}
