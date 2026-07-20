export const ROLES = ["user", "admin", "support", "analyst"] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | "dashboard"
  | "settings"
  | "bot_control"
  | "admin_console"
  | "admin_telemetry"
  | "admin_manage_roles"
  | "admin_manage_users"
  | "admin_support_view"
  | "admin_analytics";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  user: ["dashboard", "settings", "bot_control"],
  support: [
    "dashboard",
    "settings",
    "bot_control",
    "admin_console",
    "admin_support_view",
    "admin_telemetry",
  ],
  analyst: [
    "dashboard",
    "settings",
    "admin_console",
    "admin_analytics",
    "admin_telemetry",
  ],
  admin: [
    "dashboard",
    "settings",
    "bot_control",
    "admin_console",
    "admin_telemetry",
    "admin_manage_roles",
    "admin_manage_users",
    "admin_support_view",
    "admin_analytics",
  ],
};

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value);
}

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function roleLabel(role: Role, locale: "es" | "en" = "es"): string {
  const map = {
    es: {
      user: "Usuario",
      admin: "Administrador",
      support: "Soporte",
      analyst: "Analista",
    },
    en: {
      user: "User",
      admin: "Admin",
      support: "Support",
      analyst: "Analyst",
    },
  } as const;
  return map[locale][role];
}

export function getBootstrapAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return raw
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
