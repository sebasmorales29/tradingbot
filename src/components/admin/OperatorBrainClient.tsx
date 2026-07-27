"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type BrainPayload = {
  brain: {
    isActive: boolean;
    displayName: string;
    modelVersion: string;
    lastTrainedAt: string | null;
    trainSampleWins: number;
    trainSampleLosses: number;
    notes: string | null;
  };
  model: {
    version: string;
    trainedAt: string;
    minScoreDefault: number;
  };
  knowledge: Array<{
    id: string;
    kind: string;
    title: string;
    content: string;
    effect: Record<string, unknown>;
    createdAt: string;
  }>;
  calibration: Array<{
    regime: string;
    tradesCount: number;
    winRate: number | null;
  }>;
  chat: Array<{
    id: string;
    role: string;
    content: string;
    created_at: string;
  }>;
};

export function OperatorBrainClient() {
  const t = useT();
  const { locale } = useLanguage();
  const dateLocale = locale === "en" ? "en-US" : "es-CR";
  const [data, setData] = useState<BrainPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const chatEnd = useRef<HTMLDivElement>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/operator");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error");
      setData(json as BrainPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.chat?.length]);

  async function toggleBrain() {
    if (!data) return;
    setBusy(true);
    await fetch("/api/admin/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "toggle",
        isActive: !data.brain.isActive,
      }),
    });
    await reload();
    setBusy(false);
  }

  async function syncModel() {
    setBusy(true);
    await fetch("/api/admin/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sync_model" }),
    });
    await reload();
    setBusy(false);
  }

  async function teach(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/admin/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "teach", message, locale }),
    });
    if (res.ok) setMessage("");
    await reload();
    setBusy(false);
  }

  async function forget(id: string) {
    setBusy(true);
    await fetch("/api/admin/operator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "deactivate_knowledge", knowledgeId: id }),
    });
    await reload();
    setBusy(false);
  }

  if (loading && !data) {
    return <p className="text-sm text-snow/45">{t.admin.operatorLoading}</p>;
  }
  if (error && !data) {
    return <p className="text-sm text-red-300">{error}</p>;
  }
  if (!data) return null;

  const active = data.brain.isActive;

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-pulse/20 bg-gradient-to-br from-slate/50 to-ink/70 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse">
              {t.admin.operatorBadge}
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold text-snow">
              {data.brain.displayName}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-snow/55">
              {t.admin.operatorLead}
            </p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void toggleBrain()}
            className={`inline-flex h-11 min-w-[160px] items-center justify-center rounded-lg border px-4 text-sm font-semibold transition disabled:opacity-50 ${
              active
                ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300"
                : "border-amber-500/60 bg-amber-500/15 text-amber-300"
            }`}
          >
            {active ? t.admin.operatorOn : t.admin.operatorOff}
          </button>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label={t.admin.operatorModel} value={data.model.version} />
          <Stat
            label={t.admin.operatorTrained}
            value={
              data.model.trainedAt
                ? new Date(data.model.trainedAt).toLocaleString(dateLocale)
                : "—"
            }
          />
          <Stat
            label={t.admin.operatorSamples}
            value={`${data.brain.trainSampleWins || "—"}W / ${data.brain.trainSampleLosses || "—"}L`}
          />
          <Stat
            label={t.admin.operatorKnowledgeCount}
            value={String(data.knowledge.length)}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void syncModel()}
            className="rounded-lg border border-snow/15 px-3 py-2 text-xs text-snow/70 transition hover:text-snow disabled:opacity-50"
          >
            {t.admin.operatorSyncModel}
          </button>
          <p className="self-center text-xs text-snow/40">
            {t.admin.operatorTrainHint}
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex min-h-[420px] flex-col rounded-xl border border-snow/10 bg-slate/30 p-4">
          <h3 className="font-display text-lg font-bold text-snow">
            {t.admin.operatorChatTitle}
          </h3>
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
          <h3 className="font-display text-lg font-bold text-snow">
            {t.admin.operatorKnowledgeTitle}
          </h3>
          <p className="mt-1 text-xs text-snow/45">
            {t.admin.operatorKnowledgeLead}
          </p>
          <ul className="mt-3 max-h-[420px] space-y-2 overflow-y-auto">
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
                    <p className="mt-0.5 text-sm font-medium text-snow">
                      {k.title}
                    </p>
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

          {data.calibration.length > 0 && (
            <div className="mt-4 border-t border-snow/10 pt-3">
              <p className="text-xs uppercase tracking-wide text-snow/40">
                {t.admin.operatorCalibration}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-snow/55">
                {data.calibration.map((c) => (
                  <li key={c.regime}>
                    {c.regime}: {c.tradesCount} trades
                    {c.winRate != null ? ` · ${c.winRate}%` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-snow/10 px-3 py-3">
      <p className="text-[11px] uppercase tracking-wide text-snow/40">{label}</p>
      <p className="mt-1 text-sm font-semibold text-snow">{value}</p>
    </div>
  );
}
