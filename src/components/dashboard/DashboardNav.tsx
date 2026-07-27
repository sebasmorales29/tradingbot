"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/T";

const items = [
  {
    href: "/dashboard",
    key: "overview" as const,
    match: (p: string) => p === "/dashboard",
  },
  {
    href: "/dashboard/bot",
    key: "bot" as const,
    match: (p: string) => p.startsWith("/dashboard/bot"),
  },
  {
    href: "/dashboard/actividad",
    key: "activity" as const,
    match: (p: string) => p.startsWith("/dashboard/actividad"),
  },
  {
    href: "/dashboard/control",
    key: "control" as const,
    match: (p: string) => p.startsWith("/dashboard/control"),
  },
];

export function DashboardNav({ canControlBot }: { canControlBot: boolean }) {
  const t = useT();
  const pathname = usePathname();
  const botSectionActive = pathname.startsWith("/dashboard/bot");
  const [botOpen, setBotOpen] = useState(botSectionActive);

  useEffect(() => {
    if (botSectionActive) setBotOpen(true);
  }, [botSectionActive]);

  const labels = {
    overview: t.dash.navOverview,
    bot: t.dash.navBot,
    activity: t.dash.navActivity,
    control: t.dash.navControl,
  };

  const visible = items.filter(
    (item) => item.key !== "control" || canControlBot,
  );

  const profileActive =
    pathname === "/dashboard/bot" || pathname === "/dashboard/bot/";
  const detailsActive = pathname.startsWith("/dashboard/bot/detalle");

  return (
    <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-44 md:flex-col md:gap-0.5">
      {visible.map((item) => {
        if (item.key === "bot") {
          return (
            <div key={item.href} className="flex shrink-0 flex-col md:w-full">
              <button
                type="button"
                onClick={() => setBotOpen((o) => !o)}
                aria-expanded={botOpen}
                className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition md:rounded-none md:rounded-r-md ${
                  botSectionActive
                    ? "bg-pulse/10 font-medium text-pulse md:border-l-2 md:border-pulse md:pl-[10px]"
                    : "text-snow/55 hover:bg-snow/[0.04] hover:text-snow md:border-l-2 md:border-transparent md:pl-[10px]"
                }`}
              >
                <span>{labels.bot}</span>
                <svg
                  viewBox="0 0 16 16"
                  className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${
                    botOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                >
                  <path
                    fill="currentColor"
                    d="M4.47 6.22a.75.75 0 0 1 1.06 0L8 8.69l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 0-1.06Z"
                  />
                </svg>
              </button>
              {botOpen && (
                <div className="ml-2 flex flex-row gap-0.5 border-l border-snow/10 pl-2 md:ml-3 md:flex-col">
                  <Link
                    href="/dashboard/bot"
                    className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition ${
                      profileActive
                        ? "font-medium text-pulse"
                        : "text-snow/50 hover:text-snow"
                    }`}
                  >
                    {t.dash.navBotProfile}
                  </Link>
                  <Link
                    href="/dashboard/bot/detalle"
                    className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition ${
                      detailsActive
                        ? "font-medium text-pulse"
                        : "text-snow/50 hover:text-snow"
                    }`}
                  >
                    {t.dash.navBotDetails}
                  </Link>
                </div>
              )}
            </div>
          );
        }

        const active = item.match(pathname);
        const danger = item.key === "control";
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm transition md:rounded-none md:rounded-r-md ${
              active
                ? danger
                  ? "bg-red-500/10 font-medium text-red-300 md:border-l-2 md:border-red-400 md:pl-[10px]"
                  : "bg-pulse/10 font-medium text-pulse md:border-l-2 md:border-pulse md:pl-[10px]"
                : "text-snow/55 hover:bg-snow/[0.04] hover:text-snow md:border-l-2 md:border-transparent md:pl-[10px]"
            }`}
          >
            {labels[item.key]}
          </Link>
        );
      })}
    </nav>
  );
}
