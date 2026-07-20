"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function Select({
  value,
  onChange,
  options,
  disabled,
  className = "",
  placeholder = "Seleccionar",
  "aria-label": ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => {
          if (!disabled) setOpen((v) => !v);
        }}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-snow/15 bg-ink px-3 py-2 text-left text-sm text-snow outline-none transition hover:border-snow/25 focus:ring-2 focus:ring-pulse disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className={`truncate ${selected ? "text-snow" : "text-snow/40"}`}>
          {selected?.label ?? placeholder}
        </span>
        <span
          className={`shrink-0 text-[9px] text-snow/45 transition ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          ▼
        </span>
      </button>

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-50 mt-1.5 max-h-60 w-full overflow-auto rounded-xl border border-snow/15 bg-[#1c1c1e]/95 py-1 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl"
        >
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={active}>
                <button
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => {
                    if (opt.disabled) return;
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-3 py-2 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? "bg-pulse/15 font-medium text-pulse"
                      : "text-snow/80 hover:bg-snow/5 hover:text-snow"
                  }`}
                >
                  {opt.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
