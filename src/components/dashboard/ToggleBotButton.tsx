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
      className={`rounded-md px-5 py-2.5 text-sm font-bold transition disabled:opacity-60 ${
        isActive
          ? "border border-snow/25 text-snow hover:border-red-400/50 hover:text-red-300"
          : "bg-pulse text-ink hover:bg-pulse-dim hover:text-snow"
      }`}
    >
      {loading
        ? t.dash.saving
        : isActive
          ? t.dash.pause
          : t.dash.activate}
    </button>
  );
}
