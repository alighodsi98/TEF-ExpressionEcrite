"use client";

import { useCallback, useState } from "react";
import { WritingStage } from "./writing-stage";
import { useApp } from "@/lib/store";
import { useDraft } from "@/hooks/use-draft";
import { useToast } from "@/hooks/use-toast";
import { readSubmitStream } from "@/lib/submit-stream";
import type { CorrectionData } from "./correction-display";

interface SinglePracticeResultData {
  sessionId: string;
  section: "A" | "B";
  corrections: {
    realistic: CorrectionData;
  };
}

export function PracticeSingleView() {
  const { toast } = useToast();
  const setView = useApp((s) => s.setView);
  const topic = useApp((s) => s.practiceTopic);
  const setPracticeResult = useApp((s) => s.setPracticeResult);
  const setPracticeSessionId = useApp((s) => s.setPracticeSessionId);
  const setPracticeText = useApp((s) => s.setPracticeText);
  const setLoadingProgress = useApp((s) => s.setLoadingProgress);
  const resetPractice = useApp((s) => s.resetPractice);
  const [text, setText] = useState("");
  const [durationSec, setDurationSec] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const { clearDraft } = useDraft(`practice-single-${topic?.section ?? "A"}`, text, setText);

  const handleCancel = useCallback(() => {
    clearDraft();
    resetPractice();
    setView("topic-bank");
  }, [clearDraft, resetPractice, setView]);

  if (!topic) {
    return (
      <div className="mx-auto max-w-md py-20 text-center">
        <p className="text-muted-foreground">Sujet non chargé.</p>
        <button onClick={() => setView("topic-bank")} className="mt-3 text-primary underline">Retour à la banque de sujets</button>
      </div>
    );
  }

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    setView("practice-single-loading");

    const doneSteps: string[] = [];

    try {
      for await (const event of readSubmitStream("/api/external-evaluate", {
        section: topic.section,
        topic: topic.topic,
        starterSentence: topic.section === "A" ? topic.starterSentence : undefined,
        context: topic.section === "B" ? topic.context : undefined,
        userText: text,
        durationSec,
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
          setPracticeText(topic.section, text);
          setPracticeResult(event.data);
          setPracticeSessionId(event.data.sessionId as string);
          setView("practice-single-results");
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
      setView("practice-single");
    } finally {
      setSubmitting(false);
    }
  };

  const isSectionA = topic.section === "A";

  return (
    <WritingStage
      section={topic.section}
      topic={topic.topic}
      starterSentence={isSectionA ? topic.starterSentence ?? undefined : undefined}
      context={isSectionA ? undefined : topic.context ?? undefined}
      durationSec={isSectionA ? 25 * 60 : 35 * 60}
      minWords={isSectionA ? 80 : 200}
      value={text}
      onChange={setText}
      onDurationChange={setDurationSec}
      onSubmit={submit}
      onCancel={handleCancel}
      submitLabel={submitting ? "Correction…" : "Valider et corriger"}
      submitLoading={submitting}
      heading={isSectionA ? "Section A — Fait divers" : "Section B — Argumentation"}
      instructions={
        isSectionA
          ? [
              "Continuez la phrase d'accroche en rédigeant un article cohérent.",
              "Utilisez les temps du passé, le conditionnel, la voix passive et le discours indirect.",
              "Minimum 80 mots. Temps : 25 minutes.",
            ]
          : [
              "Exprimez et justifiez votre point de vue sur le sujet proposé.",
              "Structurez votre argumentation : introduction, arguments, conclusion.",
              "Minimum 200 mots. Temps : 35 minutes.",
            ]
      }
    />
  );
}