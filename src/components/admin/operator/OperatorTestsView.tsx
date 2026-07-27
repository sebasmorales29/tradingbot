"use client";

import { useEffect, useRef, useState } from "react";
import { useOperatorBrain } from "@/components/admin/operator/OperatorBrainProvider";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const MAX_IMAGE_CHARS = 900_000; // ~keep under ~1MB JSON payload

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

export function OperatorTestsView() {
  const t = useT();
  const { locale } = useLanguage();
  const { data, loading, error, busy, post } = useOperatorBrain();
  const [message, setMessage] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const chatEnd = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.tests?.length]);

  if (loading && !data) {
    return <p className="text-sm text-snow/45">{t.admin.operatorLoading}</p>;
  }
  if (error && !data) {
    return <p className="text-sm text-red-300">{error}</p>;
  }
  if (!data) return null;

  async function onPickImage(file: File | null) {
    setLocalError(null);
    if (!file) {
      setImageData(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setLocalError(t.admin.operatorTestImageInvalid);
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    if (dataUrl.length > MAX_IMAGE_CHARS) {
      setLocalError(t.admin.operatorTestImageTooBig);
      setImageData(null);
      return;
    }
    setImageData(dataUrl);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if ((!message.trim() && !imageData) || busy) return;
    setLocalError(null);
    await post({
      action: "test_message",
      message: message.trim() || t.admin.operatorTestImageOnly,
      imageData,
      locale,
    });
    setMessage("");
    setImageData(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function promote(testMessageId: string) {
    await post({
      action: "promote_test",
      testMessageId,
      locale,
    });
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-snow/10 bg-slate/30 p-4">
        <h2 className="font-display text-lg font-bold text-snow">
          {t.admin.operatorTestTitle}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-snow/55">
          {t.admin.operatorTestLead}
        </p>
      </section>

      <section className="flex min-h-[520px] flex-col rounded-xl border border-snow/10 bg-slate/30 p-4">
        <div className="flex-1 space-y-3 overflow-y-auto rounded-lg border border-snow/10 bg-ink/40 p-3">
          {data.tests.length === 0 && (
            <p className="text-sm text-snow/40">{t.admin.operatorTestEmpty}</p>
          )}
          {data.tests.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg px-3 py-2 text-sm ${
                m.role === "user"
                  ? "ml-4 bg-pulse/15 text-snow"
                  : "mr-4 bg-snow/[0.06] text-snow/75"
              }`}
            >
              {m.image_data && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.image_data}
                  alt=""
                  className="mb-2 max-h-56 rounded-md border border-snow/10 object-contain"
                />
              )}
              <p>{m.content}</p>
              {m.role === "user" && !m.promoted_knowledge_id && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void promote(m.id)}
                  className="mt-2 rounded-md border border-pulse/40 px-2.5 py-1 text-xs font-medium text-pulse transition hover:bg-pulse/10 disabled:opacity-50"
                >
                  {t.admin.operatorPromote}
                </button>
              )}
              {m.promoted_knowledge_id && (
                <p className="mt-2 text-[11px] text-emerald-300/80">
                  {t.admin.operatorPromoted}
                </p>
              )}
            </div>
          ))}
          <div ref={chatEnd} />
        </div>

        {imageData && (
          <div className="mt-3 flex items-center gap-3 rounded-lg border border-snow/10 bg-ink/50 p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageData}
              alt=""
              className="h-14 w-14 rounded object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setImageData(null);
                if (fileRef.current) fileRef.current.value = "";
              }}
              className="text-xs text-snow/50 hover:text-snow"
            >
              {t.admin.operatorRemoveImage}
            </button>
          </div>
        )}

        {(localError || null) && (
          <p className="mt-2 text-xs text-red-300">{localError}</p>
        )}

        <form onSubmit={(e) => void send(e)} className="mt-3 flex flex-col gap-2 sm:flex-row">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void onPickImage(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="h-11 rounded-lg border border-snow/15 px-3 text-sm text-snow/70 transition hover:text-snow"
          >
            {t.admin.operatorAttachImage}
          </button>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.admin.operatorTestPlaceholder}
            className="h-11 flex-1 rounded-lg border border-snow/15 bg-ink/50 px-3 text-sm text-snow outline-none focus:border-pulse/50"
          />
          <button
            type="submit"
            disabled={busy || (!message.trim() && !imageData)}
            className="h-11 rounded-lg bg-pulse px-4 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {t.admin.operatorTestSend}
          </button>
        </form>
      </section>
    </div>
  );
}
