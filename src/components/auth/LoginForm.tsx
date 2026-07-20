"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/i18n/T";

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
    <form onSubmit={onSubmit} className="flex w-full max-w-sm flex-col gap-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm text-snow/70">
          {t.auth.email}
        </label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-snow/15 bg-ink/60 px-4 py-3 text-snow outline-none ring-pulse placeholder:text-snow/35 focus:ring-2"
          placeholder="you@email.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm text-snow/70">
          {t.auth.password}
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-snow/15 bg-ink/60 px-4 py-3 text-snow outline-none ring-pulse placeholder:text-snow/35 focus:ring-2"
          placeholder="••••••••"
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-pulse px-5 py-3 text-sm font-bold text-ink transition hover:bg-pulse-dim hover:text-snow disabled:opacity-60"
      >
        {loading ? t.auth.entering : t.auth.enter}
      </button>

      <p className="text-center text-sm text-snow/55">
        {t.auth.noAccount}{" "}
        <Link href="/registro" className="text-pulse hover:underline">
          {t.auth.registerLink}
        </Link>
      </p>
    </form>
  );
}
