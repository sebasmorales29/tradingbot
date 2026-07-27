"use client";

import { useEffect, useRef, useState } from "react";
import { useOperatorBrain } from "@/components/admin/operator/OperatorBrainProvider";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const SIDEBAR_KEY = "keelra-operator-knowledge-open";

function sourceBadge(
  source: string | undefined,
  labels: { web: string; chat: string; test: string; other: string },
) {
  if (source === "web_research") return labels.web;
  if (source === "chat") return labels.chat;
  if (source === "test_promote") return labels.test;
  return labels.other;
}

function shortContent(content: string, max = 140): string {
  const oneLine = content
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

function extractLink(content: string): string | null {
  const m = content.match(/https?:\/\/\S+/);
  return m ? m[0].replace(/[),.;]+$/, "") : null;
}

export function OperatorLearningView() {
  const t = useT();
  const { locale } = useLanguage();
  const dateLocale = locale === "en" ? "en-US" : "es-CR";
  const { data, loading, error, busy, post } = useOperatorBrain();
  const [message, setMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_KEY);
      if (saved === "0") setSidebarOpen(false);
      if (saved === "1") setSidebarOpen(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_KEY, sidebarOpen ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [sidebarOpen]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.chat?.length]);

  if (loading && !data) {
    return <p className="text-sm text-snow/45">{t.admin.operatorLoading}</p>;
  }
  if (error && !data) {
    return <p className="text-sm text-red-300">{error}</p>;
  }
  if (!data) return null;

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || busy) return;
    await post({ action: "chat", message, locale });
    setMessage("");
  }

  async function forget(id: string) {
    await post({ action: "deactivate_knowledge", knowledgeId: id });
  }

  const sourceLabels = {
    web: t.admin.operatorSourceWeb,
    chat: t.admin.operatorSourceChat,
    test: t.admin.operatorSourceTest,
    other: t.admin.operatorSourceOther,
  };

  return (
    <div className="relative flex min-h-[min(70vh,720px)] gap-0 overflow-hidden rounded-xl border border-snow/10 bg-slate/30">
      {/* Chat principal */}
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-snow/10 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-snow">
              {t.admin.operatorChatTitle}
            </h2>
            <p className="mt-0.5 text-xs text-snow/45">
              {t.admin.operatorChatLead}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-pressed={sidebarOpen}
            className="shrink-0 rounded-lg border border-snow/15 bg-ink/40 px-3 py-2 text-xs font-semibold text-snow/70 transition hover:border-pulse/40 hover:text-pulse"
          >
            {sidebarOpen
              ? t.admin.operatorKnowledgeHide
              : `${t.admin.operatorKnowledgeShow} (${data.knowledge.length})`}
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
          {data.chat.length === 0 && (
            <p className="mx-auto max-w-2xl pt-8 text-center text-sm text-snow/40">
              {t.admin.operatorChatEmpty}
            </p>
          )}
          {data.chat.map((m) => (
            <div
              key={m.id}
              className={`mx-auto w-full max-w-3xl rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                m.role === "user"
                  ? "bg-pulse/15 text-snow"
                  : "bg-ink/50 text-snow/85 ring-1 ring-snow/10"
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={chatEnd} />
        </div>

        <form
          onSubmit={(e) => void send(e)}
          className="border-t border-snow/10 px-4 py-3 sm:px-5"
        >
          <div className="mx-auto flex max-w-3xl gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.admin.operatorChatPlaceholder}
              className="h-12 min-w-0 flex-1 rounded-xl border border-snow/15 bg-ink/50 px-4 text-sm text-snow outline-none focus:border-pulse/50"
            />
            <button
              type="submit"
              disabled={busy || message.trim().length < 3}
              className="h-12 shrink-0 rounded-xl bg-pulse px-5 text-sm font-semibold text-ink disabled:opacity-50"
            >
              {busy ? t.admin.operatorChatThinking : t.admin.operatorChatSend}
            </button>
          </div>
        </form>
      </section>

      {/* Barra lateral conocimiento */}
      <aside
        className={`flex shrink-0 flex-col border-l border-snow/10 bg-ink/55 transition-[width,opacity,transform] duration-200 ease-out ${
          sidebarOpen
            ? "w-full max-w-full opacity-100 sm:w-[min(100%,22rem)]"
            : "pointer-events-none w-0 max-w-0 overflow-hidden border-l-0 opacity-0"
        }`}
        aria-hidden={!sidebarOpen}
      >
        {sidebarOpen && (
          <>
            <div className="flex items-start justify-between gap-2 border-b border-snow/10 px-4 py-3">
              <div className="min-w-0">
                <h2 className="font-display text-base font-bold text-snow">
                  {t.admin.operatorKnowledgeTitle}
                </h2>
                <p className="mt-0.5 text-[11px] leading-snug text-snow/45">
                  {t.admin.operatorKnowledgeLead}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className="text-xs tabular-nums text-snow/40">
                  {data.knowledge.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="rounded-md px-2 py-1 text-xs text-snow/45 hover:bg-snow/10 hover:text-snow"
                  aria-label={t.admin.operatorKnowledgeHide}
                >
                  ✕
                </button>
              </div>
            </div>

            <ul className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-3">
              {data.knowledge.length === 0 && (
                <li className="px-1 text-sm text-snow/40">
                  {t.admin.operatorKnowledgeEmpty}
                </li>
              )}
              {data.knowledge.map((k) => {
                const link = extractLink(k.content);
                const preview = shortContent(k.content);
                return (
                  <li
                    key={k.id}
                    className="min-w-0 overflow-hidden rounded-xl border border-snow/10 bg-slate/40 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded bg-pulse/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse">
                            {k.kind}
                          </span>
                          <span className="rounded bg-snow/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-snow/45">
                            {sourceBadge(k.source, sourceLabels)}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-sm font-medium text-snow">
                          {k.title}
                        </p>
                        {preview && (
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-snow/50">
                            {preview}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-snow/35">
                          <span>
                            {new Date(k.createdAt).toLocaleString(dateLocale, {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </span>
                          {link && (
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="truncate text-pulse/80 hover:text-pulse"
                            >
                              {t.admin.operatorSourceLink}
                            </a>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void forget(k.id)}
                        className="shrink-0 rounded-md px-2 py-1 text-xs text-snow/40 transition hover:bg-red-500/10 hover:text-red-300"
                      >
                        {t.admin.operatorForget}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </aside>
    </div>
  );
}
