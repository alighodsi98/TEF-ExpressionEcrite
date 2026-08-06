import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/sessions/[id] — full session detail with corrections
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await db.session.findUnique({
    where: { id },
    include: { exercises: { include: { corrections: true } } },
  });
  if (!session) return NextResponse.json({ error: "not found" }, { status: 404 });

  const safeParse = <T>(raw: string | null, fallback: T): T => {
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  };

  const parseCorrection = (c: (typeof session.exercises)[number]["corrections"][number]) => ({
    ...c,
    level1Errors: safeParse(c.level1Errors, []),
    level2Suggestions: safeParse(c.level2Suggestions, []),
    level3Advanced: safeParse(c.level3Advanced, []),
    scores: safeParse(c.scores, {}),
    grammarIssues: safeParse(c.grammarIssues, []),
    vocabularyIssues: safeParse(c.vocabularyIssues, []),
  });

  const parsed = {
    ...session,
    exercises: session.exercises.map((e) => {
      const byMode: Record<string, ReturnType<typeof parseCorrection>> = {};
      for (const c of e.corrections) byMode[c.mode] = parseCorrection(c);
      const realistic = byMode["realistic"] ?? Object.values(byMode)[0] ?? null;
      return {
        ...e,
        corrections: byMode,
        // Backwards-compatible single correction (realistic by default)
        correction: realistic,
      };
    }),
  };

  return NextResponse.json({ session: parsed });
}
