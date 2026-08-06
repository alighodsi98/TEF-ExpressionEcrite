"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Clock, FileText, ArrowRight, CheckCircle2, Keyboard, X } from "lucide-react";
import { useTimer, formatTime } from "@/hooks/use-timer";
import { useToast } from "@/hooks/use-toast";
import { AccentKeyboard } from "@/components/accent-keyboard";

interface WritingStageProps {
  section: "A" | "B";
  topic: string;
  starterSentence?: string;
  context?: string;
  durationSec: number;
  minWords: number;
  value: string;
  onChange: (text: string) => void;
  onDurationChange: (sec: number) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  submitLoading?: boolean;
  heading?: string;
  instructions?: string[];
}

export function WritingStage(props: WritingStageProps) {
  const {
    section, topic, starterSentence, context,
    durationSec, minWords, value, onChange, onDurationChange,
    onSubmit, onCancel, submitLabel = "Valider et continuer", submitLoading, heading, instructions,
  } = props;

  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [showKeyboard, setShowKeyboard] = useState(true);
  const [showEarlySubmitConfirm, setShowEarlySubmitConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const timer = useTimer({
    durationSec,
    onExpire: () => {
      toast({
        title: "Temps écoulé",
        description: "Votre texte sera soumis automatiquement.",
        variant: "destructive",
      });
      onSubmit();
    },
  });

  useEffect(() => {
    onDurationChange(timer.elapsed);
  }, [timer.elapsed, onDurationChange]);

  const wordCount = useMemo(() => {
    const t = value.trim();
    if (!t) return 0;
    return t.split(/\s+/).filter(Boolean).length;
  }, [value]);

  const meetsMin = wordCount >= minWords;

  const insertChar = (char: string) => {
    const ta = textareaRef.current;
    if (!ta) { onChange(value + char); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = value.slice(0, start) + char + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.setSelectionRange(start + char.length, start + char.length);
    });
  };

  const handleSubmit = () => {
    if (!meetsMin) {
      toast({
        title: "Nombre de mots insuffisant",
        description: `Minimum ${minWords} mots requis. Vous en avez ${wordCount}.`,
        variant: "destructive",
      });
      return;
    }
    if (timer.remaining > 0) {
      setShowEarlySubmitConfirm(true);
      return;
    }
    onSubmit();
  };

  return (
    <div className="tef-fade-up mx-auto max-w-4xl flex flex-col h-full overflow-hidden">
      {/* ── TOP BOX: timer, topic, keyboard, word count ── */}
      <Card className="shrink-0">
        <CardContent className="p-3 space-y-2">
          {/* Row 1: Badge + Timer + Keyboard toggle */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1 shrink-0">
              <FileText className="h-3.5 w-3.5" />
              Section {section === "A" ? "A — Fait divers" : "B — Lettre"}
            </Badge>
            <div className="flex-1" />
            <div
              className={`flex shrink-0 items-center gap-1.5 font-mono text-sm font-bold tabular-nums ${
                timer.isCritical ? "tef-timer-low" : timer.isLow ? "text-destructive" : "text-primary"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              {formatTime(timer.remaining)}
            </div>
            <Button
              type="button"
              variant={showKeyboard ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowKeyboard((v) => !v)}
              className="h-7 shrink-0 gap-1 px-2 text-xs transition-all"
            >
              <Keyboard className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Accents</span>
            </Button>
          </div>

          {/* Row 2: Progress bar */}
          <Progress value={timer.progress} className="h-1" />

          {/* Row 3: Topic + starter sentence — highlighted */}
          <div dir="ltr" className="rounded-lg border-l-4 border-primary bg-primary/[0.06] px-3 py-2 space-y-1">
            <p className="text-base font-medium leading-relaxed text-foreground">{topic}</p>
            {starterSentence && (
              <p className="text-sm italic leading-relaxed text-foreground/70">
                {starterSentence}
              </p>
            )}
          </div>

          {/* Row 4: Word count */}
          <div className="flex items-baseline gap-1.5 text-xs">
            <span className={meetsMin ? "text-primary font-medium" : "text-muted-foreground"}>
              {wordCount} / {minWords} mots
            </span>
            {meetsMin && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
          </div>

          {/* Row 5: Accent keyboard — always occupies space */}
          <div className={`transition-all duration-300 ease-in-out overflow-hidden ${showKeyboard ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"}`}>
            <AccentKeyboard
              onInsert={insertChar}
              className="tef-slide-down rounded-xl border border-border/60 bg-muted/30 p-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── TEXTAREA: clean writing area, fills remaining space ── */}
      <div className="flex-1 min-h-0 mt-3 px-1">
        <textarea
          ref={textareaRef}
          dir="ltr"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Commencez à écrire votre texte en français ici…"
          className="field-sizing-none h-full w-full resize-none overflow-y-auto rounded-lg border border-border/60 bg-background px-4 py-3 font-french text-base leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/50 focus:border-primary/40 focus:ring-1 focus:ring-primary/20"
          spellCheck={false}
        />
      </div>

      {/* ── BOTTOM BOX: action buttons ── */}
      <div className="shrink-0 mt-3 flex items-center justify-between gap-4">
        <p className="max-w-[60%] text-xs text-muted-foreground/50" dir="rtl">
          Une fois le temps écoulé ou après avoir cliqué sur le bouton, il est impossible de revenir à cette section.
        </p>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button
              variant="outline"
              size="lg"
              className="gap-2"
              disabled={submitLoading}
              onClick={() => setShowCancelConfirm(true)}
            >
              <X className="h-4 w-4" />
              Annuler
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={submitLoading} size="lg" className="gap-2 tef-glow shadow-sm">
            {submitLoading ? "Soumission…" : submitLabel}
            {!submitLoading && <ArrowRight className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <AlertDialog open={showEarlySubmitConfirm} onOpenChange={setShowEarlySubmitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Quitter avant la fin du temps ?</AlertDialogTitle>
            <AlertDialogDescription>
              Il vous reste encore <strong>{formatTime(timer.remaining)}</strong>. Si vous validez maintenant, vous ne pourrez plus modifier votre texte. Voulez-vous vraiment continuer ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer à écrire</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowEarlySubmitConfirm(false); onSubmit(); }}>
              Valider maintenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Annuler la rédaction ?</AlertDialogTitle>
            <AlertDialogDescription>
              Votre texte ne sera pas enregistré et vous perdrez votre progression. Voulez-vous vraiment annuler ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuer à écrire</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowCancelConfirm(false); onCancel?.(); }}>
              Annuler la rédaction
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
