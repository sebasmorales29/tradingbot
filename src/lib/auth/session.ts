import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  can,
  getBootstrapAdminEmails,
  isRole,
  type Permission,
  type Role,
} from "@/lib/roles";

export type SessionAccess = {
  user: User;
  role: Role;
  status: "active" | "suspended";
  can: (permission: Permission) => boolean;
};

/**
 * Carga el rol del usuario. Si el email está en ADMIN_EMAILS, fuerza admin en DB.
 */
export async function getSessionAccess(): Promise<SessionAccess | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const profile = await readProfile(user.id);
  let role = profile.role;
  const status = profile.status;

  const boot = getBootstrapAdminEmails();
  if (
    user.email &&
    boot.includes(user.email.trim().toLowerCase()) &&
    role !== "admin"
  ) {
    try {
      const admin = createAdminClient();
      await admin
        .from("profiles")
        .update({ role: "admin", updated_at: new Date().toISOString() })
        .eq("id", user.id);
      role = "admin";
    } catch {
      role = "admin";
    }
  }

  return {
    user,
    role,
    status,
    can: (permission) => can(role, permission),
  };
}

async function readProfile(
  userId: string,
): Promise<{ role: Role; status: "active" | "suspended" }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", userId)
    .maybeSingle();

  const role =
    data && "role" in data && isRole(data.role) ? data.role : ("user" as Role);
  const status =
    data && "status" in data && data.status === "suspended"
      ? ("suspended" as const)
      : ("active" as const);

  return { role, status };
}

/** @deprecated usar getSessionAccess().can('admin_console') */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getBootstrapAdminEmails().includes(email.trim().toLowerCase());
}
