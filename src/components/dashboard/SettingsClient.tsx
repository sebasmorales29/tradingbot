"use client";

import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { useT } from "@/components/i18n/T";
import { roleLabel, type Role } from "@/lib/roles";

export function SettingsClient({
  email,
  role,
}: {
  email?: string;
  role?: Role;
}) {
  const t = useT();

  return (
    <div>
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
          {role && (
            <p className="mt-2 text-sm text-snow/50">
              Rol: <span className="text-pulse">{roleLabel(role)}</span>
            </p>
          )}
          <p className="mt-4 text-sm text-snow/45">{t.dash.comingSoon}</p>
        </section>
      </div>
    </div>
  );
}
