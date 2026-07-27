"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/components/i18n/T";
import type { DashboardBot } from "@/lib/dashboard-data";
import {
  deriveBotConfigFromPreferences,
  type GuidedBotPreferences,
} from "@/lib/trading/bot-profile";

type Choice<T extends string> = {
  value: T;
  title: string;
  detail: string;
};

function ChoiceGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: Choice<T>[];
  onChange: (next: T) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-snow">{label}</p>
      <div
        className={`grid gap-2 ${
          options.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-3"
        }`}
      >
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded-lg border px-3 py-2.5 text-left transition ${
                active
                  ? "border-pulse bg-pulse/10 ring-1 ring-pulse/30"
                  : "border-snow/10 bg-slate/35 hover:border-snow/25 hover:bg-snow/[0.03]"
              }`}
            >
              <p
                className={`text-sm font-semibold ${
                  active ? "text-pulse" : "text-snow"
                }`}
              >
                {opt.title}
              </p>
              <p className="mt-0.5 text-[11px] leading-snug text-snow/45">
                {opt.detail}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function BotGuidedProfile({ bot }: { bot: DashboardBot }) {
  const t = useT();
  const { toast } = useToast();
  const supabase = useMemo(() => createClient(), []);
  const [prefs, setPrefs] = useState<GuidedBotPreferences>(bot.preferences);
  const [saving, setSaving] = useState(false);

  const derived = useMemo(() => deriveBotConfigFromPreferences(prefs), [prefs]);
  const dirty =
    JSON.stringify(prefs) !== JSON.stringify(bot.preferences) ||
    derived.riskPercent !== bot.risk_percent ||
    JSON.stringify(derived.pairs) !== JSON.stringify(bot.pairs ?? []);

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("bot_configs")
      .update({
        preferences: prefs,
        risk_percent: derived.riskPercent,
        pairs: derived.pairs,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bot.id);
    setSaving(false);

    if (error) {
      toast({
        tone: "error",
        title: t.dash.profileSaveError,
        message: error.message,
      });
      return;
    }

    toast({
      tone: "success",
      title: t.dash.profileSaved,
      message: t.dash.profileSavedHint,
    });
    window.location.reload();
  }

  const paceOptions: Choice<GuidedBotPreferences["pace"]>[] = [
    {
      value: "careful",
      title: t.dash.paceCareful,
      detail: t.dash.paceCarefulHint,
    },
    {
      value: "balanced",
      title: t.dash.paceBalanced,
      detail: t.dash.paceBalancedHint,
    },
    {
      value: "active",
      title: t.dash.paceActive,
      detail: t.dash.paceActiveHint,
    },
  ];

  const stressOptions: Choice<GuidedBotPreferences["stress"]>[] = [
    {
      value: "low",
      title: t.dash.stressLow,
      detail: t.dash.stressLowHint,
    },
    {
      value: "medium",
      title: t.dash.stressMedium,
      detail: t.dash.stressMediumHint,
    },
    {
      value: "high",
      title: t.dash.stressHigh,
      detail: t.dash.stressHighHint,
    },
  ];

  const focusOptions: Choice<GuidedBotPreferences["focus"]>[] = [
    {
      value: "btc",
      title: t.dash.focusBtc,
      detail: t.dash.focusBtcHint,
    },
    {
      value: "majors",
      title: t.dash.focusMajors,
      detail: t.dash.focusMajorsHint,
    },
  ];

  const autonomyOptions: Choice<GuidedBotPreferences["autonomy"]>[] = [
    {
      value: "guarded",
      title: t.dash.autoGuarded,
      detail: t.dash.autoGuardedHint,
    },
    {
      value: "standard",
      title: t.dash.autoStandard,
      detail: t.dash.autoStandardHint,
    },
  ];

  return (
    <section className="rounded-xl border border-pulse/20 bg-gradient-to-br from-slate/55 to-ink/70 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-pulse">
            {t.dash.guidedBadge}
          </p>
          <h2 className="mt-1 font-display text-xl font-bold text-snow">
            {t.dash.guidedTitle}
          </h2>
          <p className="mt-1 max-w-xl text-xs leading-relaxed text-snow/50">
            {t.dash.guidedLead}
          </p>
        </div>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => void save()}
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg bg-pulse px-4 text-sm font-semibold text-ink transition hover:bg-pulse-dim hover:text-snow disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? t.dash.saving : t.dash.guidedSave}
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <ChoiceGroup
          label={t.dash.questionPace}
          value={prefs.pace}
          options={paceOptions}
          onChange={(pace) => setPrefs((prev) => ({ ...prev, pace }))}
        />
        <ChoiceGroup
          label={t.dash.questionStress}
          value={prefs.stress}
          options={stressOptions}
          onChange={(stress) => setPrefs((prev) => ({ ...prev, stress }))}
        />
        <ChoiceGroup
          label={t.dash.questionFocus}
          value={prefs.focus}
          options={focusOptions}
          onChange={(focus) => setPrefs((prev) => ({ ...prev, focus }))}
        />
        <ChoiceGroup
          label={t.dash.questionAutonomy}
          value={prefs.autonomy}
          options={autonomyOptions}
          onChange={(autonomy) => setPrefs((prev) => ({ ...prev, autonomy }))}
        />
      </div>

      <div className="mt-4 rounded-lg border border-snow/10 bg-ink/45 px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-snow/35">
          {t.dash.keelraWillDo}
        </p>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-snow/75">
          <span>
            {t.dash.risk}:{" "}
            <strong className="text-snow">{derived.riskPercent}%</strong>
          </span>
          <span>
            {t.dash.pairs}:{" "}
            <strong className="text-snow">{derived.pairs.join(" · ")}</strong>
          </span>
          <span>
            {t.dash.guidedModeLabel}:{" "}
            <strong className="text-snow">
              {prefs.autonomy === "guarded"
                ? t.dash.guidedModeGuarded
                : t.dash.guidedModeStandard}
            </strong>
          </span>
        </div>
      </div>
    </section>
  );
}
