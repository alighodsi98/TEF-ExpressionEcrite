"use client";

import { useState } from "react";
import { WritingStage } from "./writing-stage";
import { useApp } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { useDraft } from "@/hooks/use-draft";
import { readSubmitStream } from "@/lib/submit-stream";
import type { CorrectionData } from "./correction-display";

interface PracticeResultData {
  sessionId: string;
  corrections: {
    realistic: { A: CorrectionData; B: CorrectionData };
  };
}

export function PracticeSectionBView() {
  const { toast } = useToast();
  const setView = useApp((s) => s.setView);
  const topic = useApp((s) => s.practiceSectionB);
  const text = useApp((s) => s.practiceTextB);
  const setText = useApp((s) => s.setPracticeText);
  const setDuration = useApp((s) => s.setPracticeDuration);
  const setPracticeResult = useApp((s) => s.setPracticeResult);
  const setPracticeSessionId = useApp((s) => s.setPracticeSessionId);
  const setLoadingProgress = useApp((s) => s.setLoadingProgress);
  const sectionA = useApp((s) => s.practiceSectionA);
  const textA = useApp((s) => s.practiceTextA);
  const durA = useApp((s) => s.practiceDurationA);
  const durB = useApp((s) => s.practiceDurationB);
  const resetPractice = useApp((s) => s.resetPractice);
  const [submitting, setSubmitting] = useState(false);

  const { clearDraft } = useDraft("practice-b", text, (v) => setText("B", v));

  if (!topic) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">Sujet non chargé.</p>
        <button onClick={() => setView("practice-intro")} className="mt-3 text-primary underline">Retour</button>
      </div>
    );
  }

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setView("practice-loading");

    const doneSteps: string[] = [];

    try {
      for await (const event of readSubmitStream("/api/exercise/submit", {
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
          clearDraft();
          setLoadingProgress(null);
          setPracticeResult(event.data);
          setPracticeSessionId(event.data.sessionId as string);
          setView("practice-results");
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
      setView("practice-section-b");
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
      onCancel={() => { clearDraft(); resetPractice(); setView("dashboard"); }}
      submitLabel={submitting ? "Correction…" : "Valider et corriger"}
      submitLoading={submitting}
      heading="Section B — Lettre au rédacteur"
      instructions={[
        "Lettre formelle en 4-5 paragraphes : introduction, trois arguments (avec exemple/étude), conclusion.",
        "Utilisez un vocabulaire riche, des structures avancées et des connecteurs logiques.",
        "Minimum 200 mots. Temps : 35 minutes.",
      ]}
    />
  );
}

export type { PracticeResultData };
