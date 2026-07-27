"use client";

import { useEffect, useRef, useState } from "react";
import { useOperatorBrain } from "@/components/admin/operator/OperatorBrainProvider";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

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
  const chatEnd = useRef<HTMLDivElement>(null);

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
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <section className="flex min-h-[520px] flex-col rounded-xl border border-snow/10 bg-slate/30 p-4">
        <h2 className="font-display text-lg font-bold text-snow">
          {t.admin.operatorChatTitle}
        </h2>
        <p className="mt-1 text-xs text-snow/45">{t.admin.operatorChatLead}</p>

        <div className="mt-3 flex-1 space-y-3 overflow-y-auto rounded-lg border border-snow/10 bg-ink/40 p-3">
          {data.chat.length === 0 && (
            <p className="text-sm text-snow/40">{t.admin.operatorChatEmpty}</p>
          )}
          {data.chat.map((m) => (
            <div
              key={m.id}
              className={`max-w-[95%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                m.role === "user"
                  ? "ml-auto bg-pulse/15 text-snow"
                  : "mr-auto bg-snow/[0.06] text-snow/80"
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={chatEnd} />
        </div>

        <form onSubmit={(e) => void send(e)} className="mt-3 flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.admin.operatorChatPlaceholder}
            className="h-11 min-w-0 flex-1 rounded-lg border border-snow/15 bg-ink/50 px-3 text-sm text-snow outline-none focus:border-pulse/50"
          />
          <button
            type="submit"
            disabled={busy || message.trim().length < 3}
            className="h-11 shrink-0 rounded-lg bg-pulse px-4 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {busy ? t.admin.operatorChatThinking : t.admin.operatorChatSend}
          </button>
        </form>
      </section>

      <section className="min-w-0 rounded-xl border border-snow/10 bg-slate/30 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-snow">
              {t.admin.operatorKnowledgeTitle}
            </h2>
            <p className="mt-1 text-xs text-snow/45">
              {t.admin.operatorKnowledgeLead}
            </p>
          </div>
          <p className="shrink-0 text-xs tabular-nums text-snow/40">
            {data.knowledge.length}
          </p>
        </div>

        <ul className="mt-3 max-h-[520px] space-y-2.5 overflow-y-auto overflow-x-hidden pr-1">
          {data.knowledge.length === 0 && (
            <li className="text-sm text-snow/40">
              {t.admin.operatorKnowledgeEmpty}
            </li>
          )}
          {data.knowledge.map((k) => {
            const link = extractLink(k.content);
            const preview = shortContent(k.content);
            return (
              <li
                key={k.id}
                className="min-w-0 overflow-hidden rounded-xl border border-snow/10 bg-ink/40 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded bg-pulse/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-pulse">
                        {k.kind}
                      </span>
                      <span className="rounded bg-snow/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-snow/45">
                        {sourceBadge(k.source, sourceLabels)}
                      </span>
                    </div>
                    <p className="mt-1.5 truncate text-sm font-medium text-snow">
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
      </section>
    </div>
  );
}
