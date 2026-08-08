"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useTheme } from "next-themes";
import { applyAccent, isAccentKey, type AccentKey } from "@/lib/accent";

interface AccentContextValue {
  accent: AccentKey;
  setAccent: (key: AccentKey) => void;
}

const AccentContext = createContext<AccentContextValue>({
  accent: "emerald",
  setAccent: () => {},
});

export function useAccent() {
  return useContext(AccentContext);
}

export function AccentProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [accent, setAccentState] = useState<AccentKey>("emerald");

  // Load the saved accent from the server once at startup.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const saved = await loadSavedAccent();
      if (!cancelled) setAccentState(saved);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Apply the accent whenever it changes or the theme (light/dark) changes.
  useEffect(() => {
    applyAccent(accent, resolvedTheme === "dark");
  }, [accent, resolvedTheme]);

  const setAccent = useCallback((key: AccentKey) => {
    setAccentState(key);
  }, []);

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  );
}

// Load the saved accent from the server settings (called once at startup).
export async function loadSavedAccent(): Promise<AccentKey> {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();
    if (data.accentColor && isAccentKey(data.accentColor)) return data.accentColor;
  } catch {
    // ignore
  }
  return "emerald";
}