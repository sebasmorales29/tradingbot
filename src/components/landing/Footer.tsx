"use client";

import { useT } from "@/components/i18n/T";

export function Footer() {
  const t = useT();

  return (
    <footer className="border-t border-snow/10 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 px-6 sm:flex-row sm:items-center md:px-8">
        <p className="font-display text-lg font-bold text-snow">
          Pulse<span className="text-pulse">Trade</span>
        </p>
        <p className="text-sm text-snow/45">
          © {new Date().getFullYear()} PulseTrade. {t.footer.tagline}
        </p>
      </div>
    </footer>
  );
}
