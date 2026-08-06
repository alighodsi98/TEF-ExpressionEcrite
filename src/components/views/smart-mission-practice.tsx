"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Target, ArrowLeft, RefreshCw, Sparkles, BookOpen, Pencil, CheckCircle2, XCircle, Eye } from "lucide-react";
import { useApp } from "@/lib/store";
import { GRAMMAR_TOPICS } from "@/lib/topic-bank";

interface PracticeSentence {
  french: string;
  explanation: string;
}

interface Exercise {
  instruction: string;
  prompt: string;
  correctAnswer: string;
}

interface PracticeData {
  topic: string;
  topicLabel: string;
  description: string;
  sentences: PracticeSentence[];
  exercises: Exercise[];
}

interface ExerciseFeedback {
  correct: boolean;
  feedback: string;
}

const TABS = ["exemples", "exercices"] as const;
type Tab = (typeof TABS)[number];

export function SmartMissionPracticeView() {
  const setView = useApp((s) => s.setView);
  const viewParams = useApp((s) => s.viewParams);
  const initialTopic = (viewParams?.topic as string) || "";

  const [selectedTopic, setSelectedTopic] = useState(initialTopic);
  const [practice, setPractice] = useState<PracticeData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("exemples");

  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [checking, setChecking] = useState<Record<number, boolean>>({});
  const [feedback, setFeedback] = useState<Record<number, ExerciseFeedback | null>>({});
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});

  const loadPractice = async (topic: string) => {
    if (!topic) return;
    setLoading(true);
    setError("");
    setPractice(null);
    setUserAnswers({});
    setFeedback({});
    setRevealed({});
    setTab("exemples");
    try {
      const res = await fetch("/api/smart-mission/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setPractice(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur de génération");
    } finally {
      setLoading(false);
    }
  };

  const checkAnswer = async (index: number) => {
    const answer = userAnswers[index]?.trim();
    if (!answer || !practice?.exercises[index]) return;

    setChecking((prev) => ({ ...prev, [index]: true }));
    setFeedback((prev) => ({ ...prev, [index]: null }));
    try {
      const res = await fetch("/api/smart-mission/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: practice.topic,
          exercise: practice.exercises[index],
          userAnswer: answer,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur");
      setFeedback((prev) => ({ ...prev, [index]: data }));
    } catch {
      setFeedback((prev) => ({
        ...prev,
        [index]: { correct: false, feedback: "Erreur de vérification. Réessayez." },
      }));
    } finally {
      setChecking((prev) => ({ ...prev, [index]: false }));
    }
  };

  useEffect(() => {
    if (initialTopic) loadPractice(initialTopic);
  }, [initialTopic]);

  return (
    <div className="tef-fade-up mx-auto max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setView("dashboard")} className="gap-1 text-muted-foreground">
          <ArrowLeft className="h-4 w-4" /> Tableau de bord
        </Button>
      </div>

      <div>
        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Missions de révision grammaticale</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sélectionnez un point de grammaire pour étudier des exemples et vous entraîner.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen className="h-4 w-4 text-primary" />
            Points de grammaire
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1.5">
            {GRAMMAR_TOPICS.map((g) => (
              <Badge
                key={g.key}
                variant={selectedTopic === g.key ? "default" : "outline"}
                className="cursor-pointer text-xs transition-all hover:border-primary/40"
                onClick={() => { setSelectedTopic(g.key); loadPractice(g.key); }}
              >
                {g.label}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedTopic && (
        <Card className="border-primary/15">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-semibold">
                  {GRAMMAR_TOPICS.find((g) => g.key === selectedTopic)?.label || selectedTopic}
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => loadPractice(selectedTopic)}
                disabled={loading}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Génération..." : "Régénérer"}
              </Button>
            </div>
            {practice?.description && (
              <p className="mt-1 text-xs text-muted-foreground">{practice.description}</p>
            )}
          </CardHeader>

          {(practice || loading) && (
            <div className="border-border/40 border-t px-6">
              <div className="flex gap-0">
                {TABS.map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-medium transition-colors ${
                      tab === t
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {t === "exemples" ? (
                      <Sparkles className="h-3.5 w-3.5" />
                    ) : (
                      <Pencil className="h-3.5 w-3.5" />
                    )}
                    {t === "exemples" ? "Exemples" : "Exercices pratiques"}
                  </button>
                ))}
              </div>
            </div>
          )}

          <CardContent>
            {loading && (
              <div className="flex items-center justify-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Génération des phrases...</p>
                </div>
              </div>
            )}

            {error && !loading && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center text-sm text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && tab === "exemples" && (
              <div className="space-y-3">
                {practice?.sentences?.length ? (
                  practice.sentences.map((s, i) => (
                    <Card key={i} className="border-border/40 bg-muted/20">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-sm font-medium leading-relaxed" dir="ltr">{s.french}</p>
                            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                              <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                              <span>{s.explanation}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    Cliquez sur un point de grammaire ci-dessus pour générer des exemples.
                  </p>
                )}
              </div>
            )}

            {!loading && !error && tab === "exercices" && (
              <div className="space-y-4">
                {practice?.exercises?.length ? (
                  practice.exercises.map((ex, i) => (
                    <Card key={i} className="border-border/40">
                      <CardContent className="space-y-3 p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-xs font-bold text-amber-600">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1 space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                              {ex.instruction}
                            </p>
                            <p className="text-sm font-medium leading-relaxed" dir="ltr">{ex.prompt}</p>
                          </div>
                        </div>

                        <Textarea
                          placeholder="Écrivez votre réponse ici..."
                          className="min-h-[80px] text-sm"
                          value={userAnswers[i] || ""}
                          onChange={(e) =>
                            setUserAnswers((prev) => ({ ...prev, [i]: e.target.value }))
                          }
                          disabled={!!feedback[i]}
                        />

                        <div className="flex flex-wrap items-center gap-2">
                          {!feedback[i] ? (
                            <Button
                              size="sm"
                              variant="default"
                              className="gap-1.5 text-xs"
                              onClick={() => checkAnswer(i)}
                              disabled={!userAnswers[i]?.trim() || checking[i]}
                            >
                              {checking[i] ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Vérification...
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="h-3.5 w-3.5" /> Vérifier
                                </>
                              )}
                            </Button>
                          ) : (
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant={feedback[i]!.correct ? "default" : "destructive"}
                                className="gap-1 text-xs"
                              >
                                {feedback[i]!.correct ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : (
                                  <XCircle className="h-3 w-3" />
                                )}
                                {feedback[i]!.correct ? "Correct" : "À revoir"}
                              </Badge>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1 text-xs"
                                onClick={() => setRevealed((prev) => ({ ...prev, [i]: !revealed[i] }))}
                              >
                                <Eye className="h-3.5 w-3.5" />
                                {revealed[i] ? "Masquer" : "Voir la correction"}
                              </Button>
                            </div>
                          )}
                        </div>

                        {revealed[i] && (
                          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm">
                            <p className="mb-1 text-xs font-semibold text-emerald-600">Correction :</p>
                            <p className="text-sm font-medium" dir="ltr">{ex.correctAnswer}</p>
                          </div>
                        )}

                        {feedback[i] && (
                          <div className={`rounded-lg border p-3 text-sm ${
                            feedback[i]!.correct
                              ? "border-emerald-500/20 bg-emerald-500/5"
                              : "border-amber-500/20 bg-amber-500/5"
                          }`}>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              {feedback[i]!.feedback}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    {practice?.sentences?.length
                      ? "Génération des exercices en cours..."
                      : "Cliquez sur un point de grammaire ci-dessus pour générer des exercices."}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
