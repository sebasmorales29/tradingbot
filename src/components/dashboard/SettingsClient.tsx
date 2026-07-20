"use client";

import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { useT } from "@/components/i18n/T";

export function SettingsClient({
  email,
  showAdmin,
}: {
  email?: string;
  showAdmin?: boolean;
}) {
  const t = useT();

  return (
    <main className="min-h-[100svh] bg-ink">
      <DashboardHeader email={email} showAdmin={showAdmin} />

      <div className="mx-auto max-w-6xl px-6 py-10 md:px-8">
        <h1 className="font-display text-3xl font-bold text-snow md:text-4xl">
          {t.dash.settingsTitle}
        </h1>
        <p className="mt-2 text-snow/60">{t.dash.settingsLead}</p>

        <div className="mt-10 max-w-xl space-y-6">
          <section className="rounded-xl border border-snow/10 bg-slate/40 p-6">
            <h2 className="font-display text-lg font-bold text-snow">
              {t.dash.languageTitle}
            </h2>
            <p className="mt-1 text-sm text-snow/55">{t.dash.languageHelp}</p>
            <div className="mt-4">
              <LanguageToggle />
            </div>
          </section>

          <section className="rounded-xl border border-snow/10 bg-slate/40 p-6">
            <h2 className="font-display text-lg font-bold text-snow">
              {t.dash.accountTitle}
            </h2>
            <p className="mt-2 text-sm text-snow/70">{email}</p>
            <p className="mt-4 text-sm text-snow/45">{t.dash.comingSoon}</p>
          </section>
        </div>
      </div>
    </main>
  );
}
