"use client";

import { useEffect, useRef, useCallback, useState } from "react";

const DRAFT_PREFIX = "tef-draft-";

export function useDraft(key: string, value: string, setValue: (val: string) => void) {
  const draftKey = DRAFT_PREFIX + key;
  const restored = useRef(false);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved && !value) {
        setValue(saved);
      }
    } catch {
      // localStorage unavailable
    }
  }, []);

  useEffect(() => {
    if (!value) {
      try {
        localStorage.removeItem(draftKey);
      } catch { /* ignore */ }
      setHasDraft(false);
      return;
    }
    setHasDraft(true);
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, value);
      } catch { /* ignore */ }
    }, 1000);
    return () => clearTimeout(timer);
  }, [value, draftKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch { /* ignore */ }
    setHasDraft(false);
  }, [draftKey]);

  return { clearDraft, hasDraft };
}
