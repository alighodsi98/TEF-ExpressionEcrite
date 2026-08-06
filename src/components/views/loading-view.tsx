"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Wand2, AlertTriangle } from "lucide-react";
import { useApp, type LoadingProgress } from "@/lib/store";
import { Button } from "@/components/ui/button";

const FALLBACK_STEPS = [
  "Correction section A — Réaliste",
  "Correction section B — Réaliste",
  "Calcul des notes",
];

const LOADING_TIMEOUT_SEC = 600; // 10 minutes max

export function LoadingView({ title = "Correction en cours…", onCancel }: { title?: string; onCancel?: () => void }) {
  const progress = useApp((s) => s.loadingProgress);
  const setLoadingProgress = useApp((s) => s.setLoadingProgress);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const steps = progress?.doneSteps ?? [];
  const current = progress?.current;
  const total = progress?.total ?? 3;
  const completed = progress?.completed ?? 0;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const timedOut = elapsed >= LOADING_TIMEOUT_SEC;

  return (
    <div className="tef-fade-up mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center gap-6 py-10">
      <div className="relative tef-scale-in">
        <span className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Wand2 className="h-10 w-10" />
        </span>
        {timedOut ? (
          <AlertTriangle className="absolute -bottom-1 -left-1 h-7 w-7 text-destructive" />
        ) : completed < total ? (
          <Loader2 className="absolute -bottom-1 -left-1 h-7 w-7 animate-spin text-primary" />
        ) : (
          <CheckCircle2 className="absolute -bottom-1 -left-1 h-7 w-7 text-green-500" />
        )}
      </div>

      <div className="text-center">
        <h3 className="text-xl font-bold tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">
          {timedOut
            ? "La correction prend plus de temps que prévu. Veuillez patienter ou réessayer."
            : completed >= total
              ? "Dernières touches…"
              : `${completed}/${total} analyses terminées — ${pct}%`}
        </p>
        <p className="mt-1 font-mono text-xs tabular-nums text-muted-foreground/50">
          {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")}
        </p>
      </div>

      <div className="w-full space-y-1.5">
        {/* Show completed steps with checkmarks */}
        {steps.map((label, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl bg-green-500/5 px-3 py-2 text-sm dark:bg-green-500/10"
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
            <span className="text-foreground">{label}</span>
          </div>
        ))}

        {/* Show current step with spinner */}
        {current && completed < total && (
          <div className="flex items-center gap-3 rounded-xl bg-primary/[0.04] px-3 py-2 text-sm">
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
            <span className="text-muted-foreground">{current}</span>
          </div>
        )}

        {/* Placeholder for remaining steps */}
        {!progress &&
          FALLBACK_STEPS.map((label, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary/30" />
              <span className="text-muted-foreground/60">{label}</span>
            </div>
          ))}

        {/* Progress bar */}
        {progress && (
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      {onCancel && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setLoadingProgress(null); onCancel(); }}
          className="mt-2"
        >
          Annuler et réessayer
        </Button>
      )}
    </div>
  );
}
