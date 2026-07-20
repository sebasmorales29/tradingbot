"use client";

import { AppTopNav } from "@/components/AppTopNav";
import { DashboardNav } from "@/components/dashboard/DashboardNav";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();
  const isSettings = pathname.startsWith("/dashboard/ajustes");

  return (
    <div className="min-h-[100svh] bg-ink">
      <AppTopNav email={email} showAdmin={showAdmin} role={role} />

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
