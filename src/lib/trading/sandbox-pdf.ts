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

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

function buildLogoSvg(): string {
  return `<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <rect width="36" height="36" rx="8" fill="#00ADB5"/>
  <path d="M8 22 L14 14 L19 19 L28 10" stroke="#222831" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  <circle cx="28" cy="10" r="2.2" fill="#222831"/>
</svg>`;
}

/** HTML listo para imprimir / Guardar como PDF con marca PulseTrade. */
export function buildSandboxReportHtml(input: SandboxPdfInput): string {
  const { labels: L, locale, state } = input;
  const closed = state.closedTrades.length;
  const winRate = closed ? Math.round((input.wins / closed) * 100) : null;
  const pnlClass = input.pnl >= 0 ? "pos" : "neg";
  const events = [...state.events]
    .filter((e) => e.kind !== "tick")
    .slice(-40)
    .reverse();

  const tradesRows =
    state.closedTrades.length === 0
      ? `<tr><td colspan="6" class="muted">${esc(L.noTrades)}</td></tr>`
      : state.closedTrades
          .map(
            (tr) => `<tr>
      <td>${esc(dt(tr.closedAt, locale))}</td>
      <td class="mono">${tr.entry.toFixed(2)}</td>
      <td class="mono">${tr.exit.toFixed(2)}</td>
      <td class="mono">${tr.qty.toFixed(6)}</td>
      <td class="mono ${tr.pnl >= 0 ? "pos" : "neg"}">${tr.pnl >= 0 ? "+" : ""}${money(tr.pnl, locale)}</td>
      <td class="small">${esc(tr.exitReason)}</td>
    </tr>`,
          )
          .join("");

  const openRow = state.position
    ? `<div class="open-box">
        <strong>${esc(L.openPosition)}</strong>
        <span class="mono">${esc(L.entry)} ${state.position.entry.toFixed(2)} · ${esc(L.qty)} ${state.position.qty.toFixed(6)}</span>
        <p class="small muted">${esc(state.position.entryReason)}</p>
      </div>`
    : "";

  const eventRows =
    events.length === 0
      ? `<li class="muted">${esc(L.noEvents)}</li>`
      : events
          .map(
            (e) => `<li>
        <span class="kind kind-${esc(e.kind)}">${esc(e.kind)}</span>
        <span class="muted small">${esc(dt(e.at, locale))}</span>
        <span>${esc(e.message)}</span>
      </li>`,
          )
          .join("");

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="utf-8"/>
<title>PulseTrade — ${esc(L.reportTitle)}</title>
<style>
  :root {
    --ink: #222831;
    --slate: #393e46;
    --pulse: #00adb5;
    --pulse-dim: #008a91;
    --snow: #eeeeee;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 32px 40px 48px;
    font-family: "Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    color: var(--ink);
    background: #fff;
    font-size: 12.5px;
    line-height: 1.45;
    letter-spacing: -0.011em;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
  }
  .brand h1 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.03em;
    color: var(--ink);
  }
  .brand .pulse { color: var(--pulse); }
  .badge {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    border-radius: 4px;
    background: rgba(0,173,181,0.15);
    color: var(--pulse-dim);
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    vertical-align: middle;
  }
  .subtitle {
    margin: 0 0 24px;
    color: var(--slate);
    font-size: 13px;
  }
  .rule {
    height: 3px;
    background: linear-gradient(90deg, var(--pulse), transparent);
    border: 0;
    margin: 0 0 24px;
  }
  h2 {
    margin: 28px 0 12px;
    font-size: 14px;
    font-weight: 700;
    color: var(--ink);
    letter-spacing: -0.02em;
    border-bottom: 1px solid rgba(34,40,49,0.12);
    padding-bottom: 6px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
  }
  .stat {
    border: 1px solid rgba(34,40,49,0.1);
    border-radius: 8px;
    padding: 10px 12px;
    background: #fafafa;
  }
  .stat .label {
    display: block;
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--slate);
    margin-bottom: 4px;
  }
  .stat .value {
    font-size: 15px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .meta {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px 24px;
    margin-top: 14px;
  }
  .meta div { display: flex; gap: 8px; }
  .meta .k { color: var(--slate); min-width: 110px; }
  .mono { font-variant-numeric: tabular-nums; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 11.5px; }
  .pos { color: #059669; }
  .neg { color: #dc2626; }
  .muted { color: #6b7280; }
  .small { font-size: 11px; }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 4px;
  }
  th, td {
    text-align: left;
    padding: 7px 8px;
    border-bottom: 1px solid rgba(34,40,49,0.08);
  }
  th {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--slate);
    background: #f3f4f5;
  }
  .open-box {
    margin: 10px 0 14px;
    padding: 10px 12px;
    border-radius: 8px;
    border: 1px solid rgba(5,150,105,0.35);
    background: rgba(5,150,105,0.06);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .events { list-style: none; padding: 0; margin: 0; }
  .events li {
    padding: 6px 0;
    border-bottom: 1px solid rgba(34,40,49,0.06);
    display: grid;
    grid-template-columns: 64px 130px 1fr;
    gap: 8px;
    align-items: baseline;
  }
  .kind {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 5px;
    border-radius: 3px;
    background: #eee;
    text-align: center;
  }
  .kind-long { background: rgba(5,150,105,0.15); color: #047857; }
  .kind-flat, .kind-stop { background: rgba(220,38,38,0.12); color: #b91c1c; }
  .kind-tp { background: rgba(0,173,181,0.18); color: var(--pulse-dim); }
  .kind-skip { background: rgba(217,119,6,0.15); color: #b45309; }
  .footer {
    margin-top: 36px;
    padding-top: 14px;
    border-top: 1px solid rgba(34,40,49,0.12);
    font-size: 10px;
    color: #6b7280;
  }
  @media print {
    body { padding: 16px 20px; }
    .no-print { display: none !important; }
    .stat { break-inside: avoid; }
    h2 { break-after: avoid; }
  }
  .toolbar {
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    gap: 8px;
    margin: -32px -40px 24px;
    padding: 12px 40px;
    background: var(--ink);
    color: var(--snow);
  }
  .toolbar button {
    background: var(--pulse);
    color: var(--ink);
    border: 0;
    border-radius: 6px;
    padding: 8px 14px;
    font-weight: 700;
    cursor: pointer;
    font-size: 13px;
  }
  .toolbar button.secondary {
    background: transparent;
    color: var(--snow);
    border: 1px solid rgba(238,238,238,0.25);
  }
</style>
</head>
<body>
  <div class="toolbar no-print">
    <button type="button" onclick="window.print()">${locale === "en" ? "Save as PDF / Print" : "Guardar como PDF / Imprimir"}</button>
    <button type="button" class="secondary" onclick="window.close()">${locale === "en" ? "Close" : "Cerrar"}</button>
  </div>

  <div class="brand">
    ${buildLogoSvg()}
    <h1>Pulse<span class="pulse">Trade</span><span class="badge">${esc(L.paperBadge)}</span></h1>
  </div>
  <p class="subtitle">${esc(L.reportTitle)} · ${esc(L.overview)}</p>
  <hr class="rule"/>

  <div class="grid">
    <div class="stat"><span class="label">${esc(L.startingEquity)}</span><span class="value">${money(input.startingEquity, locale)}</span></div>
    <div class="stat"><span class="label">${esc(L.finalEquity)}</span><span class="value">${money(input.finalEquity, locale)}</span></div>
    <div class="stat"><span class="label">${esc(L.pnl)}</span><span class="value ${pnlClass}">${input.pnl >= 0 ? "+" : ""}${money(input.pnl, locale)}</span></div>
    <div class="stat"><span class="label">${esc(L.winRate)}</span><span class="value">${winRate == null ? "—" : `${winRate}%`}</span></div>
  </div>

  <div class="meta">
    <div><span class="k">${esc(L.sessionId)}</span><span class="mono">${esc(input.sessionId)}</span></div>
    <div><span class="k">${esc(L.pair)}</span><span>${esc(input.pair)} · ${esc(input.timeframe)}</span></div>
    <div><span class="k">${esc(L.risk)}</span><span>${input.riskPercent}%</span></div>
    <div><span class="k">${esc(L.tickInterval)}</span><span>${Math.round(input.tickIntervalMs / 1000)}s</span></div>
    <div><span class="k">${esc(L.started)}</span><span>${esc(dt(input.startedAt, locale))}</span></div>
    <div><span class="k">${esc(L.ended)}</span><span>${input.endedAt ? esc(dt(input.endedAt, locale)) : "—"}</span></div>
    <div><span class="k">${esc(L.ticks)}</span><span>${input.ticks}</span></div>
    <div><span class="k">${esc(L.trades)}</span><span>${input.wins + input.losses} (${esc(L.wins)} ${input.wins} · ${esc(L.losses)} ${input.losses})</span></div>
  </div>

  <h2>${esc(L.tradesSection)}</h2>
  ${openRow}
  <table>
    <thead>
      <tr>
        <th>${esc(L.ended)}</th>
        <th>${esc(L.entry)}</th>
        <th>${esc(L.exit)}</th>
        <th>${esc(L.qty)}</th>
        <th>PnL</th>
        <th>${esc(L.reason)}</th>
      </tr>
    </thead>
    <tbody>${tradesRows}</tbody>
  </table>

  <h2>${esc(L.eventsSection)}</h2>
  <ul class="events">${eventRows}</ul>

  <div class="footer">
    <p>${esc(L.generatedAt)} ${esc(dt(new Date().toISOString(), locale))}</p>
    <p>${esc(L.disclaimer)}</p>
  </div>
</body>
</html>`;
}

/** Abre una ventana con el reporte y el diálogo de impresión (Guardar como PDF). */
export function openSandboxPdfReport(input: SandboxPdfInput): void {
  const html = buildSandboxReportHtml(input);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "noopener,noreferrer,width=900,height=1000");
  if (!w) {
    URL.revokeObjectURL(url);
    throw new Error("popup-blocked");
  }
  // Revocar después de que la ventana cargue el blob
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
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
