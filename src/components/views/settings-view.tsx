"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/lib/store";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  Save, ArrowLeft, KeyRound, Cpu, Lightbulb, DatabaseBackup, Palette,
  Plus, Pencil, Trash2, Check, Download, Upload, Volume2, Play,
} from "lucide-react";
import { getFrVoices, getPreferredVoiceName, setPreferredVoiceName, speakFrench } from "@/lib/speech";
import { ACCENTS, ACCENT_KEYS, isAccentKey, type AccentKey } from "@/lib/accent";
import { useAccent } from "@/components/accent-provider";

interface AiModel {
  id: string;
  modelId: string;
  name: string;
  category: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  paid: "Payants",
  free: "Gratuits",
  custom: "Personnalisés",
};
const CATEGORY_ORDER = ["paid", "free", "custom"];

export function SettingsView() {
  const setView = useApp((s) => s.setView);
  const { toast } = useToast();
  const { setAccent } = useAccent();

  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [models, setModels] = useState<AiModel[]>([]);
  const [smartMissionsEnabled, setSmartMissionsEnabled] = useState(true);
  const [accentColor, setAccentColor] = useState<AccentKey>("emerald");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // TTS voice preference
  const [frVoices, setFrVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [preferredVoice, setPreferredVoice] = useState<string>("");
  const [testingVoice, setTestingVoice] = useState(false);

  // Backup
  const [backupBusy, setBackupBusy] = useState(false);
  const [pendingBackup, setPendingBackup] = useState<{ file: File; data: Record<string, unknown> } | null>(null);
  const [importMode, setImportMode] = useState<"replace" | "merge">("replace");
  const [importInclude, setImportInclude] = useState<Record<string, boolean>>({
    settings: true,
    glossary: true,
    sessions: true,
    models: true,
    topics: true,
    chats: true,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const IMPORT_CATEGORIES: { key: string; label: string }[] = [
    { key: "settings", label: "Paramètres & profil" },
    { key: "glossary", label: "Glossaire" },
    { key: "sessions", label: "Séances & corrections" },
    { key: "models", label: "Modèles IA" },
    { key: "topics", label: "Banque de sujets" },
    { key: "chats", label: "Conversations IA" },
  ];

  function backupCounts(data: Record<string, unknown>) {
    const d = (data?.data ?? {}) as Record<string, unknown>;
    return {
      settings: d.userProfile ? 1 : 0,
      glossary: Array.isArray(d.glossaryEntries) ? d.glossaryEntries.length : 0,
      sessions: Array.isArray(d.sessions) ? d.sessions.length : 0,
      models: Array.isArray(d.aiModels) ? d.aiModels.length : 0,
      topics: Array.isArray(d.topics) ? d.topics.length : 0,
      chats: Array.isArray(d.chatConversations) ? d.chatConversations.length : 0,
    };
  }

  // Model editor dialog
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AiModel | null>(null);
  const [formName, setFormName] = useState("");
  const [formModelId, setFormModelId] = useState("");
  const [formCategory, setFormCategory] = useState("custom");
  const [formSaving, setFormSaving] = useState(false);

  // Delete confirmation
  const [deleting, setDeleting] = useState<AiModel | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Load current settings + models
  useEffect(() => {
    (async () => {
      try {
        const [settingsRes, modelsRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/models"),
        ]);
        const settings = await settingsRes.json();
        const modelsData = await modelsRes.json();
        setApiKey(settings.aiApiKey || "");
        setBaseUrl(settings.aiBaseUrl || "");
        setModel(settings.aiModel || "google/gemini-2.5-flash");
        setSmartMissionsEnabled(settings.smartMissionsEnabled !== false);
        if (isAccentKey(settings.accentColor)) setAccentColor(settings.accentColor);
        setModels(modelsData.models || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function reloadModels() {
    try {
      const res = await fetch("/api/models");
      const data = await res.json();
      setModels(data.models || []);
    } catch {
      // ignore
    }
  }

  // Load available French TTS voices + the stored preference.
  // Edge loads online (neural) voices — e.g. Vivienne, Rémy — asynchronously,
  // so besides the `voiceschanged` event we also poll until the voice list
  // stops growing, to make sure those online voices appear in the dropdown.
  useEffect(() => {
    let polling: number | undefined;
    let pollTimer: number | undefined;
    let lastCount = -1;
    let stableChecks = 0;

    const refresh = () => {
      setFrVoices(getFrVoices());
      setPreferredVoice(getPreferredVoiceName() ?? "");
    };
    refresh();

    const stopPolling = () => {
      if (polling) window.clearInterval(polling);
      if (pollTimer) window.clearTimeout(pollTimer);
    };

    if (typeof speechSynthesis !== "undefined") {
      speechSynthesis.addEventListener("voiceschanged", refresh);

      polling = window.setInterval(() => {
        const count = getFrVoices().length;
        refresh();
        if (count === lastCount) {
          stableChecks += 1;
          if (stableChecks >= 5) stopPolling();
        } else {
          lastCount = count;
          stableChecks = 0;
        }
      }, 300);

      pollTimer = window.setTimeout(stopPolling, 20000);
    }

    return () => {
      stopPolling();
      if (typeof speechSynthesis !== "undefined") {
        speechSynthesis.removeEventListener("voiceschanged", refresh);
      }
    };
  }, []);

  const DEFAULT_VOICE = "__default__";

  function handleVoiceChange(value: string) {
    const name = value === DEFAULT_VOICE ? "" : value;
    setPreferredVoice(name);
    setPreferredVoiceName(name || null);
  }

  function handleTestVoice() {
    if (testingVoice) return;
    setTestingVoice(true);
    const u = speakFrench("Bonjour, ceci est un test de la voix française.");
    if (!u) {
      setTestingVoice(false);
      toast({ title: "Audio indisponible", description: "La synthèse vocale n'est pas disponible dans cet environnement.", variant: "destructive" });
      return;
    }
    const finish = () => setTestingVoice(false);
    u.onend = finish;
    u.onerror = finish;
  }

  async function handleSave() {
    if (!apiKey.trim() && !baseUrl.trim()) {
      toast({ title: "Erreur", description: "La clé API est requise.", variant: "destructive" });
      return;
    }
    if (!model) {
      toast({ title: "Erreur", description: "Veuillez sélectionner un modèle d'IA.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiApiKey: apiKey.trim(), aiModel: model, aiBaseUrl: baseUrl.trim(), smartMissionsEnabled, accentColor }),
      });
      if (!res.ok) throw new Error("Save failed");
      // Apply the accent immediately so the change is visible without reload.
      setAccent(accentColor);
      toast({ title: "Enregistré", description: "Les paramètres IA ont été enregistrés avec succès." });
    } catch {
      toast({ title: "Erreur", description: "Échec de l'enregistrement des paramètres.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function openAddDialog() {
    setEditing(null);
    setFormName("");
    setFormModelId("");
    setFormCategory("custom");
    setEditorOpen(true);
  }

  function openEditDialog(m: AiModel) {
    setEditing(m);
    setFormName(m.name);
    setFormModelId(m.modelId);
    setFormCategory(m.category);
    setEditorOpen(true);
  }

  async function handleSaveModel() {
    const modelId = formModelId.trim();
    if (!modelId) {
      toast({ title: "Erreur", description: "L'identifiant du modèle est requis.", variant: "destructive" });
      return;
    }
    setFormSaving(true);
    try {
      const res = editing
        ? await fetch("/api/models", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: editing.id, modelId, name: formName.trim(), category: formCategory }),
          })
        : await fetch("/api/models", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modelId, name: formName.trim(), category: formCategory }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec");
      await reloadModels();
      // If we renamed the currently-active model id, keep the selection in sync
      if (editing && editing.modelId === model) setModel(modelId);
      setEditorOpen(false);
      toast({
        title: editing ? "Modèle modifié" : "Modèle ajouté",
        description: `« ${formName.trim() || modelId} » a été enregistré.`,
      });
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec de l'enregistrement du modèle.",
        variant: "destructive",
      });
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDeleteModel() {
    if (!deleting) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/models?id=${encodeURIComponent(deleting.id)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Échec");
      // If we deleted the active model, reset the selection
      if (deleting.modelId === model) setModel("");
      await reloadModels();
      toast({ title: "Modèle supprimé", description: `« ${deleting.name} » a été supprimé.` });
      setDeleting(null);
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec de la suppression du modèle.",
        variant: "destructive",
      });
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleExportBackup() {
    setBackupBusy(true);
    try {
      const res = await fetch("/api/backup/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] || "sauvegarde-tef-canada.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: "Sauvegarde exportée", description: "Toutes vos données ont été exportées en JSON." });
    } catch {
      toast({ title: "Erreur", description: "Échec de l'export de la sauvegarde.", variant: "destructive" });
    } finally {
      setBackupBusy(false);
    }
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".json")) {
      toast({ title: "Erreur", description: "Veuillez choisir un fichier de sauvegarde JSON.", variant: "destructive" });
      return;
    }
    (async () => {
      try {
        const text = await file.text();
        const data = JSON.parse(text) as Record<string, unknown>;
        if (!data || typeof data !== "object" || !data.data || typeof data.data !== "object") {
          throw new Error("invalid");
        }
        setPendingBackup({ file, data });
        setImportMode("replace");
        setImportInclude({ settings: true, glossary: true, sessions: true, models: true, topics: true, chats: true });
      } catch {
        toast({ title: "Erreur", description: "Ce fichier n'est pas une sauvegarde JSON valide.", variant: "destructive" });
      }
    })();
  }

  async function confirmImportBackup() {
    if (!pendingBackup) return;
    const selectedCount = Object.values(importInclude).filter(Boolean).length;
    if (selectedCount === 0) {
      toast({ title: "Erreur", description: "Sélectionnez au moins une catégorie à importer.", variant: "destructive" });
      return;
    }
    setBackupBusy(true);
    try {
      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pendingBackup.data, mode: importMode, include: importInclude }),
      });
      const resp = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resp.error || "Import failed");
      const c = resp.counts || {};
      const summary: string[] = [];
      if (c.settings) summary.push(`${c.settings} profil`);
      if (c.glossaryEntries) summary.push(`${c.glossaryEntries} entrées de glossaire`);
      if (c.sessions) summary.push(`${c.sessions} séances`);
      if (c.aiModels) summary.push(`${c.aiModels} modèles`);
      if (c.topics) summary.push(`${c.topics} sujets`);
      if (c.chatConversations) summary.push(`${c.chatConversations} conversations`);
      toast({
        title: importMode === "replace" ? "Sauvegarde restaurée" : "Sauvegarde ajoutée",
        description: summary.join(" · ") || "Aucune donnée importée.",
      });
      setPendingBackup(null);
      setTimeout(() => window.location.reload(), 1200);
    } catch (e) {
      toast({
        title: "Erreur",
        description: e instanceof Error ? e.message : "Échec de l'import de la sauvegarde.",
        variant: "destructive",
      });
    } finally {
      setBackupBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex h-[40vh] max-w-md items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const grouped = CATEGORY_ORDER
    .map((cat) => ({ cat, items: models.filter((m) => m.category === cat) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="tef-fade-up mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setView("dashboard")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Paramètres de l&apos;IA</h1>
          <p className="text-sm text-muted-foreground">Configuration de la clé API et des modèles</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <KeyRound className="h-4 w-4" />
            Clé API & Fournisseur
          </CardTitle>
          <CardDescription>
            Utilisez{" "}
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              OpenRouter
            </a>{" "}
            ou un point d'accès local compatible OpenAI comme{" "}
            <a
              href="https://9router.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2"
            >
              9router
            </a>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="base-url">Point d&apos;accès (Base URL)</Label>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-6 px-2 text-[11px]"
                  onClick={() => setBaseUrl("http://localhost:20128/v1")}
                >
                  9router
                </Button>
                {baseUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[11px]"
                    onClick={() => setBaseUrl("")}
                  >
                    OpenRouter
                  </Button>
                )}
              </div>
            </div>
            <Input
              id="base-url"
              type="text"
              placeholder="Laisser vide pour OpenRouter — ex. http://localhost:20128/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="font-mono text-sm"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground/70">
              {baseUrl
                ? "Fournisseur personnalisé actif. Ajoutez ci-dessous les modèles fournis par ce point d'accès (ex. cc/claude-sonnet-4.5)."
                : "Vide = OpenRouter par défaut. Renseignez l'URL de 9router pour utiliser un modèle local."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="api-key">Clé API</Label>
            <Input
              id="api-key"
              type="password"
              placeholder={baseUrl ? "Clé du tableau de bord 9router" : "sk-or-v1-..."}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Cpu className="h-4 w-4" />
                Modèles IA
              </CardTitle>
              <CardDescription className="mt-1">
                Choisissez le modèle actif, ou ajoutez, modifiez et supprimez des modèles.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={openAddDialog}>
              <Plus className="h-4 w-4" /> Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {models.length === 0 && (
            <p className="rounded-xl border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground">
              Aucun modèle. Ajoutez-en un pour commencer.
            </p>
          )}

          {grouped.map((group) => (
            <div key={group.cat}>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">
                {CATEGORY_LABELS[group.cat] ?? group.cat}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {group.items.map((pm) => {
                  const active = model === pm.modelId;
                  return (
                    <div
                      key={pm.id}
                      className={`group flex items-center gap-2 rounded-xl border p-3 text-sm transition-all ${
                        active ? "border-primary/30 bg-primary/[0.04] font-medium shadow-sm shadow-primary/5" : "border-border/60 hover:border-primary/20"
                      }`}
                    >
                      <button
                        onClick={() => setModel(pm.modelId)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-right"
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all ${
                            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {active ? <Check className="h-3 w-3" /> : null}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{pm.name}</span>
                          <span className="block truncate font-mono text-[10px] text-muted-foreground" dir="ltr">
                            {pm.modelId}
                          </span>
                        </span>
                      </button>
                      <div className="flex shrink-0 items-center gap-0.5">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label="Modifier"
                          onClick={() => openEditDialog(pm)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label="Supprimer"
                          onClick={() => setDeleting(pm)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="h-4 w-4" />
            Missions de révision
          </CardTitle>
          <CardDescription>
            Proposer des exercices de grammaire ciblés après chaque séance, basés sur vos erreurs réelles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="smart-missions">Activer les suggestions grammaticales</Label>
              <p className="text-xs text-muted-foreground">
                Après chaque correction, des missions ciblées sur vos points faibles vous seront proposées.
              </p>
            </div>
            <Switch
              id="smart-missions"
              checked={smartMissionsEnabled}
              onCheckedChange={setSmartMissionsEnabled}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Volume2 className="h-4 w-4" />
            Voix de synthèse (TTS)
          </CardTitle>
          <CardDescription>
            Choisissez la voix française utilisée pour la lecture à voix haute. Microsoft Edge propose généralement de meilleures voix françaises.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tts-voice">Voix préférée</Label>
            <div className="flex items-center gap-2">
              <Select value={preferredVoice || DEFAULT_VOICE} onValueChange={handleVoiceChange}>
                <SelectTrigger id="tts-voice" className="flex-1">
                  <SelectValue placeholder="Voix par défaut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DEFAULT_VOICE}>Voix par défaut</SelectItem>
                  {frVoices.map((v) => (
                    <SelectItem key={v.name} value={v.name}>
                      {v.name} ({v.lang}){v.localService ? "" : " · en ligne"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-10 w-10 shrink-0"
                onClick={handleTestVoice}
                disabled={testingVoice || frVoices.length === 0}
                aria-label="Tester la voix"
                title="Tester la voix"
              >
                {testingVoice ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/70">
              {frVoices.length === 0
                ? "Aucune voix française détectée dans ce navigateur."
                : "La préférence est enregistrée automatiquement et s'applique à toutes les lectures (corrections, glossaire, sélection de texte)."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Palette className="h-4 w-4" />
            Couleur d&apos;accent
          </CardTitle>
          <CardDescription>
            Choisissez la couleur principale de l&apos;application (boutons, liens, sélections). Enregistrée avec les paramètres.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {ACCENT_KEYS.map((key) => {
              const a = ACCENTS[key];
              const active = accentColor === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAccentColor(key)}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-all",
                    active
                      ? "border-primary/40 bg-primary/10 font-medium"
                      : "border-border/60 hover:border-primary/30"
                  )}
                  aria-pressed={active}
                >
                  <span
                    className="h-4 w-4 rounded-full ring-1 ring-black/10"
                    style={{ backgroundColor: a.swatch }}
                  />
                  {a.label}
                  {active && <Check className="h-3.5 w-3.5" />}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            La couleur s&apos;applique après avoir cliqué sur « Enregistrer ».
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <DatabaseBackup className="h-4 w-4" />
            Sauvegarde et restauration
          </CardTitle>
          <CardDescription>
            Exportez toutes vos données (glossaire, séances, corrections, modèles IA, conversations et paramètres) dans un fichier JSON, ou restaurez-les depuis une sauvegarde.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={handleExportBackup}
              disabled={backupBusy}
            >
              <Download className="h-4 w-4" />
              {backupBusy ? "En cours..." : "Exporter la sauvegarde"}
            </Button>
            <Button
              variant="outline"
              className="gap-1.5"
              onClick={() => fileInputRef.current?.click()}
              disabled={backupBusy}
            >
              <Upload className="h-4 w-4" />
              Importer une sauvegarde
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileSelected}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground/70">
            À l&apos;import, choisissez les catégories à restaurer et le mode : remplacer les données actuelles ou les ajouter.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2 tef-glow shadow-sm">
          <Save className="h-4 w-4" />
          {saving ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      {/* Add / Edit model dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Modifier le modèle" : "Ajouter un modèle"}</DialogTitle>
            <DialogDescription>
              Copiez l'identifiant depuis la{" "}
              <a
                href="https://openrouter.ai/models"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                liste des modèles OpenRouter
              </a>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="model-id">Identifiant du modèle (Model ID)</Label>
              <Input
                id="model-id"
                placeholder="e.g. openai/gpt-4o"
                value={formModelId}
                onChange={(e) => setFormModelId(e.target.value)}
                className="font-mono text-sm"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="model-name">Nom affiché</Label>
              <Input
                id="model-name"
                placeholder="e.g. GPT-4o"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Catégorie</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Payant</SelectItem>
                  <SelectItem value="free">Gratuit</SelectItem>
                  <SelectItem value="custom">Personnalisé</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)} disabled={formSaving}>
              Annuler
            </Button>
            <Button onClick={handleSaveModel} disabled={formSaving} className="gap-2">
              {formSaving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {editing ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import backup dialog */}
      <Dialog open={!!pendingBackup} onOpenChange={(o) => !o && setPendingBackup(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importer la sauvegarde ?</DialogTitle>
            <DialogDescription>
              Fichier « {pendingBackup?.file.name} » — choisissez les données à importer et le mode.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Mode d&apos;import
              </Label>
              <RadioGroup value={importMode} onValueChange={(v) => setImportMode(v as "replace" | "merge")}>
                <div className="flex items-start gap-2 rounded-lg border border-border/60 p-3">
                  <RadioGroupItem value="replace" id="mode-replace" className="mt-0.5" />
                  <label htmlFor="mode-replace" className="flex-1 cursor-pointer">
                    <span className="block text-sm font-medium">Remplacer</span>
                    <span className="block text-xs text-muted-foreground">
                      Les données actuelles des catégories sélectionnées seront effacées puis remplacées par celles du fichier.
                    </span>
                  </label>
                </div>
                <div className="flex items-start gap-2 rounded-lg border border-border/60 p-3">
                  <RadioGroupItem value="merge" id="mode-merge" className="mt-0.5" />
                  <label htmlFor="mode-merge" className="flex-1 cursor-pointer">
                    <span className="block text-sm font-medium">Ajouter</span>
                    <span className="block text-xs text-muted-foreground">
                      Les entrées seront ajoutées à vos données sans rien supprimer (doublons de modèles ignorés).
                    </span>
                  </label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Données à importer
              </Label>
              <div className="grid gap-1.5">
                {IMPORT_CATEGORIES.map((cat) => {
                  const count = backupCounts(pendingBackup?.data ?? {})[cat.key as keyof ReturnType<typeof backupCounts>];
                  const disabled = importMode === "merge" && cat.key === "settings";
                  return (
                    <label
                      key={cat.key}
                      className={cn(
                        "flex cursor-pointer items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2 transition-colors hover:border-primary/25",
                        disabled && "cursor-not-allowed opacity-50 hover:border-border/60"
                      )}
                    >
                      <Checkbox
                        checked={importInclude[cat.key]}
                        disabled={disabled}
                        onCheckedChange={(v) =>
                          setImportInclude((prev) => ({ ...prev, [cat.key]: v === true }))
                        }
                      />
                      <span className="flex-1 text-sm">{cat.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {count > 0 ? `${count} entrée${count > 1 ? "s" : ""}` : "aucune"}
                      </span>
                    </label>
                  );
                })}
              </div>
              {importMode === "merge" && (
                <p className="text-xs text-muted-foreground/70">
                  Les paramètres ne peuvent pas être « ajoutés » : ils seront ignorés en mode Ajouter.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingBackup(null)} disabled={backupBusy}>
              Annuler
            </Button>
            <Button
              variant={importMode === "replace" ? "destructive" : "default"}
              onClick={confirmImportBackup}
              disabled={backupBusy}
              className="gap-2"
            >
              {backupBusy && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {importMode === "replace" ? "Remplacer et importer" : "Ajouter et importer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le modèle ?</DialogTitle>
            <DialogDescription>
              Voulez-vous vraiment supprimer « {deleting?.name} » ? Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={deleteLoading}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteModel} disabled={deleteLoading} className="gap-2">
              {deleteLoading && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
