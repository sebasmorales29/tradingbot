import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  extractEffectFromText,
  inferKnowledgeKind,
  type KnowledgeEffect,
} from "./brain";
import { FORMATION_RESEARCH_QUERIES } from "./formation-doctrine";

type Client = SupabaseClient<Database>;

export type ResearchFeed = {
  id: string;
  name: string;
  url: string;
  track: "news" | "education";
};

/**
 * Fuentes públicas RSS.
 * - news: tape / titulares al día
 * - education: teoría, métodos, conceptos, cómo operar
 */
export const TRADING_RESEARCH_FEEDS: ResearchFeed[] = [
  {
    id: "coindesk",
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
    track: "news",
  },
  {
    id: "cointelegraph",
    name: "Cointelegraph",
    url: "https://cointelegraph.com/rss",
    track: "news",
  },
  {
    id: "yahoo-btc",
    name: "Yahoo Finance BTC",
    url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=BTC-USD&region=US&lang=en-US",
    track: "news",
  },
  {
    id: "yahoo-eth",
    name: "Yahoo Finance ETH",
    url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=ETH-USD&region=US&lang=en-US",
    track: "news",
  },
  {
    id: "babypips",
    name: "BabyPips",
    url: "https://www.babypips.com/feed",
    track: "education",
  },
  {
    id: "investopedia",
    name: "Investopedia",
    url: "https://www.investopedia.com/feedbuilder/feed/getfeed?feedName=rss_articles",
    track: "education",
  },
];

/** Temario rotativo: alineado a la doctrina de formación. */
export const TRADING_CURRICULUM_TOPICS: string[] = FORMATION_RESEARCH_QUERIES;

export type ResearchItem = {
  sourceId: string;
  sourceName: string;
  title: string;
  summary: string;
  link: string;
  publishedAt: string | null;
  track: "news" | "education";
};

export type ResearchRunResult = {
  sourcesOk: number;
  sourcesFailed: number;
  itemsSeen: number;
  itemsLearned: number;
  learnedTitles: string[];
  summary: string;
};

function decodeXml(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tagContent(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  return m ? decodeXml(m[1]) : "";
}

function parseRssItems(
  xml: string,
  feed: Pick<ResearchFeed, "id" | "name" | "track">,
  limit = 12,
): ResearchItem[] {
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  const items: ResearchItem[] = [];
  for (const chunk of chunks.slice(0, limit)) {
    const title = tagContent(chunk, "title");
    if (!title) continue;
    const description =
      tagContent(chunk, "description") || tagContent(chunk, "content:encoded");
    const link = tagContent(chunk, "link");
    const pub =
      tagContent(chunk, "pubDate") ||
      tagContent(chunk, "published") ||
      tagContent(chunk, "dc:date");
    items.push({
      sourceId: feed.id,
      sourceName: feed.name,
      title: title.slice(0, 180),
      summary: description.slice(0, 500),
      link: link.slice(0, 400),
      publishedAt: pub || null,
      track: feed.track,
    });
  }
  return items;
}

async function fetchFeed(feed: ResearchFeed): Promise<ResearchItem[]> {
  const res = await fetch(feed.url, {
    headers: {
      "User-Agent": "KeelraOperatorResearch/1.0 (+training)",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`${feed.id} HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseRssItems(xml, feed);
}

async function fetchCurriculumTopic(topic: string): Promise<ResearchItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    topic,
  )}&hl=en-US&gl=US&ceid=US:en`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "KeelraOperatorResearch/1.0 (+curriculum)",
      Accept: "application/rss+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`curriculum HTTP ${res.status}`);
  }
  const xml = await res.text();
  return parseRssItems(
    xml,
    {
      id: `curriculum-${normalizeTitleKey(topic).slice(0, 24)}`,
      name: `Curriculum: ${topic}`,
      track: "education",
    },
    8,
  );
}

function todaysCurriculumTopics(count = 3): string[] {
  const day = Math.floor(Date.now() / 86_400_000);
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    out.push(
      TRADING_CURRICULUM_TOPICS[
        (day + i * 3) % TRADING_CURRICULUM_TOPICS.length
      ],
    );
  }
  return out;
}

function sentimentEffect(text: string, track: "news" | "education"): KnowledgeEffect {
  const base = extractEffectFromText(text);
  const t = text.toLowerCase();

  if (track === "education") {
    if (/\b(trend following|uptrend|alcista|higher high|pullback entry)\b/i.test(t)) {
      base.preferRegime = base.preferRegime ?? "trend_up";
      base.scoreDelta = (base.scoreDelta ?? 0) + 2;
    }
    if (/\b(downtrend|bajista|lower low|short bias|risk.?off)\b/i.test(t)) {
      base.avoidRegime = base.avoidRegime ?? "trend_down";
      base.minScoreDelta = (base.minScoreDelta ?? 0) + 2;
    }
    if (/\b(range|sideways|chop|mean reversion)\b/i.test(t)) {
      base.avoidRegime = base.avoidRegime ?? "range";
      base.minScoreDelta = (base.minScoreDelta ?? 0) + 3;
      base.scoreDelta = (base.scoreDelta ?? 0) - 2;
    }
    if (/\b(volatility|atr|high vol|widening)\b/i.test(t)) {
      base.avoidRegime = base.avoidRegime ?? "high_vol";
      base.minScoreDelta = (base.minScoreDelta ?? 0) + 2;
    }
    if (/\b(risk management|position size|stop loss|expectancy|discipline|fomo)\b/i.test(t)) {
      base.minScoreDelta = (base.minScoreDelta ?? 0) + 2;
      base.scoreDelta = (base.scoreDelta ?? 0) - 1;
    }
    base.note = `[curriculum] ${text.slice(0, 220)}`;
    return base;
  }

  const bull =
    /\b(rally|surge|soar|bull|all-time high|ath|adoption|etf approval|rate cut|risk-on)\b/i.test(
      t,
    ) ||
    /\b(alcista|sube|rompe|máximo|adopción|aprobaci[oó]n)\b/i.test(t);
  const bear =
    /\b(crash|plunge|sell-off|bear|hack|lawsuit|ban|inflation|risk-off|liquidation)\b/i.test(
      t,
    ) ||
    /\b(bajista|cae|colapso|hackeo|demanda|prohibici[oó]n|liquidaci[oó]n)\b/i.test(
      t,
    );

  if (bull && !bear) {
    base.preferRegime = base.preferRegime ?? "trend_up";
    base.scoreDelta = (base.scoreDelta ?? 0) + 3;
    base.minScoreDelta = (base.minScoreDelta ?? 0) - 2;
  } else if (bear && !bull) {
    base.avoidRegime = base.avoidRegime ?? "high_vol";
    base.scoreDelta = (base.scoreDelta ?? 0) - 3;
    base.minScoreDelta = (base.minScoreDelta ?? 0) + 3;
  }

  if (/\bbtc|bitcoin\b/i.test(t)) {
    base.preferPairs = Array.from(
      new Set([...(base.preferPairs ?? []), "BTC/USDT"]),
    );
  }
  if (/\beth|ethereum\b/i.test(t)) {
    base.preferPairs = Array.from(
      new Set([...(base.preferPairs ?? []), "ETH/USDT"]),
    );
  }

  base.note = text.slice(0, 240);
  return base;
}

function normalizeTitleKey(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9áéíóúñ ]/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function inferResearchKind(
  text: string,
  track: "news" | "education",
): string {
  if (track === "education") {
    const t = text.toLowerCase();
    if (/\b(strategy|estrateg|method|método|setup|system)\b/i.test(t)) {
      return "strategy";
    }
    if (/\b(risk|stop|sizing|expectancy|disciplina|psychology|fomo)\b/i.test(t)) {
      return "rule";
    }
    if (/\b(definition|what is|concepto|terminolog|glossary)\b/i.test(t)) {
      return "lesson";
    }
    return "strategy";
  }
  const kind = inferKnowledgeKind(text);
  return kind === "note" ? "market" : kind;
}

/**
 * Distila un ítem educativo a lección accionable (si hay Groq/OpenAI).
 * El LLM es herramienta del Operador para interpretar la fuente — no inventa el edge.
 */
async function distillLesson(item: ResearchItem): Promise<string | null> {
  const key = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!key || item.track !== "education") return null;

  const usingGroq = Boolean(process.env.GROQ_API_KEY);
  const baseUrl = usingGroq
    ? "https://api.groq.com/openai/v1"
    : process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model =
    process.env.GROQ_MODEL ||
    process.env.OPENAI_MODEL ||
    (usingGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini");

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content:
              "You are a STUDY TOOL used by Keelra Operator to interpret sources. Extract ONLY what is in the article into a permanent lesson the Operator will own: (1) concept in 1 line, (2) when to apply, (3) when NOT to apply, (4) operational rule for Spot long-only crypto. Do not invent strategies or numbers absent from the source. Max 180 words. No hype.",
          },
          {
            role: "user",
            content: `Title: ${item.title}\nSummary: ${item.summary}\nSource: ${item.sourceName}`,
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return json.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

/**
 * El Operador consulta a la AI (Groq) sobre un tema del temario y se queda
 * con la lección en su cerebro. La AI enseña/interpreta; la memoria es de Keelra.
 */
async function consultAiOnCurriculumTopic(
  topic: string,
): Promise<{ title: string; content: string } | null> {
  const key = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return null;

  const usingGroq = Boolean(process.env.GROQ_API_KEY);
  const baseUrl = usingGroq
    ? "https://api.groq.com/openai/v1"
    : process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
  const model =
    process.env.GROQ_MODEL ||
    process.env.OPENAI_MODEL ||
    (usingGroq ? "llama-3.3-70b-versatile" : "gpt-4o-mini");

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content: `You are a tutoring instrument for Keelra Operator (Spot long-only crypto).
The Operator is asking you so IT can learn and store the answer as its own craft.
Teach professional trading craft: when yes, when no, risk, structure.
Format:
REGLA: ...
CUÁNDO APLICA: ...
CUÁNDO NO: ...
POR QUÉ: ...
EFECTO: (más cautela | más permisivo | flat | subir umbral)
Max 220 words. No get-rich hype. No invent live prices.`,
          },
          {
            role: "user",
            content: `Operador Keelra consulta para aprender y guardar en su cerebro:\nTema: ${topic}\nEnséñame una lección accionable de oficio.`,
          },
        ],
      }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();
    if (!content) return null;
    const title = `AI consult: ${topic}`.slice(0, 120);
    return { title, content: content.slice(0, 2200) };
  } catch {
    return null;
  }
}

function prioritizeItems(items: ResearchItem[]): ResearchItem[] {
  const education = items.filter((i) => i.track === "education");
  const news = items.filter((i) => i.track === "news");
  // ~65% educación / teoría, ~35% noticias de mercado
  const out: ResearchItem[] = [];
  let e = 0;
  let n = 0;
  while (e < education.length || n < news.length) {
    for (let i = 0; i < 2 && e < education.length; i++) {
      out.push(education[e++]);
    }
    if (n < news.length) out.push(news[n++]);
  }
  return out;
}

/**
 * Entrenamiento web del Operador:
 * teoría + métodos + terminología + tape, convertidos en lecciones permanentes.
 */
export async function runOperatorWebResearch(
  supabase: Client,
  opts?: {
    triggeredBy?: string;
    maxLearn?: number;
    focus?: "all" | "news" | "education";
  },
): Promise<ResearchRunResult> {
  const triggeredBy = opts?.triggeredBy ?? "manual";
  const maxLearn = opts?.maxLearn ?? 12;
  const focus = opts?.focus ?? "all";

  const { data: runRow } = await supabase
    .from("operator_research_runs")
    .insert({
      triggered_by: triggeredBy,
      started_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  let sourcesOk = 0;
  let sourcesFailed = 0;
  const collected: ResearchItem[] = [];

  const feeds = TRADING_RESEARCH_FEEDS.filter((f) => {
    if (focus === "all") return true;
    return f.track === focus;
  });

  for (const feed of feeds) {
    try {
      const items = await fetchFeed(feed);
      collected.push(...items);
      sourcesOk += 1;
    } catch {
      sourcesFailed += 1;
    }
  }

  if (focus === "all" || focus === "education") {
    for (const topic of todaysCurriculumTopics(3)) {
      try {
        const items = await fetchCurriculumTopic(topic);
        collected.push(...items);
        sourcesOk += 1;
      } catch {
        sourcesFailed += 1;
      }
    }
  }

  const { data: existing } = await supabase
    .from("operator_knowledge")
    .select("title, source")
    .in("source", ["web_research", "ai_consult"])
    .order("created_at", { ascending: false })
    .limit(400);

  const seen = new Set(
    (existing ?? []).map((r) => normalizeTitleKey(String(r.title))),
  );

  const learnedTitles: string[] = [];
  let itemsLearned = 0;
  const ordered = prioritizeItems(collected);

  // Reserva cupos para que el Operador consulte a la AI (Groq) y se quede con la lección
  const aiConsultBudget =
    focus === "news" ? 0 : Math.min(3, Math.max(1, Math.floor(maxLearn * 0.25)));
  const feedBudget = Math.max(0, maxLearn - aiConsultBudget);

  for (const item of ordered) {
    if (itemsLearned >= feedBudget) break;
    const key = normalizeTitleKey(item.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const distilled = await distillLesson(item);
    const body = [
      item.track === "education" ? "[TRAINING / THEORY]" : "[MARKET TAPE]",
      item.title,
      distilled || item.summary,
      item.link
        ? `Source: ${item.sourceName} · ${item.link}`
        : `Source: ${item.sourceName}`,
      item.publishedAt ? `Published: ${item.publishedAt}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const effect = sentimentEffect(
      `${item.title}. ${distilled || item.summary}`,
      item.track,
    );
    const kind = inferResearchKind(
      `${item.title} ${distilled || item.summary}`,
      item.track,
    );

    const { error } = await supabase.from("operator_knowledge").insert({
      kind,
      title: item.title.slice(0, 120),
      content: body.slice(0, 2500),
      effect: effect as Json,
      is_active: true,
      source: "web_research",
    });

    if (!error) {
      itemsLearned += 1;
      learnedTitles.push(item.title);
    }
  }

  let aiConsults = 0;
  if (aiConsultBudget > 0 && (focus === "all" || focus === "education")) {
    for (const topic of todaysCurriculumTopics(aiConsultBudget + 2)) {
      if (aiConsults >= aiConsultBudget || itemsLearned >= maxLearn) break;
      const titleKey = normalizeTitleKey(`AI consult: ${topic}`);
      if (seen.has(titleKey)) continue;

      const lesson = await consultAiOnCurriculumTopic(topic);
      if (!lesson) {
        sourcesFailed += 1;
        continue;
      }
      seen.add(titleKey);
      sourcesOk += 1;

      const effect = sentimentEffect(lesson.content, "education");
      const kind = inferResearchKind(lesson.content, "education");
      const content = [
        "[AI CONSULT — Operador usó la AI como tutor; la lección queda en su cerebro]",
        lesson.content,
        `Tema consultado: ${topic}`,
      ].join("\n");

      const { error } = await supabase.from("operator_knowledge").insert({
        kind,
        title: lesson.title,
        content: content.slice(0, 2500),
        effect: effect as Json,
        is_active: true,
        source: "ai_consult",
      });

      if (!error) {
        itemsLearned += 1;
        aiConsults += 1;
        learnedTitles.push(lesson.title);
      }
    }
  }

  const eduSeen = collected.filter((i) => i.track === "education").length;
  const newsSeen = collected.filter((i) => i.track === "news").length;
  const summary = `Training research: ${sourcesOk} sources ok (${sourcesFailed} failed). Saw ${collected.length} (edu ${eduSeen} / news ${newsSeen}), learned ${itemsLearned} (AI consults ${aiConsults}).`;

  if (runRow?.id) {
    await supabase
      .from("operator_research_runs")
      .update({
        finished_at: new Date().toISOString(),
        sources_ok: sourcesOk,
        sources_failed: sourcesFailed,
        items_seen: collected.length,
        items_learned: itemsLearned,
        summary,
      })
      .eq("id", runRow.id);
  }

  await supabase.from("operator_brain").upsert({
    id: "keelra",
    last_research_at: new Date().toISOString(),
    research_items_count: itemsLearned,
    notes: summary.slice(0, 500),
    updated_at: new Date().toISOString(),
  });

  return {
    sourcesOk,
    sourcesFailed,
    itemsSeen: collected.length,
    itemsLearned,
    learnedTitles,
    summary,
  };
}
