"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useOperatorBrain } from "@/components/admin/operator/OperatorBrainProvider";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

const MAX_IMAGE_CHARS = 900_000;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
}

type TestMsg = {
  id: string;
  role: string;
  content: string;
  image_data: string | null;
  promoted_knowledge_id: string | null;
  created_at: string;
};

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

  const turns = useMemo(() => {
    const tests = (data?.tests ?? []) as TestMsg[];
    const out: Array<{ user: TestMsg; assistant: TestMsg | null }> = [];
    for (let i = 0; i < tests.length; i++) {
      const m = tests[i];
      if (m.role !== "user") continue;
      const next = tests[i + 1];
      out.push({
        user: m,
        assistant: next && next.role === "assistant" ? next : null,
      });
    }
    return out;
  }, [data?.tests]);

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
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-snow/10 bg-slate/30">
      <div className="shrink-0 border-b border-snow/10 px-4 py-2.5 sm:px-5">
        <h2 className="font-display text-base font-bold text-snow sm:text-lg">
          {t.admin.operatorTestTitle}
        </h2>
        <p className="mt-0.5 text-xs text-snow/45">{t.admin.operatorTestLead}</p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
        {turns.length === 0 && (
          <p className="pt-8 text-center text-sm text-snow/40">
            {t.admin.operatorTestEmpty}
          </p>
        )}
        {turns.map(({ user, assistant }) => {
          const promoted = Boolean(user.promoted_knowledge_id);
          return (
            <div key={user.id} className="mx-auto w-full max-w-3xl space-y-2">
              <div className="rounded-2xl bg-pulse/15 px-4 py-3 text-sm text-snow">
                {user.image_data && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.image_data}
                    alt=""
                    className="mb-2 max-h-56 rounded-md border border-snow/10 object-contain"
                  />
                )}
                <p className="whitespace-pre-wrap break-words">{user.content}</p>
              </div>
              {assistant && (
                <div className="rounded-2xl bg-ink/50 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words text-snow/85 ring-1 ring-snow/10">
                  {assistant.content}
                </div>
              )}
              <div className="flex items-center justify-end gap-2 px-1">
                {promoted ? (
                  <p className="text-[11px] text-emerald-300/80">
                    {t.admin.operatorPromoted}
                  </p>
                ) : (
                  <button
                    type="button"
                    disabled={busy || !assistant}
                    onClick={() => void promote(user.id)}
                    className="rounded-md border border-pulse/40 px-3 py-1.5 text-xs font-medium text-pulse transition hover:bg-pulse/10 disabled:opacity-40"
                  >
                    {t.admin.operatorPromote}
                  </button>
                )}
              </div>
            </div>
          );
        })}
        <div ref={chatEnd} />
      </div>

      <div className="sticky bottom-0 shrink-0 border-t border-snow/10 bg-slate/95 px-4 py-3 backdrop-blur-sm sm:px-5">
        {imageData && (
          <div className="mx-auto mb-2 flex max-w-3xl items-center gap-3 rounded-lg border border-snow/10 bg-ink/50 p-2">
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
        {localError && (
          <p className="mx-auto mb-2 max-w-3xl text-xs text-red-300">
            {localError}
          </p>
        )}
        <form
          onSubmit={(e) => void send(e)}
          className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row"
        >
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
            className="h-12 rounded-xl border border-snow/15 px-3 text-sm text-snow/70 transition hover:text-snow"
          >
            {t.admin.operatorAttachImage}
          </button>
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t.admin.operatorTestPlaceholder}
            className="h-12 min-w-0 flex-1 rounded-xl border border-snow/15 bg-ink/50 px-4 text-sm text-snow outline-none focus:border-pulse/50"
          />
          <button
            type="submit"
            disabled={busy || (!message.trim() && !imageData)}
            className="h-12 rounded-xl bg-pulse px-5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {t.admin.operatorTestSend}
          </button>
        </form>
      </div>
    </div>
  );
}
