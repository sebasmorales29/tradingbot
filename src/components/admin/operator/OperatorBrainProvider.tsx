"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type OperatorBrainPayload = {
  brain: {
    isActive: boolean;
    displayName: string;
    modelVersion: string;
    lastTrainedAt: string | null;
    trainSampleWins: number;
    trainSampleLosses: number;
    notes: string | null;
    updatedAt: string;
    lastResearchAt: string | null;
    researchItemsCount: number;
    autoResearchEnabled: boolean;
  };
  model: {
    version: string;
    trainedAt: string;
    minScoreDefault: number;
  };
  knowledge: Array<{
    id: string;
    kind: string;
    title: string;
    content: string;
    effect: Record<string, unknown>;
    source?: string;
    createdAt: string;
  }>;
  calibration: Array<{
    regime: string;
    tradesCount: number;
    winRate: number | null;
  }>;
  chat: Array<{
    id: string;
    role: string;
    content: string;
    created_at: string;
  }>;
  tests: Array<{
    id: string;
    role: string;
    content: string;
    image_data: string | null;
    promoted_knowledge_id: string | null;
    created_at: string;
  }>;
  researchRuns: Array<{
    id: string;
    started_at: string;
    finished_at: string | null;
    sources_ok: number;
    sources_failed: number;
    items_seen: number;
    items_learned: number;
    summary: string | null;
    triggered_by: string;
  }>;
};

type Ctx = {
  data: OperatorBrainPayload | null;
  loading: boolean;
  error: string | null;
  busy: boolean;
  setBusy: (v: boolean) => void;
  reload: () => Promise<void>;
  post: (body: Record<string, unknown>) => Promise<Record<string, unknown>>;
};

const OperatorBrainContext = createContext<Ctx | null>(null);

export function OperatorBrainProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [data, setData] = useState<OperatorBrainPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/operator");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Error");
      setData(json as OperatorBrainPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const post = useCallback(
    async (body: Record<string, unknown>) => {
      setBusy(true);
      try {
        const res = await fetch("/api/admin/operator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json()) as Record<string, unknown>;
        if (!res.ok) {
          throw new Error(String(json.error ?? "Error"));
        }
        await reload();
        return json;
      } finally {
        setBusy(false);
      }
    },
    [reload],
  );

  const value = useMemo(
    () => ({ data, loading, error, busy, setBusy, reload, post }),
    [data, loading, error, busy, reload, post],
  );

  return (
    <OperatorBrainContext.Provider value={value}>
      {children}
    </OperatorBrainContext.Provider>
  );
}

export function useOperatorBrain() {
  const ctx = useContext(OperatorBrainContext);
  if (!ctx) {
    throw new Error("useOperatorBrain must be used within OperatorBrainProvider");
  }
  return ctx;
}
