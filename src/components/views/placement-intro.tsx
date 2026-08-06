"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Info } from "lucide-react";
import { useApp } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export function PlacementIntroView() {
  const { toast } = useToast();
  const setView = useApp((s) => s.setView);
  const setPlacementTopics = useApp((s) => s.setPlacementTopics);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/placement/start", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.sectionA || !data.sectionB) throw new Error("topics missing");
      setPlacementTopics(data.sectionA, data.sectionB);
      setView("placement-section-a");
    } catch (e) {
      toast({
        title: "Erreur de préparation",
        description: e instanceof Error ? e.message : "Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="tef-fade-up mx-auto max-w-4xl space-y-6">
      <div className="text-center">
        <Badge variant="secondary" className="mb-3">Étape 1 sur 3 — Positionnement</Badge>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Examen de positionnement complet</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Cet examen suit exactement le format du TEF Canada : d&apos;abord la section fait divers
          (25 minutes), puis la lettre au rédacteur en chef (35 minutes). Une fois le temps écoulé
          pour chaque section, il est impossible de revenir en arrière. Votre niveau sera déterminé
          selon les échelles NCLC et CECR.
        </p>
      </div>

      <Card className="border-primary/15 bg-primary/[0.03]">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div className="text-sm leading-relaxed">
            <p className="font-semibold">Correction mode réaliste</p>
            <p className="mt-1 text-muted-foreground">
              Après la rédaction, votre texte sera corrigé selon le mode <strong>réaliste</strong> (grille officielle TEF Canada).
              Cela vous donne une vision précise de votre niveau réel.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col items-center gap-3">
        <Button onClick={start} disabled={starting} size="lg" className="min-w-64 gap-2 tef-glow shadow-sm">
          {starting ? "Préparation des sujets…" : "Commencer le test de positionnement"}
          {!starting && <ArrowRight className="h-4 w-4" />}
        </Button>
        <p className="text-xs text-muted-foreground/60">
          Temps total : 60 minutes (25 + 35)
        </p>
      </div>
    </div>
  );
}
