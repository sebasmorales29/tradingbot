"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/components/i18n/T";

export function UserBotDangerZone({
  botId,
  isActive,
  killSwitch,
  riskPercent,
  mode,
}: {
  botId: string;
  isActive: boolean;
  killSwitch: boolean;
  riskPercent: number;
  mode: "paper" | "live";
}) {
  const t = useT();
  const router = useRouter();
  const { toast } = useToast();
  const [risk, setRisk] = useState(String(riskPercent));
  const [busy, setBusy] = useState<string | null>(null);

  async function patch(
    body: {
      is_active?: boolean;
      kill_switch?: boolean;
      risk_percent?: number;
      mode?: "paper" | "live";
    },
    label: string,
  ) {
    setBusy(label);
    const supabase = createClient();
    const { error } = await supabase
      .from("bot_configs")
      .update({ ...body, updated_at: new Date().toISOString() })
      .eq("id", botId);
    setBusy(null);

    if (error) {
      toast({
        tone: "error",
        title: t.dash.controlError,
        message: error.message,
      });
      return;
    }

    toast({
      tone: "success",
      title: t.dash.controlOk,
      message: t.dash.controlOkHint,
    });
    router.refresh();
  }

  return (
    <section className="mt-8 rounded-xl border border-red-500/40 bg-red-500/[0.07] p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-red-500/50 bg-red-500/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-red-300">
          Danger zone
        </span>
        <h2 className="font-display text-lg font-bold text-red-200">
          {t.dash.dangerTitle}
        </h2>
      </div>
      <p className="mt-2 max-w-2xl text-sm text-red-200/60">{t.dash.dangerLead}</p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void patch({ is_active: !isActive }, "toggle")}
          className="rounded-lg border border-red-500/45 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          {busy === "toggle"
            ? "…"
            : isActive
              ? t.dash.pause
              : t.dash.activate}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => void patch({ kill_switch: !killSwitch }, "kill")}
          className={`rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
            killSwitch
              ? "border-red-400/70 bg-red-500/25 text-red-100 hover:bg-red-500/35"
              : "border-red-500/45 bg-red-500/10 text-red-200 hover:bg-red-500/20"
          }`}
        >
          {busy === "kill"
            ? "…"
            : killSwitch
              ? t.dash.killOff
              : t.dash.killOn}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => {
            if (mode === "paper") {
              if (!window.confirm(t.dash.liveConfirm)) return;
            }
            void patch(
              { mode: mode === "paper" ? "live" : "paper" },
              "mode",
            );
          }}
          className="rounded-lg border border-red-500/45 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
        >
          {busy === "mode"
            ? "…"
            : mode === "paper"
              ? t.dash.toLive
              : t.dash.toPaper}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3 border-t border-red-500/20 pt-5">
        <label className="block text-sm">
          <span className="text-red-200/55">{t.dash.risk}</span>
          <input
            type="number"
            step="0.05"
            min="0.1"
            max="5"
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            className="mt-1 w-28 rounded-md border border-red-500/35 bg-ink/80 px-3 py-2 text-red-100 outline-none ring-red-400/40 focus:ring-2"
          />
        </label>
        <button
          type="button"
          disabled={
            busy !== null ||
            !Number.isFinite(Number(risk)) ||
            Number(risk) === riskPercent
          }
          onClick={() => {
            const n = Number(risk);
            if (n < 0.1 || n > 5) {
              toast({
                tone: "error",
                title: t.dash.controlError,
                message: t.dash.riskRange,
              });
              return;
            }
            void patch({ risk_percent: n }, "risk");
          }}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
            Number(risk) !== riskPercent
              ? "border border-red-400/60 bg-red-500/30 text-red-50 hover:bg-red-500/40"
              : "border border-red-500/25 bg-red-500/5 text-red-300/35"
          }`}
        >
          {busy === "risk" ? "…" : t.dash.saveRisk}
        </button>
      </div>

      <ul className="mt-5 list-disc space-y-1.5 pl-5 text-xs text-red-200/50">
        <li>{t.dash.hintPause}</li>
        <li>{t.dash.hintKill}</li>
        <li>{t.dash.hintLive}</li>
        <li>{t.dash.hintRisk}</li>
      </ul>
    </section>
  );
}
