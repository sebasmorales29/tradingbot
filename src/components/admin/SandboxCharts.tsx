"use client";

import { useCallback, useMemo, useRef, useState } from "react";

type Point = { x: number; y: number };

function pathFrom(points: Point[]) {
  if (!points.length) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

export function LineChart({
  series,
  labels,
  width = 640,
  height = 220,
  color = "#00ADB5",
  secondary,
  markers,
  playhead,
  yFormat,
  valueLabel = "Valor",
}: {
  series: (number | null)[];
  /** Etiqueta por índice (p. ej. fecha de vela) para el tooltip */
  labels?: (string | null)[];
  width?: number;
  height?: number;
  color?: string;
  secondary?: { values: (number | null)[]; color: string }[];
  markers?: { index: number; type: "entry" | "exit"; price: number }[];
  playhead?: number;
  yFormat?: (n: number) => string;
  valueLabel?: string;
}) {
  const pad = { t: 12, r: 12, b: 22, l: 52 };
  const w = width - pad.l - pad.r;
  const h = height - pad.t - pad.b;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{
    index: number;
    value: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  const vals = series.filter((v): v is number => v != null && Number.isFinite(v));
  const extras =
    secondary?.flatMap((s) =>
      s.values.filter((v): v is number => v != null && Number.isFinite(v)),
    ) ?? [];
  const markerYs = markers?.map((m) => m.price) ?? [];
  const all = [...vals, ...extras, ...markerYs];

  const geometry = useMemo(() => {
    if (!all.length) return null;
    const min = Math.min(...all);
    const max = Math.max(...all);
    const span = max - min || 1;
    const toX = (i: number) =>
      pad.l + (i / Math.max(series.length - 1, 1)) * w;
    const toY = (v: number) => pad.t + (1 - (v - min) / span) * h;
    return { min, max, span, toX, toY };
  }, [all, series.length, w, h, pad.l, pad.t]);

  const onMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      if (!geometry || !series.length) return;
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const scaleX = width / rect.width;
      const xSvg = (e.clientX - rect.left) * scaleX;
      const rel = (xSvg - pad.l) / w;
      const idx = Math.round(
        Math.min(series.length - 1, Math.max(0, rel * (series.length - 1))),
      );
      const value = series[idx];
      if (value == null || !Number.isFinite(value)) {
        setHover(null);
        return;
      }
      setHover({
        index: idx,
        value,
        clientX: e.clientX - rect.left,
        clientY: e.clientY - rect.top,
      });
    },
    [geometry, series, width, w, pad.l],
  );

  if (!geometry) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-snow/10 text-sm text-snow/40"
        style={{ height }}
      >
        Sin datos
      </div>
    );
  }

  const { min, max, toX, toY } = geometry;
  const mainPts: Point[] = [];
  series.forEach((v, i) => {
    if (v != null && Number.isFinite(v)) mainPts.push({ x: toX(i), y: toY(v) });
  });

  const fmt = yFormat ?? ((n: number) => n.toFixed(0));
  const hoverX = hover ? toX(hover.index) : 0;
  const hoverY = hover ? toY(hover.value) : 0;
  const tipLeft = hover
    ? Math.min(Math.max(hover.clientX + 12, 8), rectSafeWidth(width) - 140)
    : 0;
  const tipTop = hover ? Math.max(hover.clientY - 48, 8) : 0;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full cursor-crosshair rounded-xl border border-snow/10 bg-slate/20"
        role="img"
        onMouseMove={onMove}
        onMouseLeave={() => setHover(null)}
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

        {hover && (
          <>
            <line
              x1={hoverX}
              y1={pad.t}
              x2={hoverX}
              y2={height - pad.b}
              stroke="#EEEEEE"
              strokeOpacity={0.28}
            />
            <line
              x1={pad.l}
              y1={hoverY}
              x2={width - pad.r}
              y2={hoverY}
              stroke="#EEEEEE"
              strokeOpacity={0.18}
              strokeDasharray="3 3"
            />
            <circle
              cx={hoverX}
              cy={hoverY}
              r={4.5}
              fill={color}
              stroke="#EEEEEE"
              strokeWidth={1.5}
            />
          </>
        )}

        {/* Zona de captura más fácil */}
        <rect
          x={pad.l}
          y={pad.t}
          width={w}
          height={h}
          fill="transparent"
        />
      </svg>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-snow/15 bg-ink/95 px-2.5 py-1.5 shadow-lg backdrop-blur-sm"
          style={{ left: tipLeft, top: tipTop }}
        >
          <p className="text-[10px] uppercase tracking-wide text-snow/40">
            {valueLabel}
          </p>
          <p className="font-mono text-sm font-semibold text-snow">
            {fmt(hover.value)}
          </p>
          {labels?.[hover.index] && (
            <p className="mt-0.5 text-[10px] text-snow/45">
              {labels[hover.index]}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function rectSafeWidth(viewWidth: number) {
  // Usado solo como tope relativo; el tip se posiciona en coords del contenedor
  return Math.max(viewWidth * 0.55, 200);
}
