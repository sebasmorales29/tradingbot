"use client";

import { useState } from "react";
import { useOperatorBrain } from "@/components/admin/operator/OperatorBrainProvider";
import { useT } from "@/components/i18n/T";

export function OperatorControlView() {
  const t = useT();
  const { data, loading, error, busy, post } = useOperatorBrain();
  const [msg, setMsg] = useState<string | null>(null);

  if (loading && !data) {
    return <p className="text-sm text-snow/45">{t.admin.operatorLoading}</p>;
  }
  if (error && !data) {
    return <p className="text-sm text-red-300">{error}</p>;
  }
  if (!data) return null;

  const active = data.brain.isActive;

  async function toggle() {
    setMsg(null);
    await post({ action: "toggle", isActive: !active });
    setMsg(t.admin.operatorToggleDone);
  }

  async function updateBrain() {
    setMsg(null);
    const res = await post({ action: "update_brain" });
    setMsg(
      typeof res.message === "string" ? res.message : t.admin.operatorUpdateDone,
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-snow/10 bg-slate/30 p-5">
        <h2 className="font-display text-xl font-bold text-snow">
          {t.admin.operatorControlTitle}
        </h2>
        <p className="mt-2 max-w-xl text-sm text-snow/55">
          {t.admin.operatorControlLead}
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="flex flex-col items-stretch gap-1 sm:items-center">
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggle()}
              aria-pressed={active}
              className={`inline-flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold transition disabled:opacity-50 ${
                active
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                  : "border-amber-500/50 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"
              }`}
            >
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  active ? "animate-pulse bg-emerald-400" : "bg-amber-300/80"
                }`}
              />
              {active ? t.admin.operatorPowerOn : t.admin.operatorPowerOff}
            </button>
            <p className="text-center text-[11px] text-snow/40">
              {active
                ? t.admin.operatorPowerHintOn
                : t.admin.operatorPowerHintOff}
            </p>
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={() => void updateBrain()}
            className="inline-flex h-12 min-w-[180px] items-center justify-center rounded-xl bg-pulse px-5 text-sm font-semibold text-ink transition hover:bg-pulse-dim hover:text-snow disabled:opacity-50"
          >
            {busy ? t.admin.operatorUpdating : t.admin.operatorUpdateBrain}
          </button>
        </div>

        {msg && <p className="mt-4 text-sm text-pulse/90">{msg}</p>}

        <p className="mt-4 text-xs text-snow/40">{t.admin.operatorUpdateHint}</p>
      </section>
    </div>
  );
}
