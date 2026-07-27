import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import {
  extractEffectFromText,
  inferKnowledgeKind,
  type KnowledgeEffect,
} from "./brain";

type Client = SupabaseClient<Database>;

export type ResearchFeed = {
  id: string;
  name: string;
  url: string;
};

/** Fuentes públicas RSS (sin scrape agresivo). */
export const TRADING_RESEARCH_FEEDS: ResearchFeed[] = [
  {
    id: "coindesk",
    name: "CoinDesk",
    url: "https://www.coindesk.com/arc/outboundfeeds/rss/",
  },
  {
    id: "cointelegraph",
    name: "Cointelegraph",
    url: "https://cointelegraph.com/rss",
  },
  {
    id: "yahoo-btc",
    name: "Yahoo Finance BTC",
    url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=BTC-USD&region=US&lang=en-US",
  },
  {
    id: "yahoo-eth",
    name: "Yahoo Finance ETH",
    url: "https://feeds.finance.yahoo.com/rss/2.0/headline?s=ETH-USD&region=US&lang=en-US",
  },
];

export type ResearchItem = {
  sourceId: string;
  sourceName: string;
  title: string;
  summary: string;
  link: string;
  publishedAt: string | null;
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

function parseRssItems(xml: string, feed: ResearchFeed): ResearchItem[] {
  const chunks = xml.split(/<item[\s>]/i).slice(1);
  const items: ResearchItem[] = [];
  for (const chunk of chunks.slice(0, 12)) {
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
    });
  }
  return items;
}

async function fetchFeed(feed: ResearchFeed): Promise<ResearchItem[]> {
  const res = await fetch(feed.url, {
    headers: {
      "User-Agent": "KeelraOperatorResearch/1.0",
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

function sentimentEffect(text: string): KnowledgeEffect {
  const base = extractEffectFromText(text);
  const t = text.toLowerCase();

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

/**
 * Lee internet (RSS de trading/crypto), convierte titulares en lecciones
 * permanentes del cerebro global Keelra.
 */
export async function runOperatorWebResearch(
  supabase: Client,
  opts?: { triggeredBy?: string; maxLearn?: number },
): Promise<ResearchRunResult> {
  const triggeredBy = opts?.triggeredBy ?? "manual";
  const maxLearn = opts?.maxLearn ?? 8;

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

  for (const feed of TRADING_RESEARCH_FEEDS) {
    try {
      const items = await fetchFeed(feed);
      collected.push(...items);
      sourcesOk += 1;
    } catch {
      sourcesFailed += 1;
    }
  }

  const { data: existing } = await supabase
    .from("operator_knowledge")
    .select("title")
    .eq("source", "web_research")
    .order("created_at", { ascending: false })
    .limit(200);

  const seen = new Set(
    (existing ?? []).map((r) => normalizeTitleKey(String(r.title))),
  );

  const learnedTitles: string[] = [];
  let itemsLearned = 0;

  for (const item of collected) {
    if (itemsLearned >= maxLearn) break;
    const key = normalizeTitleKey(item.title);
    if (!key || seen.has(key)) continue;
    seen.add(key);

    const body = [
      item.title,
      item.summary,
      item.link ? `Source: ${item.sourceName} · ${item.link}` : `Source: ${item.sourceName}`,
      item.publishedAt ? `Published: ${item.publishedAt}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const effect = sentimentEffect(`${item.title}. ${item.summary}`);
    const kind = inferKnowledgeKind(`${item.title} ${item.summary}`) || "market";

    const { error } = await supabase.from("operator_knowledge").insert({
      kind: kind === "note" ? "market" : kind,
      title: item.title.slice(0, 120),
      content: body.slice(0, 2000),
      effect: effect as Json,
      is_active: true,
      source: "web_research",
    });

    if (!error) {
      itemsLearned += 1;
      learnedTitles.push(item.title);
    }
  }

  const summary = `Web research: ${sourcesOk} feeds ok, ${sourcesFailed} failed, saw ${collected.length}, learned ${itemsLearned}.`;

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
