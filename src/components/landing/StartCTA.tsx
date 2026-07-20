"use client";

import Link from "next/link";
import { useT } from "@/components/i18n/T";

export function StartCTA() {
  const t = useT();

  return (
    <section id="empezar" className="relative py-24 md:py-32">
      <div className="section-rule mx-auto mb-20 max-w-6xl" />
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate to-ink px-8 py-12 md:px-14 md:py-16">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-pulse/20 blur-[70px]" />
          <div className="relative grid gap-10 md:grid-cols-[1.2fr_0.8fr] md:items-center">
            <div>
              <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-pulse">
                {t.cta.eyebrow}
              </p>
              <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-snow md:text-5xl">
                {t.cta.title}
              </h2>
              <p className="mt-4 max-w-lg text-snow/65">{t.cta.lead}</p>
            </div>

            <div className="flex flex-col gap-3 sm:items-stretch">
              <Link
                href="/registro"
                className="rounded-md bg-pulse px-5 py-3 text-center text-sm font-bold text-ink transition hover:bg-pulse-dim hover:text-snow"
              >
                {t.cta.register}
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-snow/20 px-5 py-3 text-center text-sm font-semibold text-snow/85 transition hover:border-pulse hover:text-pulse"
              >
                {t.cta.login}
              </Link>
            </div>
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-xs leading-relaxed text-snow/40 md:text-sm">
          {t.cta.disclaimer}
        </p>
      </div>
    </section>
  );
}
