"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ToastTone = "success" | "error";

type ToastItem = {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
};

type ToastContextValue = {
  toast: (opts: {
    tone: ToastTone;
    title: string;
    message?: string;
  }) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (opts: { tone: ToastTone; title: string; message?: string }) => {
      const id = ++toastId;
      setItems((prev) => [...prev, { id, ...opts }]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed top-4 right-4 z-[100] flex w-[min(100vw-2rem,22rem)] flex-col gap-2"
      >
        {items.map((item) => (
          <MacToast
            key={item.id}
            item={item}
            onClose={() => dismiss(item.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return ctx;
}

function MacToast({
  item,
  onClose,
}: {
  item: ToastItem;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const enter = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(enter);
  }, []);

  const isSuccess = item.tone === "success";

  return (
    <div
      role="status"
      className={`pointer-events-auto overflow-hidden rounded-2xl border shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl transition-all duration-300 ease-out ${
        visible
          ? "translate-x-0 opacity-100"
          : "translate-x-6 opacity-0"
      } ${
        isSuccess
          ? "border-emerald-400/25 bg-[#1c1c1e]/92"
          : "border-red-400/30 bg-[#1c1c1e]/92"
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3.5">
        <span
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
            isSuccess
              ? "bg-emerald-500/20 text-emerald-300"
              : "bg-red-500/20 text-red-300"
          }`}
          aria-hidden
        >
          {isSuccess ? "✓" : "!"}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-semibold text-snow">{item.title}</p>
          {item.message && (
            <p className="mt-0.5 text-xs leading-relaxed text-snow/55">
              {item.message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md px-1.5 py-0.5 text-sm text-snow/35 transition hover:bg-snow/10 hover:text-snow/70"
          aria-label="Cerrar"
        >
          ×
        </button>
      </div>
    </div>
  );
}
