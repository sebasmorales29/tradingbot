"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/i18n/T";

export function SignOutButton() {
  const t = useT();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      className="rounded-md border border-snow/20 px-3 py-1.5 text-sm text-snow/80 transition hover:border-pulse hover:text-pulse"
    >
      {t.dash.logout}
    </button>
  );
}
