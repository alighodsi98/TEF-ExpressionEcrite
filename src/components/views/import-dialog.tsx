"use client";

import { useState, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Upload, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "topics" | "glossary";
  section?: string;
  onImported: (count: number) => void;
}

interface ParsedEntry {
  line: number;
  valid: boolean;
  reason?: string;
  data?: Record<string, string>;
}

function parseTopics(text: string, section: string): ParsedEntry[] {
  return text.split("\n").map((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return { line: i + 1, valid: false };

    const parts = line.split("|").map((s) => s.trim());
    const topic = parts[0];
    if (!topic) return { line: i + 1, valid: false, reason: "Sujet manquant" };

    const entry: Record<string, string> = { topic };
    if (parts.length >= 2) {
      if (section === "A") entry.starterSentence = parts[1];
      else entry.context = parts[1];
    }
    if (parts.length >= 3) entry.category = parts[2];

    return { line: i + 1, valid: true, data: entry };
  });
}

function parseCSVLine(line: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

function parseGlossary(text: string, defaultSection: string): ParsedEntry[] {
  let lastSection = defaultSection;

  return text.split("\n").map((raw, i) => {
    const line = raw.trim().replace(/^\uFEFF/, "");
    if (!line || line.startsWith("#")) return { line: i + 1, valid: false };

    // Format 1: Export TXT — [Section A] phrase — contexte
    const txtMatch = line.match(/^\[Section\s+([AB])\]\s*(.*)$/);
    if (txtMatch) {
      const [, section, rest] = txtMatch;
      const sep = rest.indexOf(" — ");
      let phrase = rest;
      let context = "";
      if (sep !== -1) {
        phrase = rest.slice(0, sep);
        context = rest.slice(sep + 3);
      }
      phrase = phrase.trim();
      context = context.trim();
      lastSection = section;
      return {
        line: i + 1,
        valid: true,
        data: { section, phrase, ...(context ? { context } : {}) },
      };
    }

    // Format 2: Export CSV — section,phrase,context,createdAt
    if (line.includes(",") && !line.includes("|")) {
      const parts = parseCSVLine(line).map((s) => s.trim());
      // En-tête de l'export CSV
      if (parts[0]?.toLowerCase() === "section" && parts[1]?.toLowerCase() === "phrase") {
        return { line: i + 1, valid: false };
      }
      let [section, phrase, context] = parts;
      if (!["A", "B"].includes(section)) {
        // CSV simple sans section : phrase,contexte
        section = lastSection;
        phrase = parts[0];
        context = parts[1];
      }
      if (!phrase) return { line: i + 1, valid: false, reason: "Phrase manquante" };
      lastSection = section;
      return {
        line: i + 1,
        valid: true,
        data: { section, phrase, ...(context ? { context } : {}) },
      };
    }

    // Format 3: Saisie manuelle — section | phrase | contexte
    const parts = line.split("|").map((s) => s.trim());
    let section = lastSection;
    let phrase: string | undefined;
    let context: string | undefined;

    if (parts.length >= 2 && ["A", "B"].includes(parts[0])) {
      section = parts[0];
      phrase = parts[1];
      context = parts[2];
    } else {
      phrase = parts[0];
      context = parts[1];
    }

    if (!phrase) return { line: i + 1, valid: false, reason: "Phrase manquante" };
    lastSection = section;

    return {
      line: i + 1,
      valid: true,
      data: { section, phrase, ...(context ? { context } : {}) },
    };
  });
}

export function ImportDialog({ open, onOpenChange, mode, section = "A", onImported }: ImportDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rawText, setRawText] = useState("");
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const parsed = useMemo(
    () =>
      rawText.trim()
        ? mode === "topics"
          ? parseTopics(rawText, section)
          : parseGlossary(rawText, section)
        : [],
    [rawText, mode, section]
  );

  const valid = parsed.filter((p) => p.valid);
  const invalid = parsed.filter((p) => !p.valid);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setRawText(reader.result as string);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (valid.length === 0) return;
    setImporting(true);
    try {
      const body =
        mode === "topics"
          ? { section, topics: valid.map((p) => p.data) }
          : { entries: valid.map((p) => p.data) };
      const url = mode === "topics" ? "/api/topics/batch" : "/api/glossary/batch";
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur d'import");
      toast({
        title: "Import réussi",
        description: `${data.count} élément${data.count > 1 ? "s" : ""} importé${data.count > 1 ? "s" : ""}.${data.skipped ? ` ${data.skipped} ignoré(s).` : ""}`,
      });
      onImported(data.count);
      setRawText("");
      setFileName("");
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Erreur d'import",
        description: e instanceof Error ? e.message : "Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setRawText(""); setFileName(""); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {mode === "topics" ? "Importer des sujets en lot" : "Importer des entrées du glossaire en lot"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto max-h-[55vh]">
          <div
            className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border/60 p-6 transition-colors hover:border-primary/40"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm font-medium">
              {fileName ? fileName : "Cliquez pour choisir un fichier .txt ou .csv"}
            </p>
            <p className="text-xs text-muted-foreground">ou collez le contenu ci-dessous</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.csv"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="import-text">Contenu à importer</Label>
            <Textarea
              id="import-text"
              placeholder={
                mode === "topics"
                  ? `Sujet simple\nSujet avec phrase | Phrase de départ\nSujet complet | Phrase | catégorie`
                  : `A | Expression utile | Note\nB | Il convient de souligner que\nA | Phrase seule\n\nFichiers exportés (.csv / .txt) acceptés également`
              }
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={10}
              className="font-mono text-xs"
              dir="ltr"
            />
          </div>

          {parsed.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {valid.length} valide{(valid.length > 1 ? "s" : "")}
              </Badge>
              {invalid.length > 0 && (
                <Badge variant="outline" className="gap-1 text-muted-foreground">
                  <AlertCircle className="h-3 w-3" />
                  {invalid.length} ignorée{(invalid.length > 1 ? "s" : "")}
                </Badge>
              )}
              {mode === "topics" && (
                <span className="text-xs text-muted-foreground">
                  Section {section === "A" ? "A — Fait divers" : "B — Lettre"}
                </span>
              )}
            </div>
          )}

          {valid.length > 0 && (
            <div className="max-h-24 overflow-y-auto rounded-lg border border-border/40 bg-muted/20 p-2">
              <p className="mb-1 text-xs font-medium text-muted-foreground">Aperçu :</p>
              {valid.slice(0, 5).map((p) => (
                <p key={p.line} className="truncate text-xs" dir="ltr">
                  <span className="text-muted-foreground">L{p.line}</span> {p.data?.topic || p.data?.phrase}
                </p>
              ))}
              {valid.length > 5 && (
                <p className="text-xs text-muted-foreground">… et {valid.length - 5} autre(s)</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { setRawText(""); setFileName(""); onOpenChange(false); }}>
            Annuler
          </Button>
          <Button
            onClick={handleImport}
            disabled={valid.length === 0 || importing}
            className="gap-2"
          >
            {importing && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
            {importing ? "Import..." : `Importer ${valid.length > 0 ? `(${valid.length})` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
