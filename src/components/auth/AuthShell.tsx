"use client";

import Link from "next/link";
import { LanguageToggle } from "@/components/i18n/LanguageToggle";
import { useT } from "@/components/i18n/T";

type AuthShellProps = {
  mode: "login" | "register";
  children: React.ReactNode;
};

export function AuthShell({ mode, children }: AuthShellProps) {
  const t = useT();
  const title = mode === "login" ? t.auth.loginTitle : t.auth.registerTitle;
  const subtitle = mode === "login" ? t.auth.loginSub : t.auth.registerSub;

  return (
    <main className="relative flex min-h-[100svh] flex-col overflow-hidden bg-ink">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_20%_10%,rgba(0,173,181,0.16),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_90%_80%,rgba(57,62,70,0.85),transparent_50%)]" />
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-60" />

      <header className="relative z-20 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-8">
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-tight text-snow md:text-xl"
        >
          Keel<span className="text-pulse">ra</span>
        </Link>
        <LanguageToggle className="opacity-80 transition hover:opacity-100" />
      </header>

      <div className="relative z-10 mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 pb-12 pt-4 md:grid-cols-2 md:gap-16 md:px-8 md:pb-16 md:pt-0">
        <aside className="hidden md:block">
          <p className="font-display text-5xl font-extrabold leading-[0.95] tracking-tight text-snow lg:text-6xl">
            Keel<span className="text-pulse">ra</span>
          </p>
          <p className="mt-5 max-w-sm text-lg font-medium leading-snug text-snow/85">
            {t.auth.brandLine}
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-snow/50">
            {t.auth.brandHint}
          </p>
          <div className="mt-10 h-px w-24 bg-gradient-to-r from-pulse to-transparent" />
          <p className="mt-4 text-xs uppercase tracking-[0.16em] text-snow/35">
            {mode === "login" ? t.auth.loginBadge : t.auth.registerBadge}
          </p>
        </aside>

        <section className="mx-auto w-full max-w-md md:mx-0 md:justify-self-end">
          <div className="mb-8 md:mb-9">
            <Link
              href="/"
              className="mb-5 inline-flex items-center gap-1.5 text-sm text-snow/45 transition hover:text-pulse md:hidden"
            >
              <span aria-hidden>←</span>
              {t.auth.back}
            </Link>
            <h1 className="font-display text-3xl font-bold tracking-tight text-snow sm:text-4xl">
              {title}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-snow/55 sm:text-base">
              {subtitle}
            </p>
          </div>

          {children}

          <p className="mt-8 text-center text-xs text-snow/35 md:text-left">
            <Link href="/" className="transition hover:text-snow/60">
              ← {t.auth.home}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
