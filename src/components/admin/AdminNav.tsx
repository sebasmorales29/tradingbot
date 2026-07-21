"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSandboxSessionOptional } from "@/components/admin/SandboxSessionProvider";
import { useT } from "@/components/i18n/T";

export function AdminNav({
  canUsers,
  canBots,
  canActivity,
  canStrategy,
  canSandbox,
}: {
  canUsers: boolean;
  canBots: boolean;
  canActivity: boolean;
  canStrategy: boolean;
  canSandbox: boolean;
}) {
  const t = useT();
  const pathname = usePathname();
  const sandbox = useSandboxSessionOptional();

  const items = [
    {
      href: "/admin",
      label: t.admin.navOverview,
      match: (p: string) => p === "/admin",
    },
    {
      href: "/admin/usuarios",
      label: t.admin.navUsers,
      key: "users" as const,
      match: (p: string) => p.startsWith("/admin/usuarios"),
    },
    {
      href: "/admin/bots",
      label: t.admin.navBots,
      key: "bots" as const,
      match: (p: string) => p.startsWith("/admin/bots"),
    },
    {
      href: "/admin/actividad",
      label: t.admin.navActivity,
      key: "activity" as const,
      match: (p: string) => p.startsWith("/admin/actividad"),
    },
    {
      href: "/admin/sandbox",
      label: t.admin.navSandbox,
      key: "sandbox" as const,
      match: (p: string) => p.startsWith("/admin/sandbox"),
    },
    {
      href: "/admin/estrategia",
      label: t.admin.navStrategy,
      key: "strategy" as const,
      match: (p: string) => p.startsWith("/admin/estrategia"),
    },
  ];

  const visible = items.filter((item) => {
    if (!("key" in item)) return true;
    if (item.key === "users") return canUsers;
    if (item.key === "bots") return canBots;
    if (item.key === "activity") return canActivity;
    if (item.key === "strategy") return canStrategy;
    if (item.key === "sandbox") return canSandbox;
    return true;
  });

  return (
    <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-44 md:flex-col md:gap-0.5">
      {visible.map((item) => {
        const active = item.match(pathname);
        const showLive =
          "key" in item &&
          item.key === "sandbox" &&
          Boolean(sandbox?.state) &&
          Boolean(sandbox?.liveOn);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm transition ${
              active
                ? "font-medium text-pulse"
                : "text-snow/55 hover:text-snow"
            }`}
          >
            {item.label}
            {showLive && (
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
