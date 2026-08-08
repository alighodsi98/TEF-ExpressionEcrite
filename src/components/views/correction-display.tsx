"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  AlertCircle, Wand2, Sparkles, FileText, Gauge, Tags, MessageSquare,
  ChevronDown, CheckCircle2, XCircle, Lightbulb, BookOpen, Copy, Check, BookPlus,
  Globe, Languages, Volume2, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { buildDictionaryUrl, buildGoogleTranslateUrl } from "@/lib/dictionary";
import { speakFrench } from "@/lib/speech";
import { RichTextEditor } from "@/components/rich-text-editor";

export interface CorrectionData {
  level1Errors: { type: string; original: string; correction: string; explanation: string; tags?: string[] }[];
  level2Suggestions: { original: string; suggestion: string; reason: string }[];
  level3Advanced: { original: string; improved: string; explanation: string }[];
  level4Rewrite: string;
  scores: Record<string, number>;
  nclcLevel: string;
  cecrLevel: string;
  globalScore: number;
  feedback: string;
}

interface Props {
  correction: CorrectionData;
  originalText: string;
  section?: "A" | "B";
  topic?: string;
}

const SCORE_LABELS: Record<string, string> = {
  adequation: "Adéquation à la consigne",
  coherence: "Cohérence et cohésion",
  vocabulary: "Maîtrise du vocabulaire",
  grammar: "Maîtrise de la grammaire",
};

const SCORE_KEYS = Object.keys(SCORE_LABELS);

const ERROR_TYPE_LABELS: Record<string, string> = {
  spelling: "Orthographe",
  conjugation: "Conjugaison",
  agreement: "Accord",
  punctuation: "Ponctuation",
  article: "Article",
  preposition: "Préposition",
  other: "Autre",
};

const ERROR_TYPE_COLORS: Record<string, string> = {
  spelling: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800",
  conjugation: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800",
  agreement: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800",
  punctuation: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800",
  article: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800",
  preposition: "bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950 dark:text-pink-300 dark:border-pink-800",
  other: "bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-950 dark:text-gray-300 dark:border-gray-800",
};

const ERROR_TYPE_DOT: Record<string, string> = {
  spelling: "bg-red-500",
  conjugation: "bg-orange-500",
  agreement: "bg-yellow-500",
  punctuation: "bg-blue-500",
  article: "bg-purple-500",
  preposition: "bg-pink-500",
  other: "bg-gray-500",
};

function levelColor(nclc: string): string {
  const n = parseInt(nclc, 10) || 0;
  if (n >= 9) return "text-emerald-600";
  if (n >= 7) return "text-primary";
  if (n >= 5) return "text-amber-600";
  if (n >= 3) return "text-orange-600";
  return "text-destructive";
}

function levelBg(nclc: string): string {
  const n = parseInt(nclc, 10) || 0;
  if (n >= 9) return "bg-emerald-600";
  if (n >= 7) return "bg-primary";
  if (n >= 5) return "bg-amber-600";
  if (n >= 3) return "bg-orange-600";
  return "bg-destructive";
}

function scoreColor(v: number): string {
  if (v >= 36) return "text-emerald-600";
  if (v >= 27) return "text-primary";
  if (v >= 18) return "text-amber-600";
  return "text-destructive";
}

function HighlightedText({ text, errors }: { text: string; errors: CorrectionData["level1Errors"] }) {
  const segments = useMemo(() => {
    if (!text || errors.length === 0) return [{ text, error: null as null }];

    const sorted = [...errors]
      .map((e, i) => ({ ...e, index: i }))
      .filter((e) => text.toLowerCase().includes(e.original.toLowerCase()));

    const found: { start: number; end: number; error: typeof sorted[0] }[] = [];
    for (const e of sorted) {
      const idx = text.toLowerCase().indexOf(e.original.toLowerCase(), 0);
      if (idx !== -1) {
        const overlap = found.some((f) => idx < f.end && idx + e.original.length > f.start);
        if (!overlap) found.push({ start: idx, end: idx + e.original.length, error: e });
      }
    }
    found.sort((a, b) => a.start - b.start);

    const result: { text: string; error: typeof sorted[0] | null }[] = [];
    let cursor = 0;
    for (const f of found) {
      if (cursor < f.start) result.push({ text: text.slice(cursor, f.start), error: null });
      result.push({ text: text.slice(f.start, f.end), error: f.error });
      cursor = f.end;
    }
    if (cursor < text.length) result.push({ text: text.slice(cursor), error: null });
    return result;
  }, [text, errors]);

  return (
    <p className="whitespace-pre-wrap text-sm leading-relaxed" dir="ltr">
      {segments.map((seg, i) =>
        seg.error ? (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <span className="cursor-help rounded bg-red-100 px-0.5 text-red-700 line-through dark:bg-red-950 dark:text-red-300">
                {seg.text}
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-xs">
              <p className="font-medium">→ {seg.error.correction}</p>
              <p className="text-primary-foreground/80 mt-0.5">{seg.error.explanation}</p>
            </TooltipContent>
          </Tooltip>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  );
}

export function CorrectionDisplay({ correction, originalText, section, topic }: Props) {
  const c = correction;
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [glossarySection, setGlossarySection] = useState<"A" | "B">(section || "A");
  const [glossaryContext, setGlossaryContext] = useState("");
  const [glossarySaving, setGlossarySaving] = useState(false);
  const [floatingBtnPos, setFloatingBtnPos] = useState<{ x: number; y: number } | null>(null);
  const selectedTextRef = useRef("");
  const [dialogPhrase, setDialogPhrase] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const selectionRect = (): DOMRect | null => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.toString().trim() || !contentRef.current?.contains(sel.anchorNode)) return null;
      return sel.getRangeAt(0).getBoundingClientRect();
    };

    const updateFromRect = () => {
      const rect = selectionRect();
      if (!rect) {
        setFloatingBtnPos(null);
        selectedTextRef.current = "";
        return;
      }
      selectedTextRef.current = window.getSelection()!.toString().trim();
      setFloatingBtnPos({ x: rect.left + rect.width / 2, y: rect.top - 48 });
    };

    const hideToolbar = (target: Node) => {
      const btn = document.getElementById("floating-toolbar");
      if (btn?.contains(target)) return;
      setFloatingBtnPos(null);
      selectedTextRef.current = "";
    };

    const handleMouseUp = (e: MouseEvent) => {
      const toolbar = document.getElementById("floating-toolbar");
      if (toolbar?.contains(e.target as Node)) return;
      updateFromRect();
    };
    const handleMouseDown = (e: MouseEvent) => hideToolbar(e.target as Node);
    const handleKeyUp = updateFromRect;

    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const handleFloatBtnMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDialogPhrase(selectedTextRef.current);
    window.getSelection()?.removeAllRanges();
    setFloatingBtnPos(null);
    setGlossaryOpen(true);
  }, []);

  const handleAddToGlossary = async () => {
    const phrase = dialogPhrase;
    setGlossarySaving(true);
    try {
      const res = await fetch("/api/glossary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: glossarySection,
          phrase,
          context: glossaryContext || null,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      toast({ title: "Ajouté", description: "Entrée ajoutée au glossaire." });
      setGlossaryOpen(false);
      setGlossaryContext("");
      setDialogPhrase("");
      selectedTextRef.current = "";
      setFloatingBtnPos(null);
      window.getSelection()?.removeAllRanges();
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter au glossaire.", variant: "destructive" });
    } finally {
      setGlossarySaving(false);
    }
  };

  const groupedErrors = useMemo(() => {
    const groups: Record<string, typeof c.level1Errors> = {};
    for (const e of c.level1Errors) {
      if (!groups[e.type]) groups[e.type] = [];
      groups[e.type].push(e);
    }
    return Object.entries(groups);
  }, [c.level1Errors]);

  const handleCopyRewrite = async () => {
    await navigator.clipboard.writeText(c.level4Rewrite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const avgScore = useMemo(() => {
    const vals = Object.values(c.scores);
    return vals.length ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : "—";
  }, [c.scores]);

  return (
    <div
      ref={contentRef}
      className="space-y-4 select-text"
    >
      <Card className="overflow-hidden border-primary/15">
        <CardContent className="p-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white", levelBg(c.nclcLevel))}>
                {c.nclcLevel}
              </span>
              <div className="flex flex-col leading-none">
                <span className="text-[10px] font-medium text-muted-foreground">NCLC</span>
                <span className="text-xs font-semibold">{c.cecrLevel}</span>
              </div>
            </div>

            <div className="h-6 w-px bg-border/60" />

            <div className="flex items-baseline gap-1">
              <span className="text-lg font-bold tabular-nums">{Math.round(c.globalScore)}</span>
              <span className="text-xs text-muted-foreground">/ 699</span>
            </div>

            <div className="h-6 w-px bg-border/60" />

            <div className="flex items-baseline gap-1">
              <span className="text-xs text-muted-foreground">Moy.</span>
              <span className={cn("text-sm font-bold tabular-nums", scoreColor(parseFloat(avgScore)))}>{avgScore}</span>
              <span className="text-[10px] text-muted-foreground">/45</span>
            </div>

            {c.level1Errors.length > 0 && (
              <>
                <div className="h-6 w-px bg-border/60" />
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-3 w-3 text-destructive" />
                  <span className="text-xs font-medium">{c.level1Errors.length} erreur{c.level1Errors.length > 1 ? "s" : ""}</span>
                </div>
              </>
            )}

            <div className="flex-1" />

            {section && <Badge variant="secondary" className="text-[10px]">Section {section}</Badge>}
            {topic && <span className="text-[11px] text-muted-foreground truncate max-w-[200px]" dir="ltr">{topic}</span>}
          </div>

          {c.feedback && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-primary/[0.04] px-2.5 py-1.5">
              <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
              <p className="text-xs leading-relaxed text-muted-foreground" dir="ltr">{c.feedback}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 10 TEF criteria — compact 2-col */}
      <Card>
        <CardHeader className="pb-2 pt-3">
          <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
            <Gauge className="h-3.5 w-3.5 text-primary" />
            Critères officiels TEF
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-5 gap-y-1.5 pb-3 sm:grid-cols-2">
          {SCORE_KEYS.map((k) => {
            const v = c.scores[k] ?? 0;
            return (
              <div key={k} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">{SCORE_LABELS[k]}</span>
                <span className={cn("text-xs font-semibold tabular-nums", scoreColor(v))}>{v.toFixed(1)}</span>
                <Progress value={(v / 45) * 100} className="h-1 w-16 shrink-0" />
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Errors — grouped by type with inline text + table */}
      {c.level1Errors.length > 0 && (
        <Card className="border-destructive/15">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
              <AlertCircle className="h-3.5 w-3.5 text-destructive" />
              Erreurs identifiées ({c.level1Errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-3">
            {originalText && (
              <div className="rounded-lg border border-border/40 bg-muted/20 p-2.5">
                <HighlightedText text={originalText} errors={c.level1Errors} />
              </div>
            )}

            <Accordion type="multiple" className="w-full">
              {groupedErrors.map(([type, errors]) => (
                <AccordionItem key={type} value={type} className="border-border/40">
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", ERROR_TYPE_DOT[type] || ERROR_TYPE_DOT.other)} />
                      <span className="text-xs font-medium">{ERROR_TYPE_LABELS[type] || type}</span>
                      <Badge variant="outline" className="h-4 px-1.5 text-[10px]">{errors.length}</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="h-7 w-8 text-[10px]">#</TableHead>
                          <TableHead className="h-7 text-[10px]">Original</TableHead>
                          <TableHead className="h-7 text-[10px]">Correction</TableHead>
                          <TableHead className="h-7 hidden text-[10px] sm:table-cell">Explication</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {errors.map((e, i) => (
                          <TableRow key={i}>
                            <TableCell className="py-1.5 text-[11px] font-medium text-muted-foreground">{i + 1}</TableCell>
                            <TableCell className="py-1.5" dir="ltr">
                              <span className="rounded bg-red-50 px-1 text-xs font-medium text-red-700 line-through dark:bg-red-950 dark:text-red-300">
                                {e.original}
                              </span>
                            </TableCell>
                            <TableCell className="py-1.5" dir="ltr">
                              <span className="rounded bg-green-50 px-1 text-xs font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
                                {e.correction}
                              </span>
                            </TableCell>
                            <TableCell className="hidden py-1.5 sm:table-cell">
                              <span className="text-[11px] text-muted-foreground line-clamp-2">{e.explanation}</span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Suggestions & Advanced — accordion sections */}
      {(c.level2Suggestions.length > 0 || c.level3Advanced.length > 0) && (
        <Card>
          <CardContent className="p-3">
            <Accordion type="multiple" className="w-full">
              {c.level2Suggestions.length > 0 && (
                <AccordionItem value="suggestions" className="border-border/40">
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Tags className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">Suggestions ({c.level2Suggestions.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1.5">
                      {c.level2Suggestions.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg border border-border/40 p-2">
                          <Lightbulb className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                          <div className="min-w-0 flex-1" dir="ltr">
                            <div className="flex flex-wrap items-center gap-1 text-xs">
                              <span className="rounded bg-muted px-1 text-muted-foreground line-through">{s.original}</span>
                              <span className="text-primary">→</span>
                              <span className="rounded bg-primary/10 px-1 font-medium text-primary">{s.suggestion}</span>
                            </div>
                            <p className="mt-0.5 text-[11px] text-muted-foreground">{s.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}

              {c.level3Advanced.length > 0 && (
                <AccordionItem value="advanced" className="border-border/40">
                  <AccordionTrigger className="py-2 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-medium">Améliorations avancées ({c.level3Advanced.length})</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-1.5">
                      {c.level3Advanced.map((a, i) => (
                        <div key={i} className="rounded-lg border border-border/40 p-2">
                          <div className="space-y-0.5 text-xs" dir="ltr">
                            <p className="text-muted-foreground line-through">{a.original}</p>
                            <p className="font-medium text-foreground">{a.improved}</p>
                          </div>
                          <p className="mt-1 text-[11px] text-primary">{a.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Rewrite — side-by-side with scroll + copy */}
      {c.level4Rewrite && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-2 pt-3">
            <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Réécriture niveau C1
              <div className="flex-1" />
              <Button variant="ghost" size="sm" className="h-6 gap-1 text-[10px]" onClick={handleCopyRewrite}>
                {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                {copied ? "Copié" : "Copier"}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div className="overflow-hidden rounded-lg border border-border/40 bg-muted/20 p-2.5">
                <p className="mb-1 text-[10px] font-semibold text-muted-foreground">VOTRE TEXTE</p>
                <ScrollArea className="h-48 md:h-64">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground" dir="ltr">{originalText}</p>
                </ScrollArea>
              </div>
              <div className="overflow-hidden rounded-lg border border-primary/20 bg-primary/[0.03] p-2.5 select-text">
                <p className="mb-1 text-[10px] font-semibold text-primary">VERSION C1</p>
                <div className="h-48 md:h-64 overflow-auto">
                  <p className="whitespace-pre-wrap text-xs leading-relaxed" dir="ltr">{c.level4Rewrite}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {typeof window !== "undefined" && floatingBtnPos && createPortal(
        <div
          id="floating-toolbar"
          className="fixed z-[9999] flex items-center gap-1 rounded-full bg-background shadow-xl border border-border/60 px-1.5 py-1"
          style={{ left: floatingBtnPos.x, top: floatingBtnPos.y, transform: "translateX(-50%)" }}
        >
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 rounded-full text-[11px] px-2.5 hover:bg-primary/10 hover:text-primary"
            onMouseDown={handleFloatBtnMouseDown}
            title="Ajouter au glossaire"
          >
            <BookPlus className="h-3 w-3" /> Glossaire
          </Button>
          <div className="h-4 w-px bg-border/40" />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 rounded-full text-[11px] px-2.5 hover:bg-primary/10 hover:text-primary"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); window.open(buildGoogleTranslateUrl(selectedTextRef.current), "translate", "width=800,height=700,menubar=0,toolbar=0,location=1,status=0,scrollbars=1"); }}
            title="Traduire avec Google Traduction"
          >
            <Languages className="h-3 w-3" /> Google
          </Button>
          <div className="h-4 w-px bg-border/40" />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 rounded-full text-[11px] px-2.5 hover:bg-primary/10 hover:text-primary"
            onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); window.open(buildDictionaryUrl(selectedTextRef.current), "dictionary", "width=800,height=700,menubar=0,toolbar=0,location=1,status=0,scrollbars=1"); }}
            title="Chercher dans le dictionnaire dic.b-amooz"
          >
            <Globe className="h-3 w-3" /> dic.b-amooz
          </Button>
          <div className="h-4 w-px bg-border/40" />
          <Button
            size="sm"
            variant="ghost"
            className="h-7 gap-1 rounded-full text-[11px] px-2.5 hover:bg-primary/10 hover:text-primary"
            onMouseDown={(e) => {
              e.preventDefault(); e.stopPropagation();
              speakFrench(selectedTextRef.current);
            }}
            title="Écouter la sélection"
          >
            <Volume2 className="h-3 w-3" /> Écouter
          </Button>
        </div>,
        document.body
      )}

      {/* Add to glossary dialog */}
      <Dialog open={glossaryOpen} onOpenChange={setGlossaryOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ajouter au glossaire</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Section</Label>
              <Select value={glossarySection} onValueChange={(v) => setGlossarySection(v as "A" | "B")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Section A — Fait divers</SelectItem>
                  <SelectItem value="B">Section B — Argumentation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Phrase / Expression</Label>
              <RichTextEditor
                value={dialogPhrase}
                onChange={setDialogPhrase}
                placeholder="Ex. : Il convient de souligner que..."
                resetKey={glossaryOpen ? "open" : "closed"}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>Note contextuelle (optionnelle)</Label>
              <Input
                placeholder="Ex. : expression utile pour la rédaction..."
                value={glossaryContext}
                onChange={(e) => setGlossaryContext(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGlossaryOpen(false)}>Annuler</Button>
            <Button onClick={handleAddToGlossary} disabled={glossarySaving} className="gap-2">
              {glossarySaving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
