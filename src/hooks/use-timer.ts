"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface UseTimerOptions {
  durationSec: number;
  onExpire?: () => void;
  autoStart?: boolean;
}

// Countdown timer hook with pause/resume and elapsed tracking.
export function useTimer({ durationSec, onExpire, autoStart = true }: UseTimerOptions) {
  const [remaining, setRemaining] = useState(durationSec);
  const [running, setRunning] = useState(autoStart);
  const expiredRef = useRef(false);
  const onExpireRef = useRef(onExpire);

  // Keep the latest onExpire in a ref without touching it during render.
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    if (!running) return;
    if (remaining <= 0) {
      if (!expiredRef.current) {
        expiredRef.current = true;
        onExpireRef.current?.();
      }
      return;
    }
    const id = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(id);
          if (!expiredRef.current) {
            expiredRef.current = true;
            onExpireRef.current?.();
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, remaining]);

  const pause = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => setRunning(true), []);
  const reset = useCallback((newDuration?: number) => {
    expiredRef.current = false;
    setRemaining(newDuration ?? durationSec);
    setRunning(autoStart);
  }, [durationSec, autoStart]);

  const elapsed = durationSec - remaining;
  const progress = durationSec > 0 ? (elapsed / durationSec) * 100 : 0;

  return {
    remaining,
    elapsed,
    progress,
    running,
    pause,
    resume,
    reset,
    isLow: remaining <= 60,
    isCritical: remaining <= 30,
  };
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}
