"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { History as HistoryIcon, Calendar, ArrowRight, Play, RefreshCw, Trash2 } from "lucide-react";
import { useApp } from "@/lib/store";

interface SessionSummary {
  id: string; type: string; createdAt: string;
  nclcA: string | null; nclcB: string | null;
  globalA: number | null; globalB: number | null;
  topicA: string | null; topicB: string | null;
}

export function HistoryView() {
  const setView = useApp((s) => s.setView);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sessions");
      if (!res.ok) throw new Error(res.statusText);
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  const clearAll = useCallback(async () => {
    setClearing(true);
    try {
      await fetch("/api/sessions", { method: "DELETE" });
      setSessions([]);
    } catch {
      // non-critical
    } finally {
      setClearing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="tef-fade-up mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <HistoryIcon className="h-6 w-6 text-primary" /> Historique des séances
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Revue de tous vos exercices et tests de positionnement</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={load} className="gap-1 text-xs text-muted-foreground">
            <RefreshCw className="h-3 w-3" /> Actualiser
          </Button>
          {sessions.length > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll} disabled={clearing} className="gap-1 text-xs text-destructive hover:text-destructive">
              <Trash2 className="h-3 w-3" /> {clearing ? "Suppression..." : "Tout supprimer"}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/60" />)}
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <HistoryIcon className="h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Aucune séance enregistrée.</p>
            <Button onClick={() => setView("practice-intro")} className="gap-2">
              <Play className="h-4 w-4" /> Commencer votre premier exercice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1.5">
          {sessions.map((s) => (
            <Card key={s.id} className="transition-all hover:border-primary/15 hover:bg-muted/20">
              <button
                onClick={() => { useApp.setState({ detailSessionId: s.id }); setView("session-detail"); }}
                className="flex w-full items-center gap-4 p-4 text-right"
              >
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="text-lg font-bold leading-none">{s.nclcA ?? "—"}</span>
                  <span className="text-[9px]">NCLC</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {s.type === "placement" && <Badge variant="secondary" className="text-[10px]">Positionnement</Badge>}
                  </div>
                  <p className="mt-1 truncate text-sm font-medium" dir="ltr">
                    {s.topicB || s.topicA || "—"}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {new Date(s.createdAt).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}
                  </p>
                </div>
                <div className="hidden gap-4 text-center sm:flex">
                  <div>
                    <p className="text-sm font-bold tabular-nums">{s.nclcA ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">NCLC A</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold tabular-nums">{s.nclcB ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">NCLC B</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold tabular-nums">{s.globalA ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">TEF A</p>
                  </div>
                  <div>
                    <p className="text-sm font-bold tabular-nums">{s.globalB ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">TEF B</p>
                  </div>
                </div>
                {/* Mobile compact summary */}
                <div className="flex sm:hidden flex-col items-end text-right">
                  <p className="text-xs font-semibold tabular-nums text-primary">
                    {s.nclcA ?? "—"}/{s.nclcB ?? "—"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">NCLC</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
