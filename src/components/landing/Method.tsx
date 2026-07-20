"use client";

import { useT } from "@/components/i18n/T";

export function Method() {
  const t = useT();

  return (
    <section id="metodo" className="relative bg-slate/40 py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="max-w-2xl">
          <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-pulse">
            {t.method.eyebrow}
          </p>
          <h2 className="mt-3 font-display text-3xl font-bold leading-tight text-snow md:text-5xl">
            {t.method.title}
          </h2>
          <p className="mt-4 text-snow/65">{t.method.lead}</p>
        </div>

        <div className="mt-16 grid gap-x-10 gap-y-12 sm:grid-cols-2">
          {t.method.points.map((item) => (
            <div key={item.title} className="border-t border-pulse/25 pt-6">
              <h3 className="font-display text-xl font-bold text-snow">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-snow/65 md:text-base">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
