"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/dashboard/UserMenu";
import { useT } from "@/components/i18n/T";

export function AppTopNav({
  email,
  showAdmin,
  role,
}: {
  email?: string;
  showAdmin?: boolean;
  role?: string;
}) {
  const t = useT();
  const pathname = usePathname();
  const onDashboard =
    pathname.startsWith("/dashboard") &&
    !pathname.startsWith("/dashboard/ajustes");
  const onAdmin = pathname.startsWith("/admin");
  const onSettings = pathname.startsWith("/dashboard/ajustes");

  const adminLabel =
    role === "support"
      ? t.admin.navSupport
      : role === "analyst"
        ? t.admin.navAnalytics
        : t.admin.navAdmin;

  return (
    <header className="border-b border-snow/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-5 md:px-8">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-display text-lg font-bold text-snow">
            Keel<span className="text-pulse">ra</span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/dashboard"
              className={
                onDashboard || onSettings
                  ? "text-snow"
                  : "text-snow/55 transition hover:text-snow"
              }
            >
              {t.dash.panel}
            </Link>
            {showAdmin && (
              <Link
                href="/admin"
                className={
                  onAdmin
                    ? "font-medium text-amber-300"
                    : "text-amber-300/70 transition hover:text-amber-200"
                }
              >
                {adminLabel}
              </Link>
            )}
          </nav>
        </div>
        <UserMenu email={email} />
      </div>
    </header>
  );
}
