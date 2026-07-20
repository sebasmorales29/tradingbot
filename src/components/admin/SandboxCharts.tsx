"use client";

type Point = { x: number; y: number };

function pathFrom(points: Point[]) {
  if (!points.length) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

export function LineChart({
  series,
  width = 640,
  height = 220,
  color = "#00ADB5",
  secondary,
  markers,
  playhead,
  yFormat,
}: {
  series: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
  secondary?: { values: (number | null)[]; color: string }[];
  markers?: { index: number; type: "entry" | "exit"; price: number }[];
  playhead?: number;
  yFormat?: (n: number) => string;
}) {
  const pad = { t: 12, r: 12, b: 22, l: 52 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;

  const vals = series.filter((v): v is number => v != null && Number.isFinite(v));
  const extras =
    secondary?.flatMap((s) =>
      s.values.filter((v): v is number => v != null && Number.isFinite(v)),
    ) ?? [];
  const markerYs = markers?.map((m) => m.price) ?? [];
  const all = [...vals, ...extras, ...markerYs];
  if (!all.length) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-snow/10 text-sm text-snow/40"
        style={{ height }}
      >
        Sin datos
      </div>
    );
  }

  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;

  const toX = (i: number) =>
    pad.l + (i / Math.max(series.length - 1, 1)) * w;
  const toY = (v: number) => pad.t + (1 - (v - min) / span) * h;

  const mainPts: Point[] = [];
  series.forEach((v, i) => {
    if (v != null && Number.isFinite(v)) mainPts.push({ x: toX(i), y: toY(v) });
  });

  const fmt = yFormat ?? ((n: number) => n.toFixed(0));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="h-auto w-full rounded-xl border border-snow/10 bg-slate/20"
      role="img"
    >
      <line
        x1={pad.l}
        y1={pad.t}
        x2={pad.l}
        y2={height - pad.b}
        stroke="rgba(238,238,238,0.12)"
      />
      <line
        x1={pad.l}
        y1={height - pad.b}
        x2={width - pad.r}
        y2={height - pad.b}
        stroke="rgba(238,238,238,0.12)"
      />
      <text
        x={4}
        y={pad.t + 8}
        className="fill-snow/40"
        style={{ fontSize: 10 }}
      >
        {fmt(max)}
      </text>
      <text
        x={4}
        y={height - pad.b}
        className="fill-snow/40"
        style={{ fontSize: 10 }}
      >
        {fmt(min)}
      </text>

      {secondary?.map((s, si) => {
        const pts: Point[] = [];
        s.values.forEach((v, i) => {
          if (v != null && Number.isFinite(v))
            pts.push({ x: toX(i), y: toY(v) });
        });
        return (
          <path
            key={si}
            d={pathFrom(pts)}
            fill="none"
            stroke={s.color}
            strokeWidth={1.25}
            opacity={0.85}
          />
        );
      })}

      <path
        d={pathFrom(mainPts)}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
      />

      {markers?.map((m, i) => (
        <circle
          key={`${m.type}-${m.index}-${i}`}
          cx={toX(m.index)}
          cy={toY(m.price)}
          r={4}
          fill={m.type === "entry" ? "#34d399" : "#f87171"}
          stroke="#222831"
          strokeWidth={1}
        />
      ))}

      {playhead != null && playhead >= 0 && playhead < series.length && (
        <line
          x1={toX(playhead)}
          y1={pad.t}
          x2={toX(playhead)}
          y2={height - pad.b}
          stroke="#EEEEEE"
          strokeOpacity={0.35}
          strokeDasharray="4 3"
        />
      )}
    </svg>
  );
}
