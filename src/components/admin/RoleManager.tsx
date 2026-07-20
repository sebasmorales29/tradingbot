"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ROLES, roleLabel, type Role } from "@/lib/roles";

type UserRow = {
  id: string;
  email: string | null;
  role: Role;
  created_at: string;
};

export function RoleManager({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function setRole(userId: string, role: Role) {
    setBusyId(userId);
    setError(null);
    const res = await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, role }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error ?? "Error");
      return;
    }
    router.refresh();
  }

  return (
    <section className="mt-12">
      <h2 className="font-display text-xl font-bold text-snow">
        Gestión de roles
      </h2>
      <p className="mt-1 text-sm text-snow/55">
        Solo administradores. Mismo login para todos; el rol decide qué ven.
      </p>
      {error && (
        <p className="mt-3 text-sm text-red-300">{error}</p>
      )}
      <ul className="mt-4 divide-y divide-snow/10 rounded-xl border border-snow/10">
        {users.map((u) => (
          <li
            key={u.id}
            className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm text-snow">{u.email ?? "—"}</p>
              <p className="text-xs text-snow/40">
                {roleLabel(u.role)} · {u.id.slice(0, 8)}…
              </p>
            </div>
            <select
              className="rounded-md border border-snow/15 bg-ink px-3 py-2 text-sm text-snow outline-none ring-pulse focus:ring-2"
              value={u.role}
              disabled={busyId === u.id}
              onChange={(e) => void setRole(u.id, e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
    </section>
  );
}
