"use client";

import Link from "next/link";
import { MarketVisual } from "./MarketVisual";
import { useT } from "@/components/i18n/T";

export function Hero() {
  const t = useT();

  return (
    <section
      id="top"
      className="relative flex min-h-[100svh] flex-col justify-center overflow-hidden pb-12 pt-24 md:pb-16 md:pt-28"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_70%_20%,rgba(0,173,181,0.18),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_15%_80%,rgba(57,62,70,0.9),transparent_50%)]" />
      <div className="hero-grid pointer-events-none absolute inset-0" />

      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-8 px-6 md:grid-cols-[1fr_1.05fr] md:gap-6 md:px-8">
        <div className="max-w-xl">
          <p className="animate-rise font-display text-4xl font-extrabold leading-[0.95] tracking-tight text-snow sm:text-5xl md:text-6xl lg:text-[4.75rem]">
            Keel
            <span className="text-pulse">ra</span>
          </p>

          <h1 className="animate-rise-delay-1 mt-5 font-display text-xl font-semibold leading-snug text-snow sm:text-2xl md:text-3xl">
            {t.hero.headline}
          </h1>

          <p className="animate-rise-delay-2 mt-3 max-w-md text-sm leading-relaxed text-snow/70 sm:text-base md:text-lg">
            {t.hero.sub}
          </p>

          <div className="animate-rise-delay-3 mt-7 flex flex-wrap items-center gap-4">
            <Link
              href="/registro"
              className="rounded-md bg-pulse px-6 py-3 text-sm font-bold text-ink transition hover:bg-pulse-dim hover:text-snow md:text-base"
            >
              {t.hero.cta}
            </Link>
            <a
              href="#como"
              className="text-sm font-medium text-snow/70 underline-offset-4 transition hover:text-pulse hover:underline md:text-base"
            >
              {t.hero.secondary}
            </a>
          </div>
        </div>

        <div className="animate-rise-delay-2 relative -mx-2 md:mx-0">
          <MarketVisual />
        </div>
      </div>
    </section>
  );
}
