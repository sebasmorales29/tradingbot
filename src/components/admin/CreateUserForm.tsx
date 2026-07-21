"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ROLES, roleLabel, type Role } from "@/lib/roles";
import { isAdult, parseDateOfBirth } from "@/lib/identity";
import { Select } from "@/components/ui/Select";
import { useT } from "@/components/i18n/T";
import { useLanguage } from "@/lib/i18n/LanguageProvider";

export function CreateUserForm() {
  const t = useT();
  const { locale } = useLanguage();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputClass =
    "mt-1 w-full rounded-md border border-snow/15 bg-ink px-3 py-2 text-snow outline-none ring-pulse focus:ring-2";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const dob = parseDateOfBirth(dateOfBirth);
    if (!dob) {
      setError(t.admin.invalidDob);
      return;
    }
    if (!isAdult(dob)) {
      setError(t.admin.mustBe18);
      return;
    }

    setBusy(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dateOfBirth,
        role,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);

    if (!res.ok) {
      setError(data.error ?? t.admin.createError);
      return;
    }

    router.push(`/admin/usuarios/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="mt-8 max-w-lg space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-snow/50">{t.auth.firstName}</span>
          <input
            required
            className={inputClass}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="text-snow/50">{t.auth.lastName}</span>
          <input
            required
            className={inputClass}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
        </label>
      </div>
      <label className="block text-sm">
        <span className="text-snow/50">{t.auth.dateOfBirth}</span>
        <input
          type="date"
          required
          className={inputClass}
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-snow/50">{t.auth.email}</span>
        <input
          type="email"
          required
          className={inputClass}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-snow/50">{t.admin.tempPassword}</span>
        <input
          type="password"
          required
          minLength={6}
          className={inputClass}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <label className="block text-sm">
        <span className="text-snow/50">{t.admin.role}</span>
        <Select
          className="mt-1"
          value={role}
          aria-label={t.admin.role}
          onChange={(v) => setRole(v as Role)}
          options={ROLES.map((r) => ({
            value: r,
            label: roleLabel(r, locale),
          }))}
        />
      </label>

      {error && <p className="text-sm text-red-300">{error}</p>}

      <div className="flex flex-wrap gap-3 pt-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-pulse px-4 py-2 text-sm font-semibold text-ink transition hover:bg-pulse/90 disabled:opacity-50"
        >
          {busy ? t.admin.creating : t.admin.createUserBtn}
        </button>
        <Link
          href="/admin/usuarios"
          className="rounded-lg border border-snow/20 px-4 py-2 text-sm text-snow/70 transition hover:bg-snow/5"
        >
          {t.admin.cancel}
        </Link>
      </div>
    </form>
  );
}
