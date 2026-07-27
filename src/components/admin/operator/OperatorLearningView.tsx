"use client";

import { useEffect, useRef, useState } from "react";
import { useOperatorBrain } from "@/components/admin/operator/OperatorBrainProvider";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function OperatorLearningView() {
  const t = useT();
  const { locale } = useLanguage();
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

  async function teach(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || busy) return;
    await post({ action: "teach", message, locale });
    setMessage("");
  }

  async function forget(id: string) {
    await post({ action: "deactivate_knowledge", knowledgeId: id });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="flex min-h-[480px] flex-col rounded-xl border border-snow/10 bg-slate/30 p-4">
        <h2 className="font-display text-lg font-bold text-snow">
          {t.admin.operatorChatTitle}
        </h2>
        <p className="mt-1 text-xs text-snow/45">{t.admin.operatorChatLead}</p>

        <div className="mt-3 flex-1 space-y-2 overflow-y-auto rounded-lg border border-snow/10 bg-ink/40 p-3">
          {data.chat.length === 0 && (
            <p className="text-sm text-snow/40">{t.admin.operatorChatEmpty}</p>
          )}
          {data.chat.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "ml-6 bg-pulse/15 text-snow"
                  : "mr-6 bg-snow/[0.06] text-snow/75"
              }`}
            >
              {m.content}
            </div>
          ))}
          <div ref={chatEnd} />
        </div>

        <form onSubmit={(e) => void teach(e)} className="mt-3 flex gap-2">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.admin.operatorChatPlaceholder}
            className="h-11 flex-1 rounded-lg border border-snow/15 bg-ink/50 px-3 text-sm text-snow outline-none focus:border-pulse/50"
          />
          <button
            type="submit"
            disabled={busy || message.trim().length < 3}
            className="h-11 rounded-lg bg-pulse px-4 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {t.admin.operatorTeach}
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-snow/10 bg-slate/30 p-4">
        <h2 className="font-display text-lg font-bold text-snow">
          {t.admin.operatorKnowledgeTitle}
        </h2>
        <p className="mt-1 text-xs text-snow/45">{t.admin.operatorKnowledgeLead}</p>
        <ul className="mt-3 max-h-[480px] space-y-2 overflow-y-auto">
          {data.knowledge.length === 0 && (
            <li className="text-sm text-snow/40">
              {t.admin.operatorKnowledgeEmpty}
            </li>
          )}
          {data.knowledge.map((k) => (
            <li
              key={k.id}
              className="rounded-lg border border-snow/10 bg-ink/35 px-3 py-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-pulse/80">
                    {k.kind}
                  </p>
                  <p className="mt-0.5 text-sm font-medium text-snow">{k.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-snow/50">
                    {k.content}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void forget(k.id)}
                  className="shrink-0 text-xs text-snow/40 hover:text-red-300"
                >
                  {t.admin.operatorForget}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
