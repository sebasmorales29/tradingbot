"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/i18n/T";

const fieldClass =
  "h-12 w-full rounded-lg border border-snow/12 bg-[#2a3038] px-4 text-sm text-snow outline-none transition placeholder:text-snow/30 focus:border-pulse/50 focus:ring-2 focus:ring-pulse/30";

export function LoginForm() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-5">
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
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={fieldClass}
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2.5 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 h-12 rounded-lg bg-pulse text-sm font-bold text-ink transition hover:bg-pulse-dim hover:text-snow disabled:opacity-60"
      >
        {loading ? t.auth.entering : t.auth.enter}
      </button>

      <p className="text-center text-sm text-snow/50">
        {t.auth.noAccount}{" "}
        <Link
          href="/registro"
          className="font-medium text-pulse transition hover:text-pulse-dim"
        >
          {t.auth.registerLink}
        </Link>
      </p>
    </form>
  );
}
