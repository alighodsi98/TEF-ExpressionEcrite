"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Clock, Calendar } from "lucide-react";
import { useApp } from "@/lib/store";
import { CorrectionDisplay, type CorrectionData } from "./correction-display";

type RawCorrection = {
  level1Errors: unknown[]; level2Suggestions: unknown[]; level3Advanced: unknown[];
  level4Rewrite: string; scores: Record<string, number>;
  nclcLevel: string; cecrLevel: string; globalScore: number;
  feedback: string;
} | null;

interface SessionDetail {
  id: string; type: string; createdAt: string;
  exercises: Array<{
    id: string; section: string; topic: string;
    starterSentence?: string | null; context?: string | null;
    userText: string; wordCount: number; durationSec: number; submittedAt: string;
    correction: RawCorrection;
    corrections?: Record<string, RawCorrection>;
  }>;
}

function toCorrectionData(c: NonNullable<RawCorrection>): CorrectionData {
  return {
    level1Errors: c.level1Errors as CorrectionData["level1Errors"],
    level2Suggestions: c.level2Suggestions as CorrectionData["level2Suggestions"],
    level3Advanced: c.level3Advanced as CorrectionData["level3Advanced"],
    level4Rewrite: c.level4Rewrite,
    scores: c.scores,
    nclcLevel: c.nclcLevel,
    cecrLevel: c.cecrLevel,
    globalScore: c.globalScore,
    feedback: c.feedback,
  };
}

export function SessionDetailView() {
  const setView = useApp((s) => s.setView);
  const sessionId = useApp((s) => s.detailSessionId);
  const [session, setSession] = useState<SessionDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    fetch(`/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setSession(d.session || null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [sessionId]);

  if (loading) {
    return <div className="mx-auto max-w-4xl space-y-3"><div className="h-32 animate-pulse rounded-xl bg-muted" /><div className="h-64 animate-pulse rounded-xl bg-muted" /></div>;
  }
  if (!session) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">Séance introuvable.</p>
        <Button onClick={() => setView("history")} className="mt-3">Retour</Button>
      </div>
    );
  }

  return (
    <div className="tef-fade-up mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setView("history")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Retour à l&apos;historique
        </Button>
        {session.type === "placement" && (
          <Badge variant="secondary">Positionnement</Badge>
        )}
      </div>

      <Card className="border-primary/15 bg-primary/[0.03]">
        <CardContent className="flex items-center gap-3 p-4">
          <Calendar className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">
              {new Date(session.createdAt).toLocaleDateString("fr-FR", { dateStyle: "full" })}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(session.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="tef-stagger space-y-5">
        {session.exercises.map((ex) => {
          const raw = ex.corrections?.realistic ?? ex.correction;
          if (!raw) return null;
          return (
            <div key={ex.id} className="space-y-2">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <FileText className="h-5 w-5 text-primary" />
                Section {ex.section} — {ex.section === "A" ? "Fait divers" : "Lettre"}
                <span className="flex items-center gap-1 text-xs font-normal text-muted-foreground">
                  <Clock className="h-3 w-3" /> {Math.round(ex.durationSec / 60)} min · {ex.wordCount} mots
                </span>
              </h3>
              <CorrectionDisplay
                correction={toCorrectionData(raw)}
                originalText={ex.userText}
                section={ex.section as "A" | "B"}
                topic={ex.topic}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
