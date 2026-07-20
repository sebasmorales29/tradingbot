"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLES, roleLabel, type Role } from "@/lib/roles";

type UserShape = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  status: "active" | "suspended";
  factors_count: number;
};

export function UserAdminActions({
  user,
  canManage,
  canRoles,
  isSelf,
}: {
  user: UserShape;
  canManage: boolean;
  canRoles: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [role, setRole] = useState<Role>(user.role);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function call(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    label?: string,
  ) {
    setBusy(label ?? method);
    setError(null);
    setMessage(null);
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      setError(data.error ?? "Error");
      return false;
    }
    setMessage(data.message ?? "Listo");
    if (data.redirect) {
      router.push(data.redirect);
      return true;
    }
    router.refresh();
    return true;
  }

  async function saveProfile() {
    await call(
      "PATCH",
      `/api/admin/users/${user.id}`,
      {
        full_name: fullName,
        ...(canRoles ? { role } : {}),
      },
      "save",
    );
  }

  if (!canManage && !canRoles) {
    return (
      <p className="mt-8 text-sm text-snow/45">
        Tu rol puede ver este usuario, pero no editarlo ni aplicar acciones.
      </p>
    );
  }

  return (
    <section className="mt-10 space-y-6">
      <h2 className="font-display text-xl font-bold text-snow">Acciones</h2>

      {(canManage || canRoles) && (
        <div className="rounded-xl border border-snow/10 bg-slate/30 p-5">
          <h3 className="text-sm font-semibold text-snow">Editar perfil</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {canManage && (
              <label className="block text-sm">
                <span className="text-snow/50">Nombre</span>
                <input
                  className="mt-1 w-full rounded-md border border-snow/15 bg-ink px-3 py-2 text-snow outline-none ring-pulse focus:ring-2"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </label>
            )}
            {canRoles && (
              <label className="block text-sm">
                <span className="text-snow/50">Rol</span>
                <select
                  className="mt-1 w-full rounded-md border border-snow/15 bg-ink px-3 py-2 text-snow outline-none ring-pulse focus:ring-2"
                  value={role}
                  disabled={isSelf}
                  onChange={(e) => setRole(e.target.value as Role)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {roleLabel(r)}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <button
            type="button"
            disabled={busy === "save"}
            onClick={() => void saveProfile()}
            className="mt-4 rounded-lg bg-pulse px-4 py-2 text-sm font-semibold text-ink transition hover:bg-pulse/90 disabled:opacity-50"
          >
            {busy === "save" ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      )}

      {canManage && (
        <div className="flex flex-wrap gap-3">
          <ActionBtn
            busy={busy === "reset_password"}
            onClick={() =>
              void call(
                "POST",
                `/api/admin/users/${user.id}/actions`,
                { action: "reset_password" },
                "reset_password",
              )
            }
          >
            Enviar reset de contraseña
          </ActionBtn>
          <ActionBtn
            busy={busy === "reset_mfa"}
            disabled={user.factors_count === 0}
            onClick={() =>
              void call(
                "POST",
                `/api/admin/users/${user.id}/actions`,
                { action: "reset_mfa" },
                "reset_mfa",
              )
            }
          >
            Resetear MFA ({user.factors_count})
          </ActionBtn>
          {user.status === "active" ? (
            <ActionBtn
              busy={busy === "suspend"}
              disabled={isSelf}
              tone="warn"
              onClick={() =>
                void call(
                  "POST",
                  `/api/admin/users/${user.id}/actions`,
                  { action: "suspend" },
                  "suspend",
                )
              }
            >
              Suspender cuenta
            </ActionBtn>
          ) : (
            <ActionBtn
              busy={busy === "unsuspend"}
              onClick={() =>
                void call(
                  "POST",
                  `/api/admin/users/${user.id}/actions`,
                  { action: "unsuspend" },
                  "unsuspend",
                )
              }
            >
              Reactivar cuenta
            </ActionBtn>
          )}
          <ActionBtn
            busy={busy === "delete"}
            disabled={isSelf}
            tone="danger"
            onClick={() => {
              if (
                !window.confirm(
                  `¿Eliminar permanentemente a ${user.email}? Esta acción no se puede deshacer.`,
                )
              ) {
                return;
              }
              void call(
                "POST",
                `/api/admin/users/${user.id}/actions`,
                { action: "delete" },
                "delete",
              );
            }}
          >
            Eliminar cuenta
          </ActionBtn>
        </div>
      )}

      {error && <p className="text-sm text-red-300">{error}</p>}
      {message && <p className="text-sm text-emerald-300">{message}</p>}
    </section>
  );
}

function ActionBtn({
  children,
  onClick,
  busy,
  disabled,
  tone = "default",
}: {
  children: React.ReactNode;
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  tone?: "default" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-500/50 text-red-300 hover:bg-red-500/10"
      : tone === "warn"
        ? "border-amber-500/50 text-amber-300 hover:bg-amber-500/10"
        : "border-snow/20 text-snow/80 hover:bg-snow/5";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      className={`rounded-lg border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${toneClass}`}
    >
      {busy ? "…" : children}
    </button>
  );
}
