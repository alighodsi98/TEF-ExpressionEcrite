"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Trash2, BookOpen, Plus, Filter, Search, Pencil, Download, Upload,
  Volume2, RotateCcw, Ear, ListChecks, Keyboard,
  CheckCircle2, XCircle, Zap,
} from "lucide-react";
import { AccentKeyboard } from "@/components/accent-keyboard";
import { useApp } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { ImportDialog } from "./import-dialog";
import { FloatingToolbar } from "./floating-toolbar";
import { RichTextEditor, MarkdownContent } from "@/components/rich-text-editor";
import { diffWords, stripMarkdown, type WordDiff } from "@/lib/diff";
import { findFrVoice, onFrVoiceChange, hasSpeechSupport } from "@/lib/speech";

interface GlossaryEntry {
  id: string;
  section: string;
  phrase: string;
  context: string | null;
  createdAt: string;
  reviewBox: number;
  reviewCount: number;
  lastReviewedAt: string | null;
  nextReviewAt: string | null;
}

type Rating = "again" | "good" | "easy";

function isDue(entry: GlossaryEntry): boolean {
  if (!entry.nextReviewAt) return true;
  return new Date(entry.nextReviewAt).getTime() <= Date.now();
}

export function GlossaryView() {
  const setView = useApp((s) => s.setView);
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [filterSection, setFilterSection] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addSection, setAddSection] = useState<"A" | "B">("A");
  const [addPhrase, setAddPhrase] = useState("");
  const [addContext, setAddContext] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Review mode state
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewAll, setReviewAll] = useState(false);
  const [queue, setQueue] = useState<GlossaryEntry[]>([]);
  const [index, setIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [checked, setChecked] = useState(false);
  const [diff, setDiff] = useState<WordDiff | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(() => hasSpeechSupport() && !!findFrVoice());
  const [slow, setSlow] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [ratings, setRatings] = useState<{ again: number; good: number; easy: number }>({ again: 0, good: 0, easy: 0 });
  const [sessionDone, setSessionDone] = useState(false);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const requeueCountRef = useRef<Map<string, number>>(new Map());

  const insertChar = (char: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setUserAnswer((v) => v + char);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    setUserAnswer((v) => v.slice(0, start) + char + v.slice(end));
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + char.length, start + char.length);
    });
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const url = new URL("/api/glossary", window.location.origin);
      if (filterSection !== "all") url.searchParams.set("section", filterSection);
      const res = await fetch(url.toString());
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [filterSection]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    return () => {
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    };
  }, []);

  // Track French voice availability (list loads asynchronously in some
  // environments, e.g. Electron portable build). Re-checks on voiceschanged.
  useEffect(() => {
    return onFrVoiceChange((has) => setVoiceAvailable(has));
  }, []);

  // Autoplay audio when a new card appears (default on)
  useEffect(() => {
    if (!reviewMode || sessionDone || queue.length === 0) return;
    if (!autoPlay) return;
    if (!voiceAvailable) return;
    const t = setTimeout(() => { void playCurrent(); }, 350);
    return () => clearTimeout(t);
  }, [index, reviewMode, sessionDone, queue.length, autoPlay, voiceAvailable]);

  // Focus the answer box on each new card so the flow stays keyboard-only
  useEffect(() => {
    if (!reviewMode || sessionDone || checked || queue.length === 0) return;
    const t = setTimeout(() => textareaRef.current?.focus(), 120);
    return () => clearTimeout(t);
  }, [index, reviewMode, sessionDone, checked, queue.length]);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/glossary/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Supprimé", description: "Entrée retirée du glossaire." });
      await load();
    } catch {
      toast({ title: "Erreur", description: "Échec de la suppression.", variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  }

  function openEditDialog(entry: GlossaryEntry) {
    // Save scroll position before opening dialog
    setScrollPosition(window.scrollY);
    setEditingId(entry.id);
    setAddSection(entry.section as "A" | "B");
    setAddPhrase(entry.phrase);
    setAddContext(entry.context || "");
    setAddOpen(true);
  }

  async function handleSave() {
    if (!addPhrase.trim()) {
      toast({ title: "Erreur", description: "La phrase est requise.", variant: "destructive" });
      return;
    }
    setAddSaving(true);
    try {
      const isEdit = !!editingId;
      const url = isEdit ? `/api/glossary/${encodeURIComponent(editingId)}` : "/api/glossary";
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: addSection,
          phrase: addPhrase.trim(),
          context: addContext.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: isEdit ? "Modifié" : "Ajouté", description: isEdit ? "Entrée mise à jour." : "Entrée ajoutée au glossaire." });
      setAddOpen(false);
      setEditingId(null);
      setAddPhrase("");
      setAddContext("");
      await load();
      // If we edited an entry currently in the review queue, update it in place
      if (isEdit && reviewMode) {
        setQueue((prev) =>
          prev.map((e) =>
            e.id === editingId
              ? { ...e, section: addSection, phrase: addPhrase.trim(), context: addContext.trim() || null }
              : e
          )
        );
      }
      // Restore scroll position after dialog closes and data reloads
      if (isEdit) {
        setTimeout(() => window.scrollTo(0, scrollPosition), 0);
      }
    } catch {
      toast({ title: "Erreur", description: "Échec de l'enregistrement.", variant: "destructive" });
    } finally {
      setAddSaving(false);
    }
  }

  async function handleExport(format: "csv" | "txt") {
    try {
      const res = await fetch(`/api/glossary/export?format=${format}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `glossaire.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Exporté", description: `Glossaire exporté en ${format.toUpperCase()}.` });
    } catch {
      toast({ title: "Erreur", description: "Échec de l'export.", variant: "destructive" });
    }
  }

  const filtered = useMemo(() => {
    let result = filterSection === "all" ? entries : entries.filter((e) => e.section === filterSection);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((e) =>
        e.phrase.toLowerCase().includes(q) || (e.context?.toLowerCase() || "").includes(q)
      );
    }
    return result;
  }, [entries, filterSection, searchQuery]);

  const dueCount = useMemo(() => entries.filter(isDue).length, [entries]);

  // ---------------------------------------------------------------------
  // Review session
  // ---------------------------------------------------------------------

  async function startReview(all: boolean) {
    setReviewMode(true);
    setReviewAll(all);
    setSessionDone(false);
    setRatings({ again: 0, good: 0, easy: 0 });
    setIndex(0);
    setChecked(false);
    setDiff(null);
    setUserAnswer("");
    requeueCountRef.current.clear();
    try {
      const url = new URL("/api/glossary", window.location.origin);
      if (!all) url.searchParams.set("due", "1");
      const res = await fetch(url.toString());
      const data = await res.json();
      const q = (data.entries || []) as GlossaryEntry[];
      setQueue(q);
    } catch {
      toast({ title: "Erreur", description: "Impossible de charger les entrées.", variant: "destructive" });
    }
  }

  function speakBrowser(text: string) {
    if (!text) return;
    if (!hasSpeechSupport()) {
      toast({ title: "Audio indisponible", description: "La synthèse vocale n'est pas disponible dans cet environnement.", variant: "destructive" });
      return;
    }
    speechSynthesis.cancel();
    setAudioPlaying(true);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "fr-FR";
    u.rate = slow ? 0.75 : 0.85;
    const fr = findFrVoice();
    if (fr) u.voice = fr;
    u.onend = () => setAudioPlaying(false);
    u.onerror = (e) => {
      setAudioPlaying(false);
      // Speech may still be unavailable even when getVoices() is empty.
      if (e.error === "not-allowed" || e.error === "synthesis-unavailable") {
        toast({ title: "Audio indisponible", description: "Impossible de lire l'audio dans cet environnement.", variant: "destructive" });
      }
    };
    speechSynthesis.speak(u);
  }

  function playCurrent() {
    const entry = queue[index];
    if (!entry) return;
    const text = stripMarkdown(entry.phrase);
    if (!text) return;
    if (!hasSpeechSupport()) {
      // No speech possible at all: guide the user to reveal the text instead
      // of silently doing nothing.
      toast({ title: "Audio indisponible", description: "Appuyez sur « Vérifier » avec la zone vide pour réviser cette entrée.", variant: "destructive" });
      return;
    }
    speakBrowser(text);
  }

  function handleCheck() {
    const entry = queue[index];
    if (!entry) return;
    // Always compare — an empty answer is treated as "nothing typed", so the
    // comparison shows the correct phrase + note, just like a typed answer.
    setDiff(diffWords(userAnswer, stripMarkdown(entry.phrase)));
    setChecked(true);
  }

  async function handleRate(rating: Rating) {
    const entry = queue[index];
    setRatingSaving(true);
    try {
      await fetch("/api/glossary/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryId: entry.id, rating }),
      });
    } catch {
      toast({ title: "Erreur", description: "Impossible d'enregistrer la note.", variant: "destructive" });
    } finally {
      setRatingSaving(false);
    }

    setRatings((prev) => ({ ...prev, [rating]: prev[rating] + 1 }));

    const requeued =
      rating === "again" && (requeueCountRef.current.get(entry.id) ?? 0) < 3;
    if (requeued) {
      requeueCountRef.current.set(entry.id, (requeueCountRef.current.get(entry.id) ?? 0) + 1);
      setQueue((prev) => [...prev, entry]);
    }

    setUserAnswer("");
    setChecked(false);
    setDiff(null);
    const newLength = queue.length + (requeued ? 1 : 0);
    if (index + 1 >= newLength) setSessionDone(true);
    else setIndex(index + 1);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!reviewMode || sessionDone || ratingSaving) return;
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "TEXTAREA" || t.tagName === "INPUT" || t.isContentEditable);
      const ratingActive = checked;
      if (ratingActive && !typing && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
        if (e.key === "1") void handleRate("again");
        else if (e.key === "2") void handleRate("good");
        else if (e.key === "3") void handleRate("easy");
      }
      // Replay the voice with Alt+E while the answer is not yet checked
      if (!checked && e.altKey && !e.ctrlKey && !e.metaKey && (e.key === "e" || e.key === "E")) {
        e.preventDefault();
        playCurrent();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [reviewMode, sessionDone, ratingSaving, checked, slow, voiceAvailable, index, queue]);

  function exitReview() {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    setReviewMode(false);
    setSessionDone(false);
    setQueue([]);
    setIndex(0);
    requeueCountRef.current.clear();
    void load();
  }

  const entry = queue[index];
  const progressPct = queue.length > 0 ? (index / queue.length) * 100 : 0;

  function renderRatingButtons() {
    return (
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          className="flex-1 gap-1.5 border-destructive/30 text-destructive hover:text-destructive"
          onClick={() => handleRate("again")}
          disabled={ratingSaving}
        >
          <XCircle className="h-4 w-4" /> Encore <span className="text-xs opacity-60">(1)</span>
        </Button>
        <Button
          variant="default"
          className="flex-1 gap-1.5"
          onClick={() => handleRate("good")}
          disabled={ratingSaving}
        >
          <CheckCircle2 className="h-4 w-4" /> Bon <span className="text-xs opacity-60">(2)</span>
        </Button>
        <Button
          variant="secondary"
          className="flex-1 gap-1.5"
          onClick={() => handleRate("easy")}
          disabled={ratingSaving}
        >
          <Zap className="h-4 w-4" /> Facile <span className="text-xs opacity-60">(3)</span>
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="tef-fade-up mx-auto max-w-3xl space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" /> Glossaire personnel
            </h2>
            <p className="text-sm text-muted-foreground">Mots et expressions sauvegardés depuis les réécritures C1</p>
          </div>
        </div>
      </div>

      {!reviewMode && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/40 p-1">
            <div className="flex h-7 cursor-default items-center gap-1.5 rounded-full bg-background px-3 text-xs font-medium shadow-sm">
              <ListChecks className="h-3.5 w-3.5" /> Consulter
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 rounded-full px-3 text-xs"
              onClick={() => void startReview(false)}
            >
              <Ear className="h-3.5 w-3.5" /> Réviser{dueCount > 0 ? ` (${dueCount})` : ""}
            </Button>
          </div>
          <div className="flex-1" />
          <Button onClick={() => setImportOpen(true)} size="sm" variant="outline" className="gap-1.5">
            <Upload className="h-4 w-4" /> Importer en lot
          </Button>
          <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Ajouter
          </Button>
        </div>
      )}

      {reviewMode ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={exitReview} className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Quitter la révision
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <ListChecks className="h-3.5 w-3.5" />
              {index}/{queue.length}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Progress value={progressPct} className="flex-1" />
            <span className="shrink-0 text-xs text-muted-foreground">
              {reviewAll ? "Toutes les entrées" : "Entrées à réviser"}
            </span>
          </div>

          {sessionDone ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500/70" />
                <h3 className="text-lg font-semibold">Session terminée</h3>
                <p className="text-sm text-muted-foreground">
                  {ratings.again} à revoir · {ratings.good} bonnes · {ratings.easy} faciles
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => startReview(reviewAll)} className="gap-1.5">
                    <RotateCcw className="h-4 w-4" /> Recommencer
                  </Button>
                  <Button variant="outline" onClick={exitReview}>Retour au glossaire</Button>
                </div>
              </CardContent>
            </Card>
          ) : queue.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-500/60" />
                <p className="text-sm font-medium">Aucune entrée à réviser aujourd'hui.</p>
                <p className="text-xs text-muted-foreground">
                  Toutes vos entrées sont à jour. Revenez plus tard ou révisez tout.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => startReview(true)}>Tout réviser</Button>
                  <Button variant="outline" onClick={exitReview}>Retour au glossaire</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="space-y-4 p-5">
                <div className="flex items-center justify-between">
                  <Badge variant={entry.section === "A" ? "secondary" : "outline"}>
                    {entry.section === "A" ? "Section A" : "Section B"}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      Révision n°{entry.reviewCount + 1}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      aria-label="Modifier cette entrée"
                      title="Modifier cette entrée"
                      onClick={() => openEditDialog(entry)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-2">
                  <Button
                    onClick={playCurrent}
                    disabled={audioPlaying || !voiceAvailable}
                    size="lg"
                    className="gap-2"
                    title={voiceAvailable ? undefined : "Aucune voix française n'est disponible dans cet environnement."}
                  >
                    {audioPlaying ? (
                      <Volume2 className="h-4 w-4 animate-pulse" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )}
                    Écouter
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setSlow((s) => !s)}
                    className={slow ? "border-primary/60 text-primary" : ""}
                    disabled={!voiceAvailable}
                    title={voiceAvailable ? undefined : "Aucune voix française n'est disponible dans cet environnement."}
                  >
                    {slow ? "Vitesse normale" : "Ralentir"}
                  </Button>
                  <label className="flex cursor-pointer select-none items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox
                      checked={autoPlay}
                      onCheckedChange={(v) => setAutoPlay(v === true)}
                      aria-label="Lecture automatique"
                    />
                    Lecture auto
                  </label>
                </div>

                <p className="text-center text-xs text-muted-foreground">
                  {voiceAvailable
                    ? "Voix du navigateur (meilleure qualité — les voix naturelles nécessitent Internet)."
                    : "Aucune voix française détectée — appuyez sur « Vérifier » avec la zone vide pour réviser."}
                </p>

                {!checked && (
                  <>
                    <Textarea
                      ref={textareaRef}
                      placeholder="Écrivez ce que vous entendez... (Entrée pour vérifier · Alt+E pour réécouter)"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      disabled={checked}
                      dir="ltr"
                      className="min-h-[80px] text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                          if (!checked) {
                            e.preventDefault();
                            handleCheck();
                            e.currentTarget.blur();
                          }
                        }
                      }}
                    />
                    <div className="flex justify-center gap-2">
                      <Button
                        onClick={handleCheck}
                        size="lg"
                        className="gap-1.5 flex-1"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Vérifier
                      </Button>
                      <Button
                        type="button"
                        variant={showKeyboard ? "secondary" : "outline"}
                        size="lg"
                        onClick={() => setShowKeyboard((v) => !v)}
                        className="gap-1.5"
                        title="Afficher/masquer le clavier des accents"
                      >
                        <Keyboard className="h-4 w-4" />
                        <span className="hidden sm:inline">Accents</span>
                      </Button>
                    </div>
                    {showKeyboard && (
                      <AccentKeyboard
                        onInsert={insertChar}
                        className="tef-slide-down rounded-xl border border-border/60 bg-muted/30 p-2"
                      />
                    )}
                    <p className="text-center text-xs text-muted-foreground">
                      Entrée vide ? « Vérifier » affichera la correction (avec votre note).
                    </p>
                  </>
                )}

                {checked && (
                  <div className="space-y-4">
                    {diff && (
                      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/20 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Comparaison
                          </p>
                          <Badge
                            variant={diff.pct >= 90 ? "default" : diff.pct >= 60 ? "secondary" : "outline"}
                          >
                            {diff.pct}%
                          </Badge>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm leading-relaxed" dir="ltr">
                            {diff.user
                              .filter((s) => s.status !== "missing")
                              .map((s, i) =>
                                s.status === "same" ? (
                                  <span key={i}>{s.text} </span>
                                ) : (
                                  <span key={i} className="rounded bg-destructive/15 px-1 text-destructive line-through">{s.text} </span>
                                )
                              )}
                          </p>
                          <p className="text-sm leading-relaxed" dir="ltr">
                            {diff.correct
                              .filter((s) => s.status !== "wrong")
                              .map((s, i) =>
                                s.status === "same" ? (
                                  <span key={i}>{s.text} </span>
                                ) : (
                                  <span key={i} className="rounded bg-emerald-500/15 px-1 font-medium text-emerald-700">{s.text} </span>
                                )
                              )}
                          </p>
                        </div>
                        {entry.context && (
                          <p className="text-xs text-muted-foreground">
                            <strong>Note :</strong> {entry.context}
                          </p>
                        )}
                      </div>
                    )}

                    {renderRatingButtons()}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <>
          <div className="sticky top-14 z-30 -mx-4 space-y-2 bg-background/95 px-4 py-2 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 sm:top-16">
            <div className="flex flex-wrap items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Button
                variant={filterSection === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterSection("all")}
              >
                Tout
              </Button>
              <Button
                variant={filterSection === "A" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterSection("A")}
              >
                Section A
              </Button>
              <Button
                variant={filterSection === "B" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterSection("B")}
              >
                Section B
              </Button>
              <div className="flex-1" />
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handleExport("csv")}
              >
                <Download className="h-3.5 w-3.5" /> CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => handleExport("txt")}
              >
                <Download className="h-3.5 w-3.5" /> TXT
              </Button>
            </div>

            <div className="relative w-full">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-full pl-8 text-sm"
              />
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <BookOpen className="h-10 w-10 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Aucune entrée dans le glossaire.</p>
                <p className="text-xs text-muted-foreground/60">Ajoutez des expressions depuis les résultats ou manuellement.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((entry) => (
                <Card key={entry.id} className="group transition-all hover:border-primary/15">
                  <CardContent className="p-3 flex items-start gap-3">
                    <div className="mt-0.5 flex shrink-0 flex-col items-center gap-1">
                      <Badge
                        variant={entry.section === "A" ? "secondary" : "outline"}
                      >
                        {entry.section === "A" ? "A" : "B"}
                      </Badge>
                      {isDue(entry) && (
                        <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
                          À réviser
                        </Badge>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <MarkdownContent value={entry.phrase} dir="ltr" />
                      {entry.context && (
                        <p className="mt-1 text-xs text-muted-foreground">{entry.context}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Modifier"
                        onClick={() => openEditDialog(entry)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                        aria-label="Supprimer"
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                      >
                        {deletingId === entry.id ? (
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit entry dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!o) { setEditingId(null); setAddPhrase(""); setAddContext(""); } setAddOpen(o); }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier l'entrée" : "Ajouter au glossaire"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={addSection} onValueChange={(v) => setAddSection(v as "A" | "B")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Section A — Fait divers</SelectItem>
                  <SelectItem value="B">Section B — Lettre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phrase / Expression</Label>
              <RichTextEditor
                value={addPhrase}
                onChange={setAddPhrase}
                placeholder="Ex. : Il convient de souligner que..."
                resetKey={editingId ?? "new"}
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground/70">
                Mettez le texte en <strong>gras</strong>, <em>italique</em>, <del>barré</del>… et écrivez sur plusieurs lignes.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Note contextuelle (optionnelle)</Label>
              <Input
                placeholder="Ex. : expression utile pour la rédaction..."
                value={addContext}
                onChange={(e) => setAddContext(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAddOpen(false); setEditingId(null); setAddPhrase(""); setAddContext(""); }}>Annuler</Button>
            <Button onClick={handleSave} disabled={addSaving} className="gap-2">
              {addSaving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        mode="glossary"
        section={filterSection !== "all" ? filterSection : "A"}
        onImported={() => load()}
      />

      {!reviewMode && <FloatingToolbar containerRef={containerRef} />}
    </div>
  );
}
