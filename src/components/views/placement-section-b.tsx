"use client";

import { useState } from "react";
import { WritingStage } from "./writing-stage";
import { useApp } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { readSubmitStream } from "@/lib/submit-stream";

export function PlacementSectionBView() {
  const { toast } = useToast();
  const setView = useApp((s) => s.setView);
  const topic = useApp((s) => s.placementSectionB);
  const text = useApp((s) => s.placementTextB);
  const setText = useApp((s) => s.setPlacementText);
  const setDuration = useApp((s) => s.setPlacementDuration);
  const setPlacementResult = useApp((s) => s.setPlacementResult);
  const setLoadingProgress = useApp((s) => s.setLoadingProgress);
  const sectionA = useApp((s) => s.placementSectionA);
  const textA = useApp((s) => s.placementTextA);
  const durA = useApp((s) => s.placementDurationA);
  const durB = useApp((s) => s.placementDurationB);
  const resetPlacement = useApp((s) => s.resetPlacement);
  const [submitting, setSubmitting] = useState(false);

  if (!topic) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">Sujet non chargé.</p>
        <button onClick={() => setView("placement-intro")} className="mt-3 text-primary underline">
          Retour
        </button>
      </div>
    );
  }

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setView("placement-loading");

    const doneSteps: string[] = [];

    try {
      for await (const event of readSubmitStream("/api/placement/submit", {
        sectionA: {
          topic: sectionA?.topic,
          starterSentence: sectionA?.starterSentence,
          text: textA,
          durationSec: durA,
        },
        sectionB: {
          topic: topic.topic,
          context: topic.context,
          text,
          durationSec: durB,
        },
      })) {
        if (event.type === "progress") {
          setLoadingProgress({
            total: event.total,
            completed: event.completed,
            current: event.current,
            doneSteps: [...doneSteps],
          });
        } else if (event.type === "done_step") {
          doneSteps.push(event.label);
          setLoadingProgress({
            total: event.total,
            completed: event.completed,
            current: "",
            doneSteps: [...doneSteps],
          });
        } else if (event.type === "done") {
          setLoadingProgress(null);
          setPlacementResult(event.data);
          setView("placement-results");
          return;
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }
    } catch (e) {
      setLoadingProgress(null);
      toast({
        title: "Erreur de correction",
        description: e instanceof Error ? e.message : "Veuillez réessayer.",
        variant: "destructive",
      });
      setView("placement-section-b");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WritingStage
      section="B"
      topic={topic.topic}
      context={topic.context}
      durationSec={35 * 60}
      minWords={200}
      value={text}
      onChange={(t) => setText("B", t)}
      onDurationChange={(s) => setDuration("B", s)}
      onSubmit={submit}
      onCancel={() => { resetPlacement(); setView("dashboard"); }}
      submitLabel={submitting ? "Correction…" : "Valider et corriger"}
      submitLoading={submitting}
      heading="Section B — Argumentation"
      instructions={[
        "Exprimez et justifiez votre point de vue : introduction, arguments (chacun avec exemple/étude/preuve), conclusion.",
        "Utilisez un vocabulaire riche, des structures avancées et des connecteurs logiques.",
        "Minimum 200 mots. Temps : 35 minutes.",
      ]}
    />
  );
}
