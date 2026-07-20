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

  let role = await readRole(user.id);

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
      // sin service role, al menos tratar como admin en esta request
      role = "admin";
    }
  }

  return {
    user,
    role,
    can: (permission) => can(role, permission),
  };
}

async function readRole(userId: string): Promise<Role> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (data && "role" in data && isRole(data.role)) {
    return data.role;
  }
  return "user";
}

/** @deprecated usar getSessionAccess().can('admin_console') */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return getBootstrapAdminEmails().includes(email.trim().toLowerCase());
}
