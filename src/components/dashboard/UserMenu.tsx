"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/i18n/T";

export function UserMenu({ email }: { email?: string }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  const label = email?.trim() || "Cuenta";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex max-w-[220px] items-center gap-2 rounded-lg border border-snow/15 bg-slate/40 px-3 py-2 text-sm text-snow/80 transition hover:border-snow/25 hover:bg-slate/60"
      >
        <span className="truncate">{label}</span>
        <span
          className={`text-[10px] text-snow/40 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-52 overflow-hidden rounded-xl border border-snow/15 bg-[#1c1c1e]/95 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          <Link
            href="/dashboard/ajustes"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="block px-4 py-2.5 text-sm text-snow/80 transition hover:bg-snow/5 hover:text-snow"
          >
            {t.dash.settings}
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => void signOut()}
            className="block w-full px-4 py-2.5 text-left text-sm text-red-300/90 transition hover:bg-red-500/10"
          >
            {t.dash.logout}
          </button>
        </div>
      )}
    </div>
  );
}
