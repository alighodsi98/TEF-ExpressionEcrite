"use client";

import { WritingStage } from "./writing-stage";
import { useApp } from "@/lib/store";

export function PlacementSectionAView() {
  const setView = useApp((s) => s.setView);
  const topic = useApp((s) => s.placementSectionA);
  const text = useApp((s) => s.placementTextA);
  const setText = useApp((s) => s.setPlacementText);
  const setDuration = useApp((s) => s.setPlacementDuration);
  const resetPlacement = useApp((s) => s.resetPlacement);

  if (!topic) {
    // Defensive: if topics missing, send back to intro
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">Sujet non chargé.</p>
        <button onClick={() => setView("placement-intro")} className="mt-3 text-primary underline">
          Retour
        </button>
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
      onSubmit={() => setView("placement-section-b")}
      onCancel={() => { resetPlacement(); setView("dashboard"); }}
      submitLabel="Valider et passer à l'argumentation"
      heading="Section A — Fait divers"
      instructions={[
        "Continuez la phrase d'accroche en rédigeant un article cohérent.",
        "Utilisez les temps du passé (imparfait, passé composé, plus-que-parfait), le conditionnel, la voix passive et le discours indirect.",
        "Minimum 80 mots. Temps : 25 minutes.",
      ]}
    />
  );
}
