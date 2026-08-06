"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Target, X, Check } from "lucide-react";
import { useApp } from "@/lib/store";
import { grammarTopicLabel } from "@/lib/topic-bank";

interface SmartMissionData {
  id: string;
  topic: string;
  message: string;
  stat: string;
  sessionId: string;
  accepted: boolean;
  dismissed: boolean;
}

interface Props {
  sessionId?: string;
}

export function SmartMissionsView({ sessionId }: Props) {
  const setView = useApp((s) => s.setView);
  const [missions, setMissions] = useState<SmartMissionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionId) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/smart-mission?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((d) => setMissions(d.missions || []))
      .catch(() => setMissions([]))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading || missions.length === 0) return null;

  const handleAction = async (id: string, action: "accept" | "dismiss") => {
    await fetch("/api/smart-mission", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        accepted: action === "accept",
        dismissed: action === "dismiss",
      }),
    });
    setMissions((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <Card className="border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-950/20">
      <CardHeader className="pb-2 pt-3">
        <CardTitle className="flex items-center gap-1.5 text-xs font-semibold">
          <Target className="h-3.5 w-3.5 text-emerald-600" />
          Suggestions de révision
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        {missions.map((m) => {
          const label = grammarTopicLabel(m.topic);
          return (
            <div
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-emerald-200/60 bg-white/60 p-2.5 dark:border-emerald-800/40 dark:bg-emerald-950/30"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{label.labelFr}</span>
                  <Badge variant="secondary" className="text-[10px]">{m.stat}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">{m.message}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-emerald-600"
                  onClick={() => { handleAction(m.id, "accept"); setView("smart-mission-practice", { topic: m.topic }); }}
                  title="S'entraîner"
                >
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                  onClick={() => handleAction(m.id, "dismiss")}
                  title="Ignorer"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
