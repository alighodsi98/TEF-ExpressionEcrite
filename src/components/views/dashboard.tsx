"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Play, TrendingUp, TrendingDown, Trophy, ArrowRight, Calendar, FileEdit,
  Target,
} from "lucide-react";
import { useApp } from "@/lib/store";

interface Profile {
  id: string; name: string; targetNclc: number;
  placementDone: boolean; placementMode?: string;
  levelSectionA?: string; levelSectionB?: string;
  levelOverallNclc?: string; levelOverallCecr?: string;
}
interface ProgressPoint {
  index: number; date: string; type: string;
  globalA: number | null; globalB: number | null; overall: number | null;
  nclcA: string | null; nclcB: string | null;
}
interface Totals { sessions: number; avgGlobal: number; bestGlobal: number; }
interface SessionSummary {
  id: string; type: string; createdAt: string;
  nclcA: string | null; nclcB: string | null;
  globalA: number | null; globalB: number | null;
  topicA: string | null; topicB: string | null;
}

function nclcColor(level: string | null | undefined): string {
  if (!level) return "oklch(0.7 0 0)";
  const n = parseInt(level, 10);
  if (n <= 4) return "oklch(0.58 0.22 27)";
  if (n <= 5) return "oklch(0.75 0.15 75)";
  if (n <= 6) return "oklch(0.55 0.13 165)";
  return "oklch(0.52 0.13 165)";
}

function nclcLabel(level: string | null | undefined): string {
  if (!level) return "—";
  const n = parseInt(level, 10);
  if (n <= 4) return "Débutant";
  if (n <= 5) return "Intermédiaire";
  if (n <= 6) return "Avancé";
  return "Expert";
}

function cefrFromNclc(level: string | null | undefined): string {
  if (!level) return "";
  const n = parseInt(level, 10);
  const map: Record<number, string> = { 1: "A1", 2: "A1", 3: "A2", 4: "A2", 5: "B1", 6: "B2", 7: "C1", 8: "C2" };
  return map[n] || "";
}

export function DashboardView() {
  const setView = useApp((s) => s.setView);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [progress, setProgress] = useState<ProgressPoint[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [recent, setRecent] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, progRes, sRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/progress"),
        fetch("/api/sessions"),
      ]);
      const p = await pRes.json();
      const prog = await progRes.json();
      const s = await sRes.json();
      setProfile(p.user);
      setProgress(prog.points || []);
      setTotals(prog.totals || null);
      setRecent((s.sessions || []).slice(0, 4));
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="h-44 animate-pulse rounded-2xl bg-muted/60" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  const latestScore = progress.length > 0 ? progress[progress.length - 1]?.overall : null;
  const prevScore = progress.length > 1 ? progress[progress.length - 2]?.overall : null;
  const scoreTrend = latestScore != null && prevScore != null ? latestScore - prevScore : null;

  return (
    <div className="tef-fade-up mx-auto max-w-5xl space-y-5">
      {/* ── HERO ── */}
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent">
        <div className="flex flex-col items-start gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-3">
              {profile?.placementDone && profile.levelOverallNclc ? (
                <>
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-full text-lg font-bold text-white shadow-lg"
                    style={{ backgroundColor: nclcColor(profile.levelOverallNclc) }}
                  >
                    {profile.levelOverallNclc}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Niveau NCLC {profile.levelOverallNclc}</p>
                    <p className="text-xs text-muted-foreground">
                      CEFR {cefrFromNclc(profile.levelOverallNclc)}
                      <span className="mx-1.5 opacity-40">|</span>
                      {nclcLabel(profile.levelOverallNclc)}
                    </p>
                  </div>
                </>
              ) : null}
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Prêt(e) pour une nouvelle séance ?</h2>
              {profile?.placementDone && totals?.avgGlobal != null && (
                <p className="mt-1 text-sm text-muted-foreground">
                  Score moyen : <span className="font-semibold text-foreground">{totals.avgGlobal}</span>/699
                  {profile.targetNclc && (
                    <span className="ml-2 text-muted-foreground/60">
                      Objectif : NCLC {profile.targetNclc}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-2 sm:w-48">
              <Button size="lg" className="w-full gap-2 tef-glow shadow-sm" onClick={() => setView("practice-intro")}>
                <Play className="h-4 w-4" /> Commencer
              </Button>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => setView("external-eval")}>
                <FileEdit className="h-3.5 w-3.5" /> Évaluer un texte
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Séances"
          value={totals?.sessions ?? 0}
          icon={<Calendar className="h-4 w-4" />}
        />
        <StatCard
          label="Score moyen"
          value={totals?.avgGlobal ?? 0}
          suffix="/699"
          icon={<TrendingUp className="h-4 w-4" />}
          trend={scoreTrend != null ? (scoreTrend > 0 ? "up" : scoreTrend < 0 ? "down" : null) : null}
        />
        <StatCard
          label="Meilleur score"
          value={totals?.bestGlobal ?? 0}
          suffix="/699"
          icon={<Trophy className="h-4 w-4" />}
          highlight
        />
        <StatCard
          label="Dernier score"
          value={latestScore ?? 0}
          suffix="/699"
          icon={<Target className="h-4 w-4" />}
          trend={scoreTrend != null ? (scoreTrend > 0 ? "up" : scoreTrend < 0 ? "down" : null) : null}
        />
      </div>

      {/* ── RECENT SESSIONS ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Calendar className="h-4 w-4 text-primary" /> Séances récentes
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setView("history")} className="gap-1 text-xs text-muted-foreground">
              Tout <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-center text-sm text-muted-foreground">
              Aucune séance enregistrée.
            </div>
          ) : (
            <div className="max-h-72 space-y-1.5 overflow-y-auto tef-scroll pr-1">
              {recent.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { useApp.setState({ detailSessionId: s.id }); setView("session-detail"); }}
                  className="group flex w-full items-center justify-between rounded-xl border border-border/60 p-3 text-right transition-all hover:border-primary/20 hover:bg-muted/30 active:scale-[0.99]"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="truncate text-sm font-medium" dir="ltr">{s.topicB || s.topicA || "Exercice"}</p>
                    <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {new Date(s.createdAt).toLocaleDateString("fr-FR")}
                      {s.topicA && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{s.topicA}</Badge>
                      )}
                      {s.topicB && s.topicB !== s.topicA && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">{s.topicB}</Badge>
                      )}
                      {s.type === "placement" && (
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-primary/30 text-primary">Positionnement</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <div className="text-right">
                      <p className="text-lg font-bold tabular-nums text-primary">{s.nclcA ?? "—"}/{s.nclcB ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">NCLC</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({
  label,
  value,
  suffix,
  icon,
  highlight,
  trend,
}: {
  label: string;
  value: number;
  suffix?: string;
  icon: React.ReactNode;
  highlight?: boolean;
  trend?: "up" | "down" | null;
}) {
  return (
    <Card className={`border-border/60 transition-all hover:border-border ${highlight ? "border-primary/15" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
          <div className="flex items-center gap-1.5">
            {trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
            {trend === "down" && <TrendingDown className="h-3 w-3 text-rose-500" />}
            {icon}
          </div>
        </div>
        <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
          {value}<span className="ml-0.5 text-sm font-normal text-muted-foreground">{suffix}</span>
        </p>
      </CardContent>
    </Card>
  );
}
