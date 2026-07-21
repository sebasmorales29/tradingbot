"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useSandboxSessionOptional } from "@/components/admin/SandboxSessionProvider";
import { useT } from "@/components/i18n/T";

type NavItem = {
  href: string;
  label: string;
  key?: "users" | "bots" | "activity" | "strategy" | "sandbox";
  match: (p: string) => boolean;
};

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
  const sandboxSectionActive = pathname.startsWith("/admin/sandbox");
  const [sandboxOpen, setSandboxOpen] = useState(sandboxSectionActive);

  useEffect(() => {
    if (sandboxSectionActive) setSandboxOpen(true);
  }, [sandboxSectionActive]);

  const items: NavItem[] = [
    {
      href: "/admin",
      label: t.admin.navOverview,
      match: (p) => p === "/admin",
    },
    {
      href: "/admin/usuarios",
      label: t.admin.navUsers,
      key: "users",
      match: (p) => p.startsWith("/admin/usuarios"),
    },
    {
      href: "/admin/bots",
      label: t.admin.navBots,
      key: "bots",
      match: (p) => p.startsWith("/admin/bots"),
    },
    {
      href: "/admin/actividad",
      label: t.admin.navActivity,
      key: "activity",
      match: (p) => p.startsWith("/admin/actividad"),
    },
    {
      href: "/admin/sandbox",
      label: t.admin.navSandbox,
      key: "sandbox",
      match: (p) => p.startsWith("/admin/sandbox"),
    },
    {
      href: "/admin/estrategia",
      label: t.admin.navStrategy,
      key: "strategy",
      match: (p) => p.startsWith("/admin/estrategia"),
    },
  ];

  const visible = items.filter((item) => {
    if (!item.key) return true;
    if (item.key === "users") return canUsers;
    if (item.key === "bots") return canBots;
    if (item.key === "activity") return canActivity;
    if (item.key === "strategy") return canStrategy;
    if (item.key === "sandbox") return canSandbox;
    return true;
  });

  const showLive = Boolean(sandbox?.state) && Boolean(sandbox?.liveOn);
  const sessionActive = pathname === "/admin/sandbox";
  const logsActive = pathname.startsWith("/admin/sandbox/logs");

  return (
    <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto md:w-44 md:flex-col md:gap-0.5">
      {visible.map((item) => {
        if (item.key === "sandbox") {
          return (
            <div key={item.href} className="flex shrink-0 flex-col md:w-full">
              <button
                type="button"
                onClick={() => setSandboxOpen((o) => !o)}
                aria-expanded={sandboxOpen}
                className={`flex items-center justify-between gap-2 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm transition md:rounded-none md:rounded-r-md ${
                  sandboxSectionActive
                    ? "bg-pulse/10 font-medium text-pulse md:border-l-2 md:border-pulse md:pl-[10px]"
                    : "text-snow/55 hover:bg-snow/[0.04] hover:text-snow md:border-l-2 md:border-transparent md:pl-[10px]"
                }`}
              >
                <span className="flex items-center gap-2">
                  {item.label}
                  {showLive && (
                    <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-emerald-400" />
                  )}
                </span>
                <svg
                  viewBox="0 0 16 16"
                  className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform ${
                    sandboxOpen ? "rotate-180" : ""
                  }`}
                  aria-hidden
                >
                  <path
                    fill="currentColor"
                    d="M4.47 6.22a.75.75 0 0 1 1.06 0L8 8.69l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3 3a.75.75 0 0 1-1.06 0l-3-3a.75.75 0 0 1 0-1.06Z"
                  />
                </svg>
              </button>

              {sandboxOpen && (
                <div className="ml-2 flex flex-row gap-0.5 border-l border-snow/10 pl-2 md:ml-3 md:flex-col">
                  <Link
                    href="/admin/sandbox"
                    className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition ${
                      sessionActive
                        ? "font-medium text-pulse"
                        : "text-snow/50 hover:text-snow"
                    }`}
                  >
                    {t.admin.navSandboxSession}
                  </Link>
                  <Link
                    href="/admin/sandbox/logs"
                    className={`whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm transition ${
                      logsActive
                        ? "font-medium text-pulse"
                        : "text-snow/50 hover:text-snow"
                    }`}
                  >
                    {t.admin.navSandboxLogs}
                  </Link>
                </div>
              )}
            </div>
          );
        }

        const active = item.match(pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-md px-3 py-2 text-sm transition md:rounded-none md:rounded-r-md ${
              active
                ? "bg-pulse/10 font-medium text-pulse md:border-l-2 md:border-pulse md:pl-[10px]"
                : "text-snow/55 hover:bg-snow/[0.04] hover:text-snow md:border-l-2 md:border-transparent md:pl-[10px]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
