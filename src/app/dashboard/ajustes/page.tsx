import { redirect } from "next/navigation";
import { getSessionAccess } from "@/lib/auth/session";
import { SettingsClient } from "@/components/dashboard/SettingsClient";

export default async function SettingsPage() {
  const access = await getSessionAccess();
  if (!access) redirect("/login");

  return (
    <SettingsClient email={access.user.email} role={access.role} />
  );
}
