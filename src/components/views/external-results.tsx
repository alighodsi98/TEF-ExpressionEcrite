"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Home, RotateCcw, History } from "lucide-react";
import { useApp } from "@/lib/store";
import { CorrectionDisplay, type CorrectionData } from "./correction-display";

interface ExternalResultData {
  sessionId: string;
  section: "A" | "B";
  corrections: {
    realistic: CorrectionData;
  };
}

export function ExternalResultsView() {
  const setView = useApp((s) => s.setView);
  const result = useApp((s) => s.externalResult) as ExternalResultData | null;
  const externalText = useApp((s) => s.externalText);
  const externalTopic = useApp((s) => s.externalTopic);

  if (!result) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">Aucun résultat disponible.</p>
        <Button onClick={() => setView("dashboard")} className="mt-3">Retour au tableau de bord</Button>
      </div>
    );
  }

  const currentCorrection = result.corrections.realistic;
  const sectionLabel = result.section === "A" ? "Fait divers" : "Lettre";

  return (
    <div className="tef-fade-up mx-auto max-w-4xl space-y-4 pb-6">
      {/* Compact header */}
      <Card className="overflow-hidden border-primary/15">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-bold tracking-tight sm:text-lg">Résultat de l&apos;évaluation</h2>
            <Badge variant="secondary" className="text-[10px]">Section {result.section} — {sectionLabel}</Badge>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-1">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <FileText className="h-3.5 w-3.5 text-primary" />
          Correction section {result.section} — {sectionLabel}
        </h3>
        <CorrectionDisplay
          correction={currentCorrection}
          originalText={externalText}
          section={result.section}
          topic={externalTopic}
        />
      </div>

      <div className="flex flex-wrap justify-center gap-2 border-t border-border/40 pt-4">
        <Button onClick={() => setView("dashboard")} size="sm" className="gap-1.5">
          <Home className="h-3.5 w-3.5" /> Tableau de bord
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setView("external-eval")}>
          <RotateCcw className="h-3.5 w-3.5" /> Nouvelle évaluation
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setView("history")}>
          <History className="h-3.5 w-3.5" /> Historique
        </Button>
      </div>
    </div>
  );
}
