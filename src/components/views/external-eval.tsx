"use client";

import { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Keyboard, FileText, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/lib/store";
import { readSubmitStream } from "@/lib/submit-stream";
import { AccentKeyboard } from "@/components/accent-keyboard";

const MIN_WORDS: Record<string, number> = { A: 80, B: 200 };

export function ExternalEvalView() {
  const { toast } = useToast();
  const setView = useApp((s) => s.setView);
  const setExternalResult = useApp((s) => s.setExternalResult);
  const setLoadingProgress = useApp((s) => s.setLoadingProgress);

  const [section, setSection] = useState<"A" | "B">("A");
  const [topic, setTopic] = useState("");
  const [userText, setUserText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const wordCount = useMemo(() => {
    const t = userText.trim();
    if (!t) return 0;
    return t.split(/\s+/).filter(Boolean).length;
  }, [userText]);

  const minWords = MIN_WORDS[section];
  const meetsMin = wordCount >= minWords;

  const insertChar = (char: string) => {
    const ta = textareaRef.current;
    if (!ta) { setUserText(userText + char); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = userText.slice(0, start) + char + userText.slice(end);
    setUserText(next);
    requestAnimationFrame(() => {
      ta.setSelectionRange(start + char.length, start + char.length);
    });
  };

  const handleSubmit = async () => {
    if (!topic.trim()) {
      toast({ title: "Sujet requis", description: "Veuillez entrer le sujet de votre texte.", variant: "destructive" });
      return;
    }
    if (!userText.trim()) {
      toast({ title: "Texte requis", description: "Veuillez coller ou écrire votre texte.", variant: "destructive" });
      return;
    }
    if (!meetsMin) {
      toast({ title: "Nombre de mots insuffisant", description: `Minimum ${minWords} mots requis. Vous en avez ${wordCount}.`, variant: "destructive" });
      return;
    }

    setSubmitting(true);
    setView("external-loading");

    const doneSteps: string[] = [];

    try {
      for await (const event of readSubmitStream("/api/external-evaluate", {
        section,
        topic,
        userText,
        durationSec: 0,
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
          setExternalResult(event.data);
          setView("external-results");
          return;
        } else if (event.type === "error") {
          throw new Error(event.message);
        }
      }
    } catch (e) {
      setLoadingProgress(null);
      toast({
        title: "Erreur d'évaluation",
        description: e instanceof Error ? e.message : "Veuillez réessayer.",
        variant: "destructive",
      });
      setView("external-eval");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="tef-fade-up mx-auto max-w-4xl space-y-5">
      <div className="text-center">
        <Badge variant="secondary" className="mb-2">Évaluation externe</Badge>
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Évaluer un texte écrit à l&apos;extérieur</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Collez votre texte et recevez la même correction IA que dans les exercices de pratique.
        </p>
      </div>

      {/* Section selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Type de texte</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant={section === "A" ? "default" : "outline"}
              onClick={() => setSection("A")}
              className="flex-1 gap-2"
            >
              <FileText className="h-4 w-4" />
              Section A — Fait divers
            </Button>
            <Button
              variant={section === "B" ? "default" : "outline"}
              onClick={() => setSection("B")}
              className="flex-1 gap-2"
            >
              <FileText className="h-4 w-4" />
              Section B — Lettre
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Topic and metadata */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            <Label htmlFor="topic">Sujet / Consigne</Label>
            <Input
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder={section === "A"
                ? "Ex: Un incendie a éclaté dans un immeuble du centre-ville…"
                : "Ex: Lettre au rédacteur concernant l'interdiction des voitures en centre-ville"}
            />
          </div>

        </CardContent>
      </Card>

      {/* Accent keyboard */}
      <div>
        <button
          type="button"
          onClick={() => setShowKeyboard((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <Keyboard className="h-3.5 w-3.5" />
          {showKeyboard ? "Masquer le clavier" : "Clavier à accents"}
        </button>
        {showKeyboard && (
          <AccentKeyboard onInsert={insertChar} className="mt-2" />
        )}
      </div>

      {/* Text input */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold">Votre texte (en français)</CardTitle>
            <div className="flex items-center gap-2 text-xs">
              <span className={meetsMin ? "text-primary font-medium" : "text-muted-foreground"}>
                {wordCount} / {minWords} mots
              </span>
              {meetsMin ? (
                <span className="text-primary">✓</span>
              ) : (
                <span className="text-destructive/80 text-[11px]">Min. {minWords}</span>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Textarea
            ref={textareaRef}
            dir="ltr"
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            placeholder="Collez ou écrivez votre texte ici…"
            className="min-h-[320px] resize-y font-french text-base leading-relaxed"
            spellCheck={false}
          />

          <div className="mt-3 flex items-center justify-end">
            <Button onClick={handleSubmit} disabled={submitting} size="lg" className="gap-2 tef-glow shadow-sm">
              {submitting ? "Évaluation…" : "Évaluer mon texte"}
              {!submitting && <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
