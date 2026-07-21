import { jsPDF } from "jspdf";
import type { Locale } from "@/lib/i18n/dictionary";
import type { LiveSandboxState } from "@/lib/trading/live-sandbox";
import type { SandboxMarket } from "@/lib/trading/sandbox-session";

export type SandboxPdfLabels = {
  reportTitle: string;
  overview: string;
  sessionId: string;
  pair: string;
  timeframe: string;
  risk: string;
  tickInterval: string;
  started: string;
  ended: string;
  ticks: string;
  startingEquity: string;
  finalEquity: string;
  pnl: string;
  trades: string;
  wins: string;
  losses: string;
  winRate: string;
  openPosition: string;
  tradesSection: string;
  eventsSection: string;
  noTrades: string;
  noEvents: string;
  disclaimer: string;
  generatedAt: string;
  paperBadge: string;
  entry: string;
  exit: string;
  qty: string;
  reason: string;
};

export type SandboxPdfInput = {
  sessionId: string;
  pair: string;
  timeframe: string;
  riskPercent: number;
  tickIntervalMs: number;
  startedAt: string;
  endedAt: string | null;
  startingEquity: number;
  finalEquity: number;
  pnl: number;
  wins: number;
  losses: number;
  ticks: number;
  state: LiveSandboxState;
  market: SandboxMarket | null;
  locale: Locale;
  labels: SandboxPdfLabels;
};

const INK = [34, 40, 49] as const;
const ELEVATED = [42, 48, 56] as const;
const SLATE = [57, 62, 70] as const;
const PULSE = [0, 173, 181] as const;
const SNOW = [238, 238, 238] as const;
const MUTED = [160, 165, 172] as const;
const POS = [52, 211, 153] as const;
const NEG = [248, 113, 113] as const;

function money(n: number, locale: Locale): string {
  return n.toLocaleString(locale === "en" ? "en-US" : "es-CR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function dt(iso: string, locale: Locale): string {
  return new Date(iso).toLocaleString(locale === "en" ? "en-US" : "es-CR", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function rgb(
  doc: jsPDF,
  color: readonly [number, number, number],
  mode: "fill" | "draw" | "text",
) {
  if (mode === "fill") doc.setFillColor(color[0], color[1], color[2]);
  else if (mode === "draw") doc.setDrawColor(color[0], color[1], color[2]);
  else doc.setTextColor(color[0], color[1], color[2]);
}

/** Genera y descarga un PDF dark de Keelra (sin diálogo de impresión del navegador). */
export function downloadSandboxPdf(input: SandboxPdfInput): void {
  const { labels: L, locale, state } = input;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let y = margin;

  const paintPage = () => {
    rgb(doc, INK, "fill");
    doc.rect(0, 0, pageW, pageH, "F");
  };

  const ensureSpace = (need: number) => {
    if (y + need <= pageH - margin) return;
    doc.addPage();
    paintPage();
    y = margin;
  };

  paintPage();

  // Brand mark
  rgb(doc, PULSE, "fill");
  doc.roundedRect(margin, y, 9, 9, 1.5, 1.5, "F");
  rgb(doc, INK, "draw");
  doc.setLineWidth(0.6);
  doc.setLineCap("round");
  doc.setLineJoin("round");
  doc.line(margin + 2, y + 6.2, margin + 3.8, y + 3.8);
  doc.line(margin + 3.8, y + 3.8, margin + 5.2, y + 5.2);
  doc.line(margin + 5.2, y + 5.2, margin + 7.2, y + 2.4);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  rgb(doc, SNOW, "text");
  doc.text("Keel", margin + 12, y + 6.5);
  const keelW = doc.getTextWidth("Keel");
  rgb(doc, PULSE, "text");
  doc.text("ra", margin + 12 + keelW, y + 6.5);

  const badgeX = margin + 12 + keelW + doc.getTextWidth("ra") + 3;
  rgb(doc, [0, 80, 84], "fill");
  doc.roundedRect(badgeX, y + 1.5, 14, 5, 1, 1, "F");
  doc.setFontSize(7);
  rgb(doc, PULSE, "text");
  doc.setFont("helvetica", "bold");
  doc.text(L.paperBadge.toUpperCase(), badgeX + 7, y + 4.8, {
    align: "center",
  });

  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  rgb(doc, MUTED, "text");
  doc.text(`${L.reportTitle} · ${L.overview}`, margin, y);

  y += 4;
  rgb(doc, PULSE, "fill");
  doc.rect(margin, y, contentW * 0.45, 0.8, "F");
  y += 8;

  // Stats row
  const closed = state.closedTrades.length;
  const winRate = closed ? Math.round((input.wins / closed) * 100) : null;
  const stats = [
    { label: L.startingEquity, value: money(input.startingEquity, locale) },
    { label: L.finalEquity, value: money(input.finalEquity, locale) },
    {
      label: L.pnl,
      value: `${input.pnl >= 0 ? "+" : ""}${money(input.pnl, locale)}`,
      tone: input.pnl >= 0 ? "pos" : "neg",
    },
    {
      label: L.winRate,
      value: winRate == null ? "—" : `${winRate}%`,
    },
  ] as const;

  const gap = 3;
  const cardW = (contentW - gap * 3) / 4;
  const cardH = 16;
  ensureSpace(cardH + 4);
  stats.forEach((s, i) => {
    const x = margin + i * (cardW + gap);
    rgb(doc, ELEVATED, "fill");
    rgb(doc, SLATE, "draw");
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, cardW, cardH, 1.5, 1.5, "FD");
    doc.setFontSize(6.5);
    rgb(doc, MUTED, "text");
    doc.setFont("helvetica", "normal");
    doc.text(s.label.toUpperCase(), x + 2.5, y + 5);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    if ("tone" in s && s.tone === "pos") rgb(doc, POS, "text");
    else if ("tone" in s && s.tone === "neg") rgb(doc, NEG, "text");
    else rgb(doc, SNOW, "text");
    doc.text(s.value, x + 2.5, y + 11.5);
  });
  y += cardH + 8;

  // Meta
  const metaLeft: [string, string][] = [
    [L.sessionId, input.sessionId],
    [L.risk, `${input.riskPercent}%`],
    [L.started, dt(input.startedAt, locale)],
    [L.ticks, String(input.ticks)],
  ];
  const metaRight: [string, string][] = [
    [L.pair, `${input.pair} · ${input.timeframe}`],
    [L.tickInterval, `${Math.round(input.tickIntervalMs / 1000)}s`],
    [L.ended, input.endedAt ? dt(input.endedAt, locale) : "—"],
    [
      L.trades,
      `${input.wins + input.losses} (${L.wins} ${input.wins} · ${L.losses} ${input.losses})`,
    ],
  ];

  ensureSpace(28);
  doc.setFontSize(8.5);
  for (let i = 0; i < 4; i++) {
    const rowY = y + i * 5.5;
    rgb(doc, MUTED, "text");
    doc.setFont("helvetica", "normal");
    doc.text(metaLeft[i][0], margin, rowY);
    rgb(doc, SNOW, "text");
    doc.setFont("helvetica", "bold");
    doc.text(metaLeft[i][1], margin + 32, rowY, {
      maxWidth: contentW / 2 - 36,
    });

    rgb(doc, MUTED, "text");
    doc.setFont("helvetica", "normal");
    doc.text(metaRight[i][0], margin + contentW / 2, rowY);
    rgb(doc, SNOW, "text");
    doc.setFont("helvetica", "bold");
    doc.text(metaRight[i][1], margin + contentW / 2 + 32, rowY, {
      maxWidth: contentW / 2 - 36,
    });
  }
  y += 28;

  // Trades section
  ensureSpace(12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  rgb(doc, SNOW, "text");
  doc.text(L.tradesSection, margin, y);
  y += 2;
  rgb(doc, SLATE, "draw");
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentW, y);
  y += 5;

  if (state.position) {
    ensureSpace(14);
    rgb(doc, [20, 50, 42], "fill");
    rgb(doc, POS, "draw");
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentW, 12, 1.5, 1.5, "FD");
    doc.setFontSize(8);
    rgb(doc, POS, "text");
    doc.setFont("helvetica", "bold");
    doc.text(L.openPosition, margin + 3, y + 4.5);
    rgb(doc, SNOW, "text");
    doc.setFont("helvetica", "normal");
    doc.text(
      `${L.entry} ${state.position.entry.toFixed(2)} · ${L.qty} ${state.position.qty.toFixed(6)}`,
      margin + 3,
      y + 9,
    );
    y += 15;
  }

  const colX = [
    margin,
    margin + 32,
    margin + 50,
    margin + 68,
    margin + 92,
    margin + 118,
  ];
  const headers = [L.ended, L.entry, L.exit, L.qty, "PnL", L.reason];

  ensureSpace(10);
  rgb(doc, SLATE, "fill");
  doc.rect(margin, y, contentW, 7, "F");
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  rgb(doc, MUTED, "text");
  headers.forEach((h, i) => {
    doc.text(h.toUpperCase(), colX[i] + 1.5, y + 4.5);
  });
  y += 7;

  if (state.closedTrades.length === 0) {
    ensureSpace(8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    rgb(doc, MUTED, "text");
    doc.text(L.noTrades, margin + 2, y + 5);
    y += 10;
  } else {
    for (const tr of state.closedTrades) {
      ensureSpace(8);
      rgb(doc, SLATE, "draw");
      doc.setLineWidth(0.15);
      doc.line(margin, y + 7, margin + contentW, y + 7);
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      rgb(doc, SNOW, "text");
      doc.text(dt(tr.closedAt, locale), colX[0] + 1.5, y + 4.5, {
        maxWidth: 30,
      });
      doc.text(tr.entry.toFixed(2), colX[1] + 1.5, y + 4.5);
      doc.text(tr.exit.toFixed(2), colX[2] + 1.5, y + 4.5);
      doc.text(tr.qty.toFixed(5), colX[3] + 1.5, y + 4.5);
      rgb(doc, tr.pnl >= 0 ? POS : NEG, "text");
      doc.setFont("helvetica", "bold");
      doc.text(
        `${tr.pnl >= 0 ? "+" : ""}${money(tr.pnl, locale)}`,
        colX[4] + 1.5,
        y + 4.5,
      );
      rgb(doc, MUTED, "text");
      doc.setFont("helvetica", "normal");
      doc.text(tr.exitReason, colX[5] + 1.5, y + 4.5, {
        maxWidth: pageW - margin - colX[5] - 2,
      });
      y += 8;
    }
  }

  // Events
  y += 6;
  ensureSpace(12);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  rgb(doc, SNOW, "text");
  doc.text(L.eventsSection, margin, y);
  y += 2;
  rgb(doc, SLATE, "draw");
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentW, y);
  y += 6;

  const events = [...state.events]
    .filter((e) => e.kind !== "tick")
    .slice(-40)
    .reverse();

  if (events.length === 0) {
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    rgb(doc, MUTED, "text");
    doc.text(L.noEvents, margin, y);
    y += 8;
  } else {
    for (const e of events) {
      const msgLines = doc.splitTextToSize(
        e.message,
        contentW - 28,
      ) as string[];
      const blockH = Math.max(10, 5 + msgLines.length * 4);
      ensureSpace(blockH + 2);

      // kind badge
      const kind = e.kind.toUpperCase();
      let badgeBg: readonly [number, number, number] = SLATE;
      let badgeFg: readonly [number, number, number] = MUTED;
      if (e.kind === "long") {
        badgeBg = [20, 60, 48];
        badgeFg = POS;
      } else if (e.kind === "tp") {
        badgeBg = [0, 70, 74];
        badgeFg = PULSE;
      } else if (e.kind === "flat" || e.kind === "stop") {
        badgeBg = [70, 30, 30];
        badgeFg = NEG;
      } else if (e.kind === "skip") {
        badgeBg = [70, 55, 20];
        badgeFg = [252, 211, 77];
      }

      rgb(doc, badgeBg, "fill");
      doc.roundedRect(margin, y, 16, 5, 0.8, 0.8, "F");
      doc.setFontSize(6);
      doc.setFont("helvetica", "bold");
      rgb(doc, badgeFg, "text");
      doc.text(kind, margin + 8, y + 3.5, { align: "center" });

      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      rgb(doc, MUTED, "text");
      doc.text(dt(e.at, locale), margin + 18, y + 3.5);

      rgb(doc, SNOW, "text");
      doc.setFontSize(8);
      doc.text(msgLines, margin + 18, y + 8.5);
      y += blockH;

      rgb(doc, SLATE, "draw");
      doc.setLineWidth(0.1);
      doc.line(margin, y - 1, margin + contentW, y - 1);
    }
  }

  // Footer
  ensureSpace(16);
  y = Math.max(y + 4, pageH - margin - 12);
  rgb(doc, SLATE, "draw");
  doc.setLineWidth(0.3);
  doc.line(margin, y, margin + contentW, y);
  y += 5;
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  rgb(doc, MUTED, "text");
  doc.text(`${L.generatedAt} ${dt(new Date().toISOString(), locale)}`, margin, y);
  y += 4;
  const disc = doc.splitTextToSize(L.disclaimer, contentW) as string[];
  doc.text(disc, margin, y);

  const safeId = input.sessionId.replace(/[^a-zA-Z0-9_-]/g, "").slice(-16);
  doc.save(`keelra-sandbox-${safeId || "session"}.pdf`);
}

/** @deprecated usar downloadSandboxPdf */
export function openSandboxPdfReport(input: SandboxPdfInput): void {
  downloadSandboxPdf(input);
}

export function pdfInputFromLiveState(opts: {
  state: LiveSandboxState;
  market: SandboxMarket | null;
  tickIntervalMs: number;
  locale: Locale;
  labels: SandboxPdfLabels;
  endedAt?: string | null;
}): SandboxPdfInput {
  const { state, market } = opts;
  const finalEquity =
    state.position && market
      ? state.equity + (market.price - state.position.entry) * state.position.qty
      : state.equity;
  const wins = state.closedTrades.filter((t) => t.pnl > 0).length;
  const losses = state.closedTrades.filter((t) => t.pnl <= 0).length;

  return {
    sessionId: state.sessionId,
    pair: state.pair,
    timeframe: state.timeframe,
    riskPercent: state.riskPercent,
    tickIntervalMs: opts.tickIntervalMs,
    startedAt: state.startedAt,
    endedAt: opts.endedAt ?? null,
    startingEquity: state.startingEquity,
    finalEquity,
    pnl: finalEquity - state.startingEquity,
    wins,
    losses,
    ticks: state.tickCount,
    state,
    market,
    locale: opts.locale,
    labels: opts.labels,
  };
}
