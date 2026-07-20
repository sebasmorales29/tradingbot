"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export function BotAdminControls({
  userId,
  isActive,
  killSwitch,
  riskPercent,
  mode,
  canEdit,
}: {
  userId: string;
  isActive: boolean;
  killSwitch: boolean;
  riskPercent: number;
  mode: "paper" | "live";
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [risk, setRisk] = useState(String(riskPercent));
  const [busy, setBusy] = useState<string | null>(null);

  if (!canEdit) return null;

  async function patch(body: Record<string, unknown>, label: string) {
    setBusy(label);
    const res = await fetch(`/api/admin/bots/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (!res.ok) {
      toast({
        tone: "error",
        title: "No se pudo actualizar el bot",
        message: data.error ?? "Error",
      });
      return;
    }
    toast({
      tone: "success",
      title: "Información actualizada con éxito",
      message: data.message,
    });
    router.refresh();
  }

  return (
    <section className="mt-8 rounded-xl border border-snow/10 bg-slate/30 p-5">
      <h2 className="font-display text-lg font-bold text-snow">
        Controles del bot
      </h2>
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void patch({ is_active: !isActive }, "toggle")
          }
          className={`rounded-lg border px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${
            isActive
              ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
              : "border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
          }`}
        >
          {busy === "toggle"
            ? "…"
            : isActive
              ? "Pausar bot"
              : "Activar bot"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void patch({ kill_switch: !killSwitch }, "kill")
          }
          className={`rounded-lg border px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
            killSwitch
              ? "border-amber-500/50 text-amber-300 hover:bg-amber-500/10"
              : "border-snow/20 text-snow/80 hover:bg-snow/5"
          }`}
        >
          {busy === "kill"
            ? "…"
            : killSwitch
              ? "Desactivar kill switch"
              : "Activar kill switch"}
        </button>
        <button
          type="button"
          disabled={busy !== null}
          onClick={() =>
            void patch(
              { mode: mode === "paper" ? "live" : "paper" },
              "mode",
            )
          }
          className="rounded-lg border border-snow/20 px-4 py-2 text-sm text-snow/80 transition hover:bg-snow/5 disabled:opacity-50"
        >
          {busy === "mode"
            ? "…"
            : mode === "paper"
              ? "Cambiar a Live"
              : "Cambiar a Paper"}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-snow/50">Riesgo %</span>
          <input
            type="number"
            step="0.05"
            min="0.1"
            max="5"
            value={risk}
            onChange={(e) => setRisk(e.target.value)}
            className="mt-1 w-28 rounded-md border border-snow/15 bg-ink px-3 py-2 text-snow outline-none ring-pulse focus:ring-2"
          />
        </label>
        <button
          type="button"
          disabled={busy !== null || Number(risk) === riskPercent}
          onClick={() =>
            void patch({ risk_percent: Number(risk) }, "risk")
          }
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
            Number(risk) !== riskPercent
              ? "bg-pulse text-ink hover:bg-pulse/90"
              : "border border-snow/15 bg-snow/5 text-snow/40"
          }`}
        >
          {busy === "risk" ? "…" : "Guardar riesgo"}
        </button>
      </div>
    </section>
  );
}
