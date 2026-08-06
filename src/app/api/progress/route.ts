import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type CorrRow = { mode: string; globalScore: number | null; nclcLevel?: string | null };
type ExRow = { section: string; corrections: CorrRow[] };

// Pick the realistic correction (fallback to first) for an exercise.
function pick(ex: ExRow | undefined): CorrRow | null {
  if (!ex) return null;
  return ex.corrections.find((c) => c.mode === "realistic") ?? ex.corrections[0] ?? null;
}

// GET /api/progress — time-series of scores across sessions for charts
export async function GET() {
  const user = await db.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) return NextResponse.json({ points: [], totals: { sessions: 0, avgGlobal: 0, bestGlobal: 0 } });

  const sessions = await db.session.findMany({
    where: { userId: user.id, type: { in: ["practice", "placement"] } },
    orderBy: { createdAt: "asc" },
    include: { exercises: { include: { corrections: true } } },
  });

  const points = sessions.map((s, idx) => {
    const corrA = pick(s.exercises.find((e) => e.section === "A"));
    const corrB = pick(s.exercises.find((e) => e.section === "B"));
    const globalA = corrA?.globalScore ?? null;
    const globalB = corrB?.globalScore ?? null;
    const overall =
      globalA != null && globalB != null
        ? Math.round((globalA + globalB) / 2)
        : globalA ?? globalB ?? null;
    return {
      index: idx + 1,
      sessionId: s.id,
      date: s.createdAt,
      type: s.type,
      globalA,
      globalB,
      overall,
      nclcA: corrA?.nclcLevel ?? null,
      nclcB: corrB?.nclcLevel ?? null,
    };
  });

  const practiceSessions = sessions.filter((s) => s.type === "practice");
  const totals = {
    sessions: practiceSessions.length,
    avgGlobal: avgGlobal(practiceSessions),
    bestGlobal: bestGlobal(practiceSessions),
  };

  return NextResponse.json({ points, totals });
}

function sessionScore(s: { exercises: ExRow[] }): number | null {
  const a = pick(s.exercises.find((e) => e.section === "A"))?.globalScore;
  const b = pick(s.exercises.find((e) => e.section === "B"))?.globalScore;
  if (a != null && b != null) return (a + b) / 2;
  return a ?? b ?? null;
}

function avgGlobal(sessions: { exercises: ExRow[] }[]) {
  const scores = sessions.map(sessionScore).filter((x): x is number => x != null);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function bestGlobal(sessions: { exercises: ExRow[] }[]) {
  const scores = sessions.map(sessionScore).filter((x): x is number => x != null);
  if (scores.length === 0) return 0;
  return Math.round(Math.max(...scores));
}
