"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, setLocale, t } = useLanguage();

  return (
    <div
      className={`inline-flex items-center rounded-md border border-snow/15 bg-ink/40 p-0.5 text-xs font-semibold ${className}`}
      role="group"
      aria-label={t.lang.label}
    >
      <button
        type="button"
        onClick={() => setLocale("es")}
        className={`rounded px-2.5 py-1.5 transition ${
          locale === "es"
            ? "bg-pulse text-ink"
            : "text-snow/55 hover:text-snow"
        }`}
        aria-pressed={locale === "es"}
      >
        {t.lang.es}
      </button>
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded px-2.5 py-1.5 transition ${
          locale === "en"
            ? "bg-pulse text-ink"
            : "text-snow/55 hover:text-snow"
        }`}
        aria-pressed={locale === "en"}
      >
        {t.lang.en}
      </button>
    </div>
  );
}
