"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/admin", label: "Resumen", match: (p: string) => p === "/admin" },
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    key: "users" as const,
    match: (p: string) => p.startsWith("/admin/usuarios"),
  },
  {
    href: "/admin/bots",
    label: "Bots",
    key: "bots" as const,
    match: (p: string) => p.startsWith("/admin/bots"),
  },
  {
    href: "/admin/actividad",
    label: "Actividad",
    key: "activity" as const,
    match: (p: string) => p.startsWith("/admin/actividad"),
  },
  {
    href: "/admin/estrategia",
    label: "Estrategia",
    key: "strategy" as const,
    match: (p: string) => p.startsWith("/admin/estrategia"),
  },
];

export function AdminNav({
  canUsers,
  canBots,
  canActivity,
  canStrategy,
}: {
  canUsers: boolean;
  canBots: boolean;
  canActivity: boolean;
  canStrategy: boolean;
}) {
  const pathname = usePathname();

  const visible = items.filter((item) => {
    if (!("key" in item)) return true;
    if (item.key === "users") return canUsers;
    if (item.key === "bots") return canBots;
    if (item.key === "activity") return canActivity;
    if (item.key === "strategy") return canStrategy;
    return true;
  });

  return (
    <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-44 md:flex-col md:gap-0.5">
      {visible.map((item) => {
        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm transition ${
              active
                ? "bg-pulse/15 font-medium text-pulse"
                : "text-snow/55 hover:bg-snow/5 hover:text-snow"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
