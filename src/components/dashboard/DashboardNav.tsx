"use client";

import Link from "next/link";
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

  const labels = {
    overview: t.dash.navOverview,
    bot: t.dash.navBot,
    activity: t.dash.navActivity,
    control: t.dash.navControl,
  };

  const visible = items.filter(
    (item) => item.key !== "control" || canControlBot,
  );

  return (
    <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-40 md:flex-col md:gap-0.5">
      {visible.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm transition ${
              active
                ? item.key === "control"
                  ? "font-medium text-red-300"
                  : "font-medium text-pulse"
                : "text-snow/55 hover:text-snow"
            }`}
          >
            {labels[item.key]}
          </Link>
        );
      })}
    </nav>
  );
}
