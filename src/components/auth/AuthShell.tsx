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
    <main className="relative flex min-h-[100svh] flex-col px-6 py-6 md:py-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_0%,rgba(0,173,181,0.15),transparent_55%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-lg items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-md border border-snow/15 bg-slate/40 px-3 py-2 text-sm font-medium text-snow/85 transition hover:border-pulse/50 hover:text-pulse"
        >
          <span aria-hidden="true">←</span>
          {t.auth.back}
        </Link>
        <div className="flex items-center gap-3">
          <LanguageToggle />
          <Link href="/" className="font-display text-lg font-extrabold text-snow">
            Keel<span className="text-pulse">ra</span>
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto flex w-full max-w-sm flex-1 flex-col items-center justify-center py-12">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-pulse">
          Keelra
        </p>
        <h1 className="font-display text-3xl font-bold text-snow">{title}</h1>
        <p className="mt-2 mb-8 text-center text-sm leading-relaxed text-snow/60">
          {subtitle}
        </p>
        {children}
      </div>

      <footer className="relative z-10 mx-auto w-full max-w-lg pb-2 text-center text-xs text-snow/40">
        {t.auth.lost}{" "}
        <Link href="/" className="text-pulse/80 hover:underline">
          {t.auth.home}
        </Link>
      </footer>
    </main>
  );
}
