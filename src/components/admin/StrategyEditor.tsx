"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { TrendPulseParams } from "@/lib/trading/strategy/trend-pulse";
import { useToast } from "@/components/ui/Toast";

export function StrategyEditor({
  initial,
  canEdit,
}: {
  initial: TrendPulseParams;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [busy, setBusy] = useState(false);

  const dirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(saved),
    [form, saved],
  );

  function setNum(key: keyof TrendPulseParams, raw: string) {
    const n = Number(raw);
    setForm((f) => ({ ...f, [key]: Number.isFinite(n) ? n : f[key] }));
  }

  async function save() {
    if (!dirty) return;
    setBusy(true);
    const res = await fetch("/api/admin/strategy", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      toast({
        tone: "error",
        title: "No se pudo guardar",
        message: data.error ?? "Error al guardar la estrategia",
      });
      return;
    }
    setSaved(form);
    toast({
      tone: "success",
      title: "Información actualizada con éxito",
      message: "Los próximos ticks usarán estos valores.",
    });
    router.refresh();
  }

  const inputClass =
    "mt-1 w-full rounded-md border border-snow/15 bg-ink px-3 py-2 text-snow outline-none ring-pulse focus:ring-2 disabled:opacity-60";

  return (
    <div className="mt-8 space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="text-snow/50">Nombre</span>
          <input
            className={inputClass}
            disabled={!canEdit}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="text-snow/50">Timeframe</span>
          <input
            className={inputClass}
            disabled={!canEdit}
            value={form.timeframe}
            onChange={(e) =>
              setForm((f) => ({ ...f, timeframe: e.target.value }))
            }
          />
        </label>
        <Field
          label="EMA fast"
          disabled={!canEdit}
          value={form.fast}
          onChange={(v) => setNum("fast", v)}
          className={inputClass}
        />
        <Field
          label="EMA slow"
          disabled={!canEdit}
          value={form.slow}
          onChange={(v) => setNum("slow", v)}
          className={inputClass}
        />
        <Field
          label="ATR period"
          disabled={!canEdit}
          value={form.atrPeriod}
          onChange={(v) => setNum("atrPeriod", v)}
          className={inputClass}
        />
        <Field
          label="Stop ATR"
          disabled={!canEdit}
          value={form.stopAtr}
          onChange={(v) => setNum("stopAtr", v)}
          className={inputClass}
          step="0.1"
        />
        <Field
          label="Take profit ATR"
          disabled={!canEdit}
          value={form.tpAtr}
          onChange={(v) => setNum("tpAtr", v)}
          className={inputClass}
          step="0.1"
        />
        <Field
          label="Min ATR %"
          disabled={!canEdit}
          value={form.minAtrPct}
          onChange={(v) => setNum("minAtrPct", v)}
          className={inputClass}
          step="0.1"
        />
        <Field
          label="Max ATR %"
          disabled={!canEdit}
          value={form.maxAtrPct}
          onChange={(v) => setNum("maxAtrPct", v)}
          className={inputClass}
          step="0.1"
        />
      </div>

      {canEdit && (
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={() => void save()}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed ${
            dirty
              ? "bg-pulse text-ink hover:bg-pulse/90 disabled:opacity-50"
              : "border border-snow/15 bg-snow/5 text-snow/40"
          }`}
        >
          {busy ? "Guardando…" : "Guardar estrategia"}
        </button>
      )}

      {!canEdit && (
        <p className="text-sm text-snow/45">
          Solo administradores pueden editar estos parámetros.
        </p>
      )}

      <p className="text-xs text-snow/40">
        Paper · Cron externo cada 15 min · Riesgo diario máx. 3% en motor.
        Cambia con cuidado: afecta a todos los bots.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  className,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: string) => void;
  disabled: boolean;
  className: string;
  step?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="text-snow/50">{label}</span>
      <input
        type="number"
        step={step ?? "1"}
        className={className}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
