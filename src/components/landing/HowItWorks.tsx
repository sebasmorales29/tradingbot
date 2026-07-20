"use client";

import { useT } from "@/components/i18n/T";

export function HowItWorks() {
  const t = useT();

  return (
    <section id="como" className="relative py-24 md:py-32">
      <div className="section-rule mx-auto mb-20 max-w-6xl" />
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-pulse">
          {t.how.eyebrow}
        </p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold leading-tight text-snow md:text-5xl">
          {t.how.title}
        </h2>
        <p className="mt-4 max-w-xl text-snow/65">{t.how.lead}</p>

        <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          {t.how.steps.map((step) => (
            <li key={step.n} className="relative">
              <span className="font-display text-5xl font-extrabold text-pulse/25 md:text-6xl">
                {step.n}
              </span>
              <h3 className="mt-2 font-display text-xl font-bold text-snow">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-snow/65 md:text-base">
                {step.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
