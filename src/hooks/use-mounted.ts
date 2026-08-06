"use client";

import { useSyncExternalStore } from "react";

// Returns false during SSR and the first render, true after hydration on the client.
// Uses useSyncExternalStore to avoid setState-in-effect lint issues and hydration mismatches.
export function useMounted(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}
