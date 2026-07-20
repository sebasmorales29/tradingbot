"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n/T";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { DashboardNav } from "@/components/dashboard/DashboardNav";

export function DashboardShell({
  email,
  showAdmin,
  role,
  canControlBot,
  children,
}: {
  email?: string;
  showAdmin?: boolean;
  role?: string;
  canControlBot: boolean;
  children: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const isSettings = pathname.startsWith("/dashboard/ajustes");

  const adminLabel =
    role === "support"
      ? "Soporte"
      : role === "analyst"
        ? "Analítica"
        : "Admin";

  return (
    <div className="min-h-[100svh] bg-ink">
      <header className="border-b border-snow/10">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 md:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="font-display text-lg font-bold text-snow">
              Pulse<span className="text-pulse">Trade</span>
            </Link>
            <nav className="hidden items-center gap-4 text-sm sm:flex">
              <Link
                href="/dashboard"
                className={
                  pathname.startsWith("/dashboard") && !isSettings
                    ? "text-snow"
                    : "text-snow/55 hover:text-snow"
                }
              >
                {t.dash.panel}
              </Link>
              {showAdmin && (
                <Link
                  href="/admin"
                  className="text-amber-300/90 transition hover:text-amber-200"
                >
                  {adminLabel}
                </Link>
              )}
            </nav>
          </div>
          <UserMenu email={email} />
        </div>
      </header>

      {isSettings ? (
        <div className="mx-auto max-w-6xl px-6 py-8 md:px-8">{children}</div>
      ) : (
        <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8 md:flex-row md:px-8">
          <DashboardNav canControlBot={canControlBot} />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      )}
    </div>
  );
}
