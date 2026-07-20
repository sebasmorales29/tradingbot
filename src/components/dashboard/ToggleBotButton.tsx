"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/components/i18n/T";

export function ToggleBotButton({
  botId,
  isActive,
}: {
  botId: string;
  isActive: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    await supabase
      .from("bot_configs")
      .update({ is_active: !isActive, updated_at: new Date().toISOString() })
      .eq("id", botId);
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      className={`inline-flex h-11 min-w-[148px] items-center justify-center rounded-lg px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        isActive
          ? "border border-snow/20 bg-slate text-snow hover:border-red-400/60 hover:bg-red-500/10 hover:text-red-300"
          : "bg-pulse text-ink shadow-[0_0_0_1px_rgba(0,173,181,0.35)] hover:bg-pulse-dim hover:text-snow"
      }`}
    >
      {loading ? t.dash.saving : isActive ? t.dash.pause : t.dash.activate}
    </button>
  );
}
