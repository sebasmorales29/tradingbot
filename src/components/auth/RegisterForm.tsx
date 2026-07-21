"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/i18n/T";
import { isAdult, parseDateOfBirth } from "@/lib/identity";

const fieldClass =
  "h-12 w-full rounded-lg border border-snow/12 bg-[#2a3038] px-4 text-sm text-snow outline-none transition placeholder:text-snow/30 focus:border-pulse/50 focus:ring-2 focus:ring-pulse/30";

export function RegisterForm() {
  const t = useT();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(false);

    const dob = parseDateOfBirth(dateOfBirth);
    if (!dob) {
      setError(t.auth.dateOfBirth);
      return;
    }
    if (!isAdult(dob)) {
      setError(t.auth.underage);
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          date_of_birth: dateOfBirth,
          full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message);
      return;
    }

    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setInfo(true);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="firstName"
            className="mb-2 block text-sm text-snow/65"
          >
            {t.auth.firstName}
          </label>
          <input
            id="firstName"
            type="text"
            required
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="lastName" className="mb-2 block text-sm text-snow/65">
            {t.auth.lastName}
          </label>
          <input
            id="lastName"
            type="text"
            required
            autoComplete="family-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="dob" className="mb-2 block text-sm text-snow/65">
          {t.auth.dateOfBirth}
        </label>
        <input
          id="dob"
          type="date"
          required
          value={dateOfBirth}
          onChange={(e) => setDateOfBirth(e.target.value)}
          className={`${fieldClass} [color-scheme:dark]`}
        />
        <p className="mt-1.5 text-xs text-snow/40">{t.auth.ageHint}</p>
      </div>

      <div>
        <label htmlFor="email" className="mb-2 block text-sm text-snow/65">
          {t.auth.email}
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
          placeholder="you@email.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-2 block text-sm text-snow/65">
          {t.auth.password}
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
          placeholder={t.auth.passwordPlaceholder}
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}
      {info && (
        <p className="rounded-lg border border-pulse/30 bg-pulse/10 px-3 py-2.5 text-sm text-pulse">
          {t.auth.confirmEmail}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 h-12 rounded-lg bg-pulse text-sm font-bold text-ink transition hover:bg-pulse-dim hover:text-snow disabled:opacity-60"
      >
        {loading ? t.auth.creating : t.auth.create}
      </button>

      <p className="text-center text-sm text-snow/50">
        {t.auth.hasAccount}{" "}
        <Link
          href="/login"
          className="font-medium text-pulse transition hover:text-pulse-dim"
        >
          {t.auth.loginLink}
        </Link>
      </p>
    </form>
  );
}
