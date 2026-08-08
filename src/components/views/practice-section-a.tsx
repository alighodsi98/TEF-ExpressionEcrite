"use client";

import { useCallback } from "react";
import { WritingStage } from "./writing-stage";
import { useApp } from "@/lib/store";
import { useDraft } from "@/hooks/use-draft";
import { useToast } from "@/hooks/use-toast";

export function PracticeSectionAView() {
  const { toast } = useToast();
  const setView = useApp((s) => s.setView);
  const topic = useApp((s) => s.practiceSectionA);
  const text = useApp((s) => s.practiceTextA);
  const setText = useApp((s) => s.setPracticeText);
  const setDuration = useApp((s) => s.setPracticeDuration);
  const resetPractice = useApp((s) => s.resetPractice);

  const { clearDraft } = useDraft("practice-a", text, (v) => setText("A", v));

  const handleSubmit = useCallback(() => {
    clearDraft();
    setView("practice-section-b");
  }, [clearDraft, setView]);

  const handleCancel = useCallback(() => {
    clearDraft();
    resetPractice();
    setView("dashboard");
  }, [clearDraft, resetPractice, setView]);

  if (!topic) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">Sujet non chargé.</p>
        <button onClick={() => setView("practice-intro")} className="mt-3 text-primary underline">Retour</button>
      </div>
    );
  }

  return (
    <WritingStage
      section="A"
      topic={topic.topic}
      starterSentence={topic.starterSentence}
      durationSec={25 * 60}
      minWords={80}
      value={text}
      onChange={(t) => setText("A", t)}
      onDurationChange={(s) => setDuration("A", s)}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitLabel="Valider et passer à l'argumentation"
      heading="Section A — Fait divers"
      instructions={[
        "Continuez la phrase d'accroche en rédigeant un article cohérent.",
        "Utilisez les temps du passé, le conditionnel, la voix passive et le discours indirect.",
        "Minimum 80 mots. Temps : 25 minutes.",
      ]}
    />
  );
}
