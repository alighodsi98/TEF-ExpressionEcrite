"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";
import { useApp } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";

export function PracticeIntroView() {
  const { toast } = useToast();
  const setView = useApp((s) => s.setView);
  const setPracticeTopics = useApp((s) => s.setPracticeTopics);
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    try {
      const res = await fetch("/api/exercise/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (!data.sectionA || !data.sectionB) throw new Error("topics missing");
      setPracticeTopics(data.sectionA, data.sectionB);
      setView("practice-section-a");
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
    <div className="tef-fade-up mx-auto max-w-3xl space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Nouvelle séance d&apos;entraînement</h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Comme lors de l&apos;examen : fait divers (25 min) et argumentation (35 min).
          Après la rédaction, vous recevrez une correction selon le mode <strong>réaliste</strong> (grille officielle TEF Canada).
        </p>
      </div>

      <div className="flex flex-col items-center gap-3">
        <Button onClick={start} disabled={starting} size="lg" className="min-w-64 gap-2 tef-glow shadow-sm">
          <Play className="h-4 w-4" />
          {starting ? "Préparation…" : "Commencer l'exercice"}
        </Button>
        <p className="text-xs text-muted-foreground/60">Temps total : 60 minutes (25 + 35)</p>
      </div>
    </div>
  );
}
