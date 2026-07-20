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
      className={`inline-flex h-11 min-w-[148px] items-center justify-center rounded-lg border px-5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
        isActive
          ? "border-red-500/70 bg-red-500/15 text-red-300 hover:bg-red-500/25 hover:text-red-200"
          : "border-emerald-500/70 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 hover:text-emerald-200"
      }`}
    >
      {loading ? t.dash.saving : isActive ? t.dash.pause : t.dash.activate}
    </button>
  );
}
