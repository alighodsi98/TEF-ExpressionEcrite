"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Pencil, Trash2, X, Save, GripVertical, Search, Upload, Play } from "lucide-react";
import { useApp } from "@/lib/store";
import { useToast } from "@/hooks/use-toast";
import { ImportDialog } from "./import-dialog";
import { cn } from "@/lib/utils";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TopicItem {
  id: string;
  section: string;
  topic: string;
  starterSentence?: string | null;
  context?: string | null;
  category: string | null;
  isDynamic: boolean;
  written: boolean;
}

export function TopicBankManagementView() {
  const setView = useApp((s) => s.setView);
  const setPracticeTopic = useApp((s) => s.setPracticeTopic);
  const { toast } = useToast();
  const [topics, setTopics] = useState<TopicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>("A");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);

  // Form state
  const [formTopic, setFormTopic] = useState("");
  const [formStarter, setFormStarter] = useState("");
  const [formContext, setFormContext] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formSaving, setFormSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/topics?section=${activeSection}`);
      const data = await res.json();
      setTopics(data.topics || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [activeSection]);

  useEffect(() => { load(); }, [load]);

  function openAddDialog() {
    setEditingId(null);
    setFormTopic("");
    setFormStarter("");
    setFormContext("");
    setFormCategory("");
    setEditorOpen(true);
  }

  function openEditDialog(t: TopicItem) {
    setEditingId(t.id);
    setFormTopic(t.topic);
    setFormStarter(t.starterSentence || "");
    setFormContext(t.context || "");
    setFormCategory(t.category || "");
    setEditorOpen(true);
  }

  async function handleSave() {
    const topic = formTopic.trim();
    if (!topic) {
      toast({ title: "Erreur", description: "Le sujet est requis.", variant: "destructive" });
      return;
    }
    setFormSaving(true);
    try {
      const body: Record<string, unknown> = {
        section: activeSection,
        topic,
        category: formCategory.trim() || null,
      };
      if (activeSection === "A") {
        body.starterSentence = formStarter.trim() || null;
      } else {
        body.context = formContext.trim() || null;
      }

      const url = editingId
        ? `/api/topics/${encodeURIComponent(editingId)}`
        : "/api/topics";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Échec");
      }
      toast({ title: editingId ? "Sujet modifié" : "Sujet ajouté", description: `"${topic}" a été enregistré.` });
      setEditorOpen(false);
      await load();
    } catch (e) {
      toast({ title: "Erreur", description: e instanceof Error ? e.message : "Échec", variant: "destructive" });
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/topics/${encodeURIComponent(deleteId)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      toast({ title: "Supprimé", description: "Le sujet a été retiré." });
      setDeleteId(null);
      await load();
    } catch {
      toast({ title: "Erreur", description: "Échec de la suppression.", variant: "destructive" });
    }
  }

  async function handleReorder(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = topics.findIndex((t) => t.id === active.id);
    const newIndex = topics.findIndex((t) => t.id === over.id);
    const reordered = arrayMove(topics, oldIndex, newIndex);
    setTopics(reordered);
  }

  function startPractice(t: TopicItem) {
    setPracticeTopic({
      section: t.section as "A" | "B",
      topic: t.topic,
      starterSentence: t.starterSentence,
      context: t.context,
      category: t.category,
    });
    setView("practice-single");
  }

  const categories = [
    ...new Set(topics.map((t) => t.category).filter(Boolean) as string[]),
  ].sort();

  const allCategories = [...new Set([...categories, "fait_divers", "sante", "culture", "societe", "education", "transport", "environnement", "technologie", "travail", "famille", "sport", "politique", "science"])].sort();

  const sortedTopics = [...topics].sort((a, b) => {
    const aOrder = a.isDynamic ? 1 : 0;
    const bOrder = b.isDynamic ? 1 : 0;
    return aOrder - bOrder;
  });

  const writtenCount = topics.filter((t) => t.written).length;
  const totalCount = topics.length;

  return (
    <div className="tef-fade-up mx-auto max-w-4xl space-y-4 pb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setView("dashboard")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Gestion des sujets</h2>
            <p className="text-sm text-muted-foreground">Ajoutez, modifiez ou supprimez les sujets du banque de sujets</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setImportOpen(true)} size="sm" variant="outline" className="gap-1.5">
            <Upload className="h-4 w-4" /> Importer en lot
          </Button>
          <Button onClick={openAddDialog} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Ajouter un sujet
          </Button>
        </div>
      </div>

      <div className="sticky top-14 z-30 -mx-4 space-y-2 bg-background/95 px-4 py-2 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 sm:top-16">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={activeSection === "A" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection("A")}
          >
            Section A — Fait divers
          </Button>
          <Button
            variant={activeSection === "B" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveSection("B")}
          >
            Section B — Argumentation
          </Button>
          <div className="flex-1" />
          {totalCount > 0 && (
            <span className="text-[11px] text-muted-foreground">
              {writtenCount}/{totalCount} écrits
            </span>
          )}
        </div>

        <div className="relative w-full">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher un sujet..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      ) : sortedTopics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">Aucun sujet pour cette section.</p>
          </CardContent>
        </Card>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleReorder}>
          <SortableContext items={topics.map((t) => t.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {sortedTopics
                .filter((t) => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.trim().toLowerCase();
                  return (
                    t.topic.toLowerCase().includes(q) ||
                    (t.starterSentence?.toLowerCase() || "").includes(q) ||
                    (t.context?.toLowerCase() || "").includes(q) ||
                    (t.category?.toLowerCase() || "").includes(q)
                  );
                })
                .map((t) => (
                  <SortableTopic key={t.id} topic={t} onEdit={openEditDialog} onDelete={setDeleteId} onPractice={startPractice} />
                ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Edit/Add dialog */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? "Modifier le sujet" : "Ajouter un sujet"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic">Sujet</Label>
              <Input
                id="topic"
                placeholder="Ex. : Un fait divers survenu à Paris..."
                value={formTopic}
                onChange={(e) => setFormTopic(e.target.value)}
                dir="ltr"
              />
            </div>
            {activeSection === "A" ? (
              <div className="space-y-2">
                <Label htmlFor="starter">Phrase de départ</Label>
                <Textarea
                  id="starter"
                  placeholder="La phrase qui ouvre le fait divers..."
                  value={formStarter}
                  onChange={(e) => setFormStarter(e.target.value)}
                  rows={3}
                  dir="ltr"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="context">Contexte</Label>
                <Textarea
                  id="context"
                  placeholder="La situation ou le contexte pour l'argumentation..."
                  value={formContext}
                  onChange={(e) => setFormContext(e.target.value)}
                  rows={3}
                  dir="ltr"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="category">Catégorie</Label>
              <Select value={formCategory} onValueChange={setFormCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une catégorie..." />
                </SelectTrigger>
                <SelectContent>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditorOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={formSaving} className="gap-2">
              {formSaving && <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le sujet ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Voulez-vous vraiment supprimer ce sujet ? Cette action est irréversible.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete}>Supprimer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        mode="topics"
        section={activeSection}
        onImported={() => load()}
      />
    </div>
  );
}

function SortableTopic({ topic, onEdit, onDelete, onPractice }: { topic: TopicItem; onEdit: (t: TopicItem) => void; onDelete: (id: string) => void; onPractice: (t: TopicItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: topic.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background p-3 transition-all hover:border-primary/15"
    >
      <div {...attributes} {...listeners} className="flex shrink-0 items-center">
        <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground/40" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate" dir="ltr">{topic.topic}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="secondary" className="text-[10px]">{topic.section === "A" ? "Fait divers" : "Argumentation"}</Badge>
          {topic.category && (
            <span className="text-[11px] text-muted-foreground">{topic.category}</span>
          )}
          {topic.isDynamic && (
            <Badge variant="outline" className="text-[10px]">Personnalisé</Badge>
          )}
          {topic.written && (
            <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">Écrit</Badge>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1 px-2 text-primary hover:text-primary"
          aria-label="S'entraîner sur ce sujet"
          title="S'entraîner sur ce sujet"
          onClick={() => onPractice(topic)}
        >
          <Play className="h-3.5 w-3.5" />
          <span className="text-xs">S&apos;entraîner</span>
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Modifier" onClick={() => onEdit(topic)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Supprimer" onClick={() => onDelete(topic.id)}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}