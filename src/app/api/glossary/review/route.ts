import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateCurrentUser } from "@/lib/user";

// Leitner scheduling — days until the next review, indexed by the NEW box:
// box 1 -> 1 day, box 2 -> 2, box 3 -> 4, box 4 -> 8, box 5 (mastered) -> 30
const INTERVAL_DAYS = [1, 2, 4, 8, 30];

// POST /api/glossary/review — record a rating and reschedule the entry
export async function POST(req: NextRequest) {
  const user = await getOrCreateCurrentUser();
  const body = await req.json();
  const { entryId, rating } = body as { entryId?: string; rating?: string };

  if (!entryId || !["again", "good", "easy"].includes(rating || "")) {
    return NextResponse.json(
      { error: "entryId et rating (again|good|easy) sont requis." },
      { status: 400 },
    );
  }

  const entry = await db.glossaryEntry.findUnique({ where: { id: entryId } });
  if (!entry || entry.userId !== user.id) {
    return NextResponse.json({ error: "Entrée introuvable." }, { status: 404 });
  }

  const now = new Date();
  let box = entry.reviewBox;
  let days: number;

  if (rating === "again") {
    box = 0;
    days = 0; // due again today
  } else {
    const step = rating === "easy" ? 2 : 1;
    box = Math.min(entry.reviewBox + step, 5);
    days = INTERVAL_DAYS[box - 1] ?? 30;
  }

  const nextReviewAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const updated = await db.glossaryEntry.update({
    where: { id: entry.id },
    data: {
      reviewBox: box,
      reviewCount: entry.reviewCount + 1,
      lastReviewedAt: now,
      nextReviewAt,
    },
  });

  return NextResponse.json({ entry: updated, nextReviewAt });
}
