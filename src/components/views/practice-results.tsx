"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Home, RotateCcw, History } from "lucide-react";
import { useApp } from "@/lib/store";
import { CorrectionDisplay, type CorrectionData } from "./correction-display";
import { SmartMissionsView } from "./smart-missions";
import { cn } from "@/lib/utils";

interface PracticeResultData {
  sessionId: string;
  corrections: {
    realistic: { A: CorrectionData; B: CorrectionData };
  };
}

function nclcBg(nclc: string): string {
  const n = parseInt(nclc, 10) || 0;
  if (n >= 9) return "bg-emerald-600";
  if (n >= 7) return "bg-primary";
  if (n >= 5) return "bg-amber-600";
  if (n >= 3) return "bg-orange-600";
  return "bg-destructive";
}

export function PracticeResultsView() {
  const setView = useApp((s) => s.setView);
  const resetPractice = useApp((s) => s.resetPractice);
  const result = useApp((s) => s.practiceResult) as PracticeResultData | null;
  const textA = useApp((s) => s.practiceTextA);
  const textB = useApp((s) => s.practiceTextB);
  const topicA = useApp((s) => s.practiceSectionA?.topic);
  const topicB = useApp((s) => s.practiceSectionB?.topic);

  if (!result) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">Aucun résultat disponible.</p>
        <Button onClick={() => setView("dashboard")} className="mt-3">Retour au tableau de bord</Button>
      </div>
    );
  }

  const corrections = result.corrections.realistic;

  return (
    <div className="tef-fade-up mx-auto max-w-4xl space-y-4 pb-6">
      {/* Compact header */}
      <Card className="overflow-hidden border-primary/15">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-bold tracking-tight sm:text-lg">Résultat de votre exercice</h2>
            <Badge variant="secondary" className="text-[10px]">Mode réaliste</Badge>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">A</span>
                <span className={cn("flex h-6 items-center rounded px-1.5 text-xs font-bold text-white", nclcBg(corrections.A.nclcLevel))}>
                  {corrections.A.nclcLevel}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted-foreground">B</span>
                <span className={cn("flex h-6 items-center rounded px-1.5 text-xs font-bold text-white", nclcBg(corrections.B.nclcLevel))}>
                  {corrections.B.nclcLevel}
                </span>
              </div>
              <div className="h-4 w-px bg-border/60" />
              <span className="text-xs font-bold tabular-nums">{Math.round((corrections.A.globalScore + corrections.B.globalScore) / 2)}</span>
              <span className="text-[10px] text-muted-foreground">/699</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section A */}
      <div className="space-y-1">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <FileText className="h-3.5 w-3.5 text-primary" /> Section A — Fait divers
        </h3>
        <CorrectionDisplay correction={corrections.A} originalText={textA} section="A" topic={topicA} />
      </div>

      {/* Section B */}
      <div className="space-y-1">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <FileText className="h-3.5 w-3.5 text-primary" /> Section B — Argumentation
        </h3>
        <CorrectionDisplay correction={corrections.B} originalText={textB} section="B" topic={topicB} />
      </div>

      <SmartMissionsView sessionId={result.sessionId} />

      <div className="flex flex-wrap justify-center gap-2 border-t border-border/40 pt-4">
        <Button onClick={() => { resetPractice(); setView("dashboard"); }} size="sm" className="gap-1.5">
          <Home className="h-3.5 w-3.5" /> Tableau de bord
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { resetPractice(); setView("practice-intro"); }}>
          <RotateCcw className="h-3.5 w-3.5" /> Nouvel exercice
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setView("history")}>
          <History className="h-3.5 w-3.5" /> Historique
        </Button>
      </div>
    </div>
  );
}
