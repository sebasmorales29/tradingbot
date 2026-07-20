"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";

/**
 * Texto del idioma activo. Sin reservar espacio del otro idioma
 * (evita huecos vacíos en contenedores).
 */
export function T({
  path,
  as: Tag = "span",
  className = "",
}: {
  path: string;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
  className?: string;
}) {
  const { t } = useLanguage();
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, t);

  if (typeof value !== "string") {
    return <Tag className={className}>{path}</Tag>;
  }

  return <Tag className={className}>{value}</Tag>;
}

export function useT() {
  return useLanguage().t;
}
