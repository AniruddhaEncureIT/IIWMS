"use client";

import { useEffect } from "react";
import { applyBrandScale, DEFAULT_ACCENT } from "@/lib/brand";

const LS_CONFIG_KEY = "iims_general_config";

function readAccentFromStorage(): string {
  try {
    const raw = localStorage.getItem(LS_CONFIG_KEY);
    if (!raw) return DEFAULT_ACCENT;
    return (JSON.parse(raw) as { primaryColor?: string }).primaryColor ?? DEFAULT_ACCENT;
  } catch {
    return DEFAULT_ACCENT;
  }
}

/**
 * Reads the stored accent color on mount and re-applies it whenever
 * iims_general_config changes (including same-tab synthetic StorageEvents
 * dispatched by system-config-view).
 */
export function BrandProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyBrandScale(readAccentFromStorage());

    function onStorage(e: StorageEvent) {
      if (e.key !== LS_CONFIG_KEY) return;
      try {
        const cfg = e.newValue ? (JSON.parse(e.newValue) as { primaryColor?: string }) : null;
        applyBrandScale(cfg?.primaryColor ?? DEFAULT_ACCENT);
      } catch { /* ignore malformed JSON */ }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return <>{children}</>;
}
