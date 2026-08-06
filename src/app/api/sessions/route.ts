import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/sessions — list current user's sessions with summary stats
export async function GET() {
  const user = await db.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) return NextResponse.json({ sessions: [] });

  const sessions = await db.session.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { exercises: { include: { corrections: true } } },
  });

  const pickCorrection = (ex: (typeof sessions)[number]["exercises"][number] | undefined) =>
    ex?.corrections.find((c) => c.mode === "realistic") ?? ex?.corrections[0] ?? null;

  const result = sessions.map((s) => {
    const exA = s.exercises.find((e) => e.section === "A");
    const exB = s.exercises.find((e) => e.section === "B");
    const corrA = pickCorrection(exA);
    const corrB = pickCorrection(exB);
    const nclcA = corrA?.nclcLevel ?? null;
    const nclcB = corrB?.nclcLevel ?? null;
    const globalA = corrA?.globalScore ?? null;
    const globalB = corrB?.globalScore ?? null;
    return {
      id: s.id,
      type: s.type,
      createdAt: s.createdAt,
      nclcA,
      nclcB,
      globalA,
      globalB,
      topicA: exA?.topic ?? null,
      topicB: exB?.topic ?? null,
    };
  });

  return NextResponse.json({ sessions: result });
}

// DELETE /api/sessions — delete all sessions for the current user
export async function DELETE() {
  const user = await db.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) return NextResponse.json({ ok: true });

  await db.session.deleteMany({ where: { userId: user.id } });

  return NextResponse.json({ ok: true });
}
