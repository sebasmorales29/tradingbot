"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ROLES, roleLabel, type Role } from "@/lib/roles";
import { isAdult, parseDateOfBirth } from "@/lib/identity";
import { useToast } from "@/components/ui/Toast";
import { Select } from "@/components/ui/Select";

type UserShape = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  date_of_birth: string | null;
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
  const { toast } = useToast();
  const [firstName, setFirstName] = useState(user.first_name ?? "");
  const [lastName, setLastName] = useState(user.last_name ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(user.date_of_birth ?? "");
  const [role, setRole] = useState<Role>(user.role);
  const [busy, setBusy] = useState<string | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState({
    firstName: user.first_name ?? "",
    lastName: user.last_name ?? "",
    dateOfBirth: user.date_of_birth ?? "",
    role: user.role,
  });

  const dirty = useMemo(() => {
    return (
      firstName.trim() !== savedSnapshot.firstName.trim() ||
      lastName.trim() !== savedSnapshot.lastName.trim() ||
      dateOfBirth !== savedSnapshot.dateOfBirth ||
      role !== savedSnapshot.role
    );
  }, [firstName, lastName, dateOfBirth, role, savedSnapshot]);

  const inputClass =
    "mt-1 w-full rounded-md border border-snow/15 bg-ink px-3 py-2 text-snow outline-none ring-pulse focus:ring-2";

  async function call(
    method: string,
    path: string,
    body?: Record<string, unknown>,
    label?: string,
  ) {
    setBusy(label ?? method);
    const res = await fetch(path, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      toast({
        tone: "error",
        title: "No se pudo completar la acción",
        message: data.error ?? "Ocurrió un error inesperado",
      });
      return false;
    }
    toast({
      tone: "success",
      title:
        label === "save"
          ? "Información actualizada con éxito"
          : "Acción completada",
      message: data.message,
    });
    if (data.redirect) {
      router.push(data.redirect);
      return true;
    }
    router.refresh();
    return true;
  }

  async function saveProfile() {
    if (!dirty) return;

    if (canManage && dateOfBirth) {
      const dob = parseDateOfBirth(dateOfBirth);
      if (!dob) {
        toast({
          tone: "error",
          title: "Datos inválidos",
          message: "Fecha de nacimiento inválida",
        });
        return;
      }
      if (!isAdult(dob)) {
        toast({
          tone: "error",
          title: "Datos inválidos",
          message: "Debe ser mayor de 18 años",
        });
        return;
      }
    }

    const ok = await call(
      "PATCH",
      `/api/admin/users/${user.id}`,
      {
        ...(canManage
          ? {
              first_name: firstName,
              last_name: lastName,
              date_of_birth: dateOfBirth || null,
            }
          : {}),
        ...(canRoles ? { role } : {}),
      },
      "save",
    );

    if (ok) {
      setSavedSnapshot({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth,
        role,
      });
    }
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
      <h2 className="font-display text-xl font-bold text-snow">Editar</h2>

      {(canManage || canRoles) && (
        <div className="rounded-xl border border-snow/10 bg-slate/30 p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {canManage && (
              <>
                <label className="block text-sm">
                  <span className="text-snow/50">Nombre</span>
                  <input
                    className={inputClass}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>
                <label className="block text-sm">
                  <span className="text-snow/50">Apellidos</span>
                  <input
                    className={inputClass}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </label>
                <label className="block text-sm sm:col-span-2">
                  <span className="text-snow/50">Fecha de nacimiento</span>
                  <input
                    type="date"
                    className={inputClass}
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                  />
                </label>
              </>
            )}
            {canRoles && (
              <label className="block text-sm">
                <span className="text-snow/50">Rol</span>
                <Select
                  className="mt-1"
                  value={role}
                  disabled={isSelf}
                  aria-label="Rol"
                  onChange={(v) => setRole(v as Role)}
                  options={ROLES.map((r) => ({
                    value: r,
                    label: roleLabel(r),
                  }))}
                />
              </label>
            )}
          </div>
          <button
            type="button"
            disabled={busy === "save" || !dirty}
            onClick={() => void saveProfile()}
            className={`mt-4 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
              dirty
                ? "bg-pulse text-ink hover:bg-pulse/90 disabled:opacity-50"
                : "border border-snow/15 bg-snow/5 text-snow/40"
            }`}
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
