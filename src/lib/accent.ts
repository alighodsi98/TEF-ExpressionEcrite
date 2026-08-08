"use client";

// Accent color definitions — each accent has a light + dark primary value.
// The app reads these CSS variables, so swapping them re-themes everything.

export type AccentKey = "emerald" | "blue" | "violet" | "rose" | "amber";

export const ACCENTS: Record<
  AccentKey,
  { label: string; light: string; dark: string; swatch: string }
> = {
  emerald: {
    label: "Émeraude",
    light: "oklch(0.52 0.13 165)",
    dark: "oklch(0.70 0.15 165)",
    swatch: "oklch(0.52 0.13 165)",
  },
  blue: {
    label: "Bleu",
    light: "oklch(0.55 0.15 250)",
    dark: "oklch(0.72 0.15 250)",
    swatch: "oklch(0.55 0.15 250)",
  },
  violet: {
    label: "Violet",
    light: "oklch(0.55 0.20 290)",
    dark: "oklch(0.72 0.20 290)",
    swatch: "oklch(0.55 0.20 290)",
  },
  rose: {
    label: "Rose",
    light: "oklch(0.58 0.20 15)",
    dark: "oklch(0.72 0.20 15)",
    swatch: "oklch(0.58 0.20 15)",
  },
  amber: {
    label: "Ambre",
    light: "oklch(0.65 0.16 75)",
    dark: "oklch(0.78 0.15 75)",
    swatch: "oklch(0.65 0.16 75)",
  },
};

export const ACCENT_KEYS = Object.keys(ACCENTS) as AccentKey[];

export function isAccentKey(v: string): v is AccentKey {
  return v in ACCENTS;
}

// Apply an accent to the document root. `dark` tells us which palette to use.
export function applyAccent(key: AccentKey, dark: boolean) {
  const a = ACCENTS[key];
  if (!a) return;
  const root = document.documentElement;
  root.style.setProperty("--primary", dark ? a.dark : a.light);
  root.style.setProperty("--ring", dark ? a.dark : a.light);
  root.style.setProperty("--sidebar-primary", dark ? a.dark : a.light);
  root.style.setProperty("--chart-1", dark ? a.dark : a.light);
}