"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ToggleBotButton } from "@/components/dashboard/ToggleBotButton";
import { useT } from "@/components/i18n/T";

const INTERVAL_MS = 60_000;

function friendlyMessage(raw: string | undefined, ok: boolean): string {
  if (!raw) return ok ? "Listo" : "Error";
  const lower = raw.toLowerCase();
  if (lower.includes("451") || lower.includes("restricted")) {
    return "Mercado temporalmente no disponible desde el servidor. Reintenta.";
  }
  if (lower.includes("binance") || lower.includes("fetch failed")) {
    return "No se pudo conectar al mercado. Reintenta en un momento.";
  }
  if (raw.length > 80) return ok ? "Escaneo listo" : "Error al escanear";
  return raw;
}

/** Escaneo + pausa alineados; el mensaje de estado va debajo del grupo. */
export function OverviewActions({
  botId,
  isActive,
}: {
  botId: string;
  isActive: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [lastMsg, setLastMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);
  const [running, setRunning] = useState(false);
  const busy = useRef(false);

  async function tick(manual = false) {
    if (busy.current) return;
    busy.current = true;
    if (manual) setRunning(true);
    try {
      const res = await fetch("/api/bot/tick", { method: "POST" });
      const data = await res.json();
      const ok = Boolean(data.ok ?? res.ok);
      setIsError(!ok);
      setLastMsg(friendlyMessage(data.message, ok));
      router.refresh();
    } catch {
      setIsError(true);
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
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void tick(true)}
          disabled={running || !isActive}
          className="inline-flex h-11 min-w-[148px] items-center justify-center rounded-lg border border-pulse/50 bg-pulse/10 px-5 text-sm font-semibold text-pulse transition hover:bg-pulse hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? t.dash.scanning : t.dash.scanNow}
        </button>
        <ToggleBotButton botId={botId} isActive={isActive} />
      </div>
      {lastMsg && (
        <p
          className={`text-xs sm:text-right ${
            isError ? "text-red-300/90" : "text-snow/45"
          }`}
        >
          {lastMsg}
        </p>
      )}
    </div>
  );
}
