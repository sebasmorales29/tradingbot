"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/T";

const INTERVAL_MS = 60_000; // every 60s while active

export function BotAutoTick({ isActive }: { isActive: boolean }) {
  const router = useRouter();
  const t = useT();
  const [lastMsg, setLastMsg] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const busy = useRef(false);

  async function tick(manual = false) {
    if (busy.current) return;
    busy.current = true;
    if (manual) setRunning(true);
    try {
      const res = await fetch("/api/bot/tick", { method: "POST" });
      const data = await res.json();
      if (data.message) setLastMsg(data.message);
      router.refresh();
    } catch {
      setLastMsg("Error de red");
    } finally {
      busy.current = false;
      setRunning(false);
    }
  }

  useEffect(() => {
    if (!isActive) return;
    void tick();
    const id = window.setInterval(() => void tick(), INTERVAL_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => void tick(true)}
        disabled={running}
        className="rounded-md border border-pulse/40 px-4 py-2 text-sm font-semibold text-pulse transition hover:bg-pulse/10 disabled:opacity-60"
      >
        {running ? t.dash.scanning : t.dash.scanNow}
      </button>
      {lastMsg && (
        <span className="text-xs text-snow/45">{lastMsg}</span>
      )}
    </div>
  );
}
