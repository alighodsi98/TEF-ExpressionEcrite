"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trophy, Home, RotateCcw, FileText } from "lucide-react";
import { useApp } from "@/lib/store";
import { CorrectionDisplay, type CorrectionData } from "./correction-display";

interface PlacementResultData {
  sessionId: string;
  placement: {
    levelSectionA: string;
    levelSectionB: string;
    levelOverallNclc: string;
    levelOverallCecr: string;
    summarySectionA: string;
    summarySectionB: string;
    sectionACorrection: CorrectionData;
    sectionBCorrection: CorrectionData;
  };
  corrections: {
    realistic: { A: CorrectionData; B: CorrectionData };
  };
}

export function PlacementResultsView() {
  const setView = useApp((s) => s.setView);
  const resetPlacement = useApp((s) => s.resetPlacement);
  const result = useApp((s) => s.placementResult) as PlacementResultData | null;
  const topicA = useApp((s) => s.placementSectionA?.topic);
  const topicB = useApp((s) => s.placementSectionB?.topic);

  if (!result) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">Aucun résultat disponible.</p>
        <Button onClick={() => setView("dashboard")} className="mt-3">Retour au tableau de bord</Button>
      </div>
    );
  }

  const p = result.placement;
  const corrections = result.corrections.realistic;

  return (
    <div className="tef-fade-up mx-auto max-w-4xl space-y-4 pb-6">
      {/* Hero card — tightened */}
      <Card className="overflow-hidden border-primary/20">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm shadow-primary/25">
              <Trophy className="h-5 w-5" />
            </span>
            <div className="flex-1">
              <h2 className="text-base font-bold tracking-tight sm:text-lg">Résultat de votre positionnement</h2>
              <p className="text-xs text-muted-foreground">
                Niveau global d&apos;après les deux sections
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <LevelCard label="NCLC global" value={p.levelOverallNclc} highlight />
            <LevelCard label="CECR global" value={p.levelOverallCecr} highlight />
            <LevelCard label="Section A" value={p.levelSectionA} />
            <LevelCard label="Section B" value={p.levelSectionB} />
          </div>
        </div>
      </Card>

      {/* Summaries — compact */}
      <div className="grid gap-2 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">A</Badge>
              Résumé — Fait divers
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-xs leading-relaxed text-muted-foreground">{p.summarySectionA}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1 pt-3">
            <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
              <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">B</Badge>
              Résumé — Lettre
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <p className="text-xs leading-relaxed text-muted-foreground">{p.summarySectionB}</p>
          </CardContent>
        </Card>
      </div>

      {/* Corrections */}
      <div className="space-y-1">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Correction section A — Fait divers
        </h3>
        <CorrectionDisplay correction={corrections.A} originalText="" section="A" topic={topicA} />
      </div>

      <div className="space-y-1">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Correction section B — Lettre
        </h3>
        <CorrectionDisplay correction={corrections.B} originalText="" section="B" topic={topicB} />
      </div>

      {/* Actions */}
      <div className="flex flex-wrap justify-center gap-2 border-t border-border/40 pt-4">
        <Button onClick={() => setView("dashboard")} size="sm" className="gap-1.5">
          <Home className="h-3.5 w-3.5" /> Tableau de bord
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => { resetPlacement(); setView("practice-intro"); }}
        >
          <RotateCcw className="h-3.5 w-3.5" /> Exercice libre
        </Button>
      </div>
    </div>
  );
}

function LevelCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
      highlight ? "border-primary/25 bg-background shadow-sm shadow-primary/5" : "border-border/60 bg-muted/20"
    }`}>
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className={`text-xl font-bold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}
