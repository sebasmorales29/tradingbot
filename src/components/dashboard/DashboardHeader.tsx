"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/T";
import { SignOutButton } from "@/components/dashboard/SignOutButton";

export function DashboardHeader({
  email,
  showAdmin,
}: {
  email?: string;
  showAdmin?: boolean;
}) {
  const t = useT();
  const pathname = usePathname();

  const linkClass = (href: string) =>
    pathname === href || pathname.startsWith(href + "/")
      ? "text-snow"
      : "text-snow/55 hover:text-snow";

  return (
    <header className="border-b border-snow/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 md:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-display text-lg font-bold text-snow">
            Pulse<span className="text-pulse">Trade</span>
          </Link>
          <nav className="hidden items-center gap-4 text-sm sm:flex">
            <Link href="/dashboard" className={linkClass("/dashboard")}>
              {t.dash.panel}
            </Link>
            <Link
              href="/dashboard/ajustes"
              className={
                pathname === "/dashboard/ajustes"
                  ? "text-snow"
                  : "text-snow/55 hover:text-snow"
              }
            >
              {t.dash.settings}
            </Link>
            {showAdmin && (
              <Link
                href="/admin"
                className="text-amber-300/90 transition hover:text-amber-200"
              >
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden max-w-[180px] truncate text-sm text-snow/50 md:inline">
            {email}
          </span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
