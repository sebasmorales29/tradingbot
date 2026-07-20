export function AdminStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-snow/10 bg-slate/40 p-5">
      <p className="text-xs uppercase tracking-wider text-snow/45">{label}</p>
      <p
        className={`mt-2 font-display text-2xl font-bold ${
          accent ? "text-pulse" : "text-snow"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
