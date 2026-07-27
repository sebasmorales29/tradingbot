"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/i18n/T";

export function ToggleBotButton({
  botId,
  isActive,
  disclaimerAccepted = true,
}: {
  botId: string;
  isActive: boolean;
  disclaimerAccepted?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const activate = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("bot_configs")
      .update({
        is_active: true,
        disclaimer_accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", botId);
    setLoading(false);
    setShowDisclaimer(false);
    router.refresh();
  }, [botId, router]);

  async function toggle() {
    if (!isActive && !disclaimerAccepted) {
      setShowDisclaimer(true);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("bot_configs")
      .update({ is_active: !isActive, updated_at: new Date().toISOString() })
      .eq("id", botId);
    setLoading(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className={`inline-flex h-11 min-w-[148px] items-center justify-center rounded-lg border px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
          isActive
            ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 hover:text-emerald-200"
            : "border-amber-500/70 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 hover:text-amber-200"
        }`}
      >
        {loading ? t.dash.saving : isActive ? t.dash.pause : t.dash.activate}
      </button>

      {showDisclaimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-lg rounded-2xl border border-snow/10 bg-ink-elevated p-6 shadow-2xl sm:p-8">
            <div className="mb-1 flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <h2 className="text-lg font-bold text-snow">
                {t.dash.disclaimerTitle}
              </h2>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-relaxed text-snow/70">
              {t.dash.disclaimerBody.split("\n\n").map((p, i) => (
                <p key={i} className={p.startsWith("•") ? "pl-2" : ""}>
                  {p.split("\n").map((line, j) => (
                    <span key={j}>
                      {j > 0 && <br />}
                      {line}
                    </span>
                  ))}
                </p>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row-reverse">
              <button
                type="button"
                onClick={activate}
                disabled={loading}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-pulse px-5 text-sm font-semibold text-ink transition hover:bg-pulse/90 disabled:opacity-50"
              >
                {loading ? t.dash.saving : t.dash.disclaimerAccept}
              </button>
              <button
                type="button"
                onClick={() => setShowDisclaimer(false)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-snow/15 px-5 text-sm font-medium text-snow/60 transition hover:text-snow/90"
              >
                {t.dash.disclaimerCancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
