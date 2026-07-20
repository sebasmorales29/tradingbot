"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

type BotRow = {
  user_id: string;
  is_active: boolean;
  mode: string;
  risk_percent: number;
  pairs: string[] | null;
  kill_switch: boolean;
  updated_at: string;
  label: string;
  email: string | null;
};

export function AdminBotsView({ bots }: { bots: BotRow[] }) {
  const t = useT();
  const { locale } = useLanguage();

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-snow">
        {t.admin.botsTitle}
      </h1>
      <p className="mt-2 text-snow/60">{t.admin.botsLead}</p>

      <ul className="mt-8 divide-y divide-snow/10 rounded-xl border border-snow/10">
        {bots.map((b) => (
          <li
            key={b.user_id}
            className="flex flex-col gap-3 px-5 py-4 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <Link
                href={`/admin/bots/${b.user_id}`}
                className="font-medium text-pulse hover:text-pulse/80"
              >
                {b.label}
              </Link>
              <p className="truncate text-xs text-snow/40">
                {b.email}
                {" · "}
                {t.admin.overviewUpdated}{" "}
                {new Date(b.updated_at).toLocaleString(
                  locale === "en" ? "en-US" : "es-CR",
                )}
              </p>
            </div>
            <div className="text-snow/80">
              {b.is_active ? (
                <span className="text-emerald-300">{t.admin.active}</span>
              ) : (
                <span className="text-amber-300">{t.admin.paused}</span>
              )}
              {" · "}
              {b.mode}
              {" · "}
              {t.admin.riskLabel.replace("{n}", String(b.risk_percent))}
              {b.kill_switch ? " · KILL" : ""}
            </div>
            <div className="flex items-center gap-3">
              <p className="text-xs text-snow/45">
                {(b.pairs ?? []).join(", ")}
              </p>
              <Link
                href={`/admin/bots/${b.user_id}`}
                className="inline-flex shrink-0 rounded-md border border-pulse/40 bg-pulse/10 px-3 py-1.5 text-xs font-semibold text-pulse transition hover:bg-pulse/20"
              >
                {t.admin.viewBot}
              </Link>
            </div>
          </li>
        ))}
        {!bots.length && (
          <li className="px-5 py-10 text-center text-snow/50">
            {t.admin.botsEmpty}
          </li>
        )}
      </ul>
    </div>
  );
}
