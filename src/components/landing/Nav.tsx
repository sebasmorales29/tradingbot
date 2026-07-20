"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { useT } from "@/components/i18n/T";

export function Nav() {
  const t = useT();

  return (
    <header className="absolute inset-x-0 top-0 z-30">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 md:px-8">
        <a
          href="#top"
          className="font-display text-lg font-bold tracking-tight text-snow md:text-xl"
        >
          Pulse<span className="text-pulse">Trade</span>
        </a>
        <div className="flex items-center gap-3 md:gap-5">
          <a
            href="#como"
            className="hidden text-sm text-snow/70 transition hover:text-snow sm:inline"
          >
            {t.nav.how}
          </a>
          <a
            href="#metodo"
            className="hidden text-sm text-snow/70 transition hover:text-snow md:inline"
          >
            {t.nav.method}
          </a>
          <LanguageToggle />
          <Link
            href="/login"
            className="hidden text-sm text-snow/70 transition hover:text-snow sm:inline"
          >
            {t.nav.login}
          </Link>
          <Link
            href="/registro"
            className="rounded-md bg-pulse px-4 py-2 text-sm font-semibold text-ink transition hover:bg-pulse-dim hover:text-snow"
          >
            {t.nav.start}
          </Link>
        </div>
      </nav>
    </header>
  );
}
