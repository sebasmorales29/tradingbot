import { getBootstrapAdminEmails } from "@/lib/roles";

/**
 * @deprecated Prefer getSessionAccess() + can(permission).
 * ADMIN_EMAILS sigue siendo bootstrap de admins al iniciar sesión.
 */
export function getAdminEmails(): string[] {
  return getBootstrapAdminEmails();
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getBootstrapAdminEmails().includes(email.trim().toLowerCase());
}
