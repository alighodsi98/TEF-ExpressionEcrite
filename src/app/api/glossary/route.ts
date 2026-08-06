import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateCurrentUser } from "@/lib/user";
import { Prisma } from "@prisma/client";

// GET /api/glossary — list user's glossary entries
// Optional: ?due=1 -> only entries due for review (never reviewed or overdue)
export async function GET(req: NextRequest) {
  const user = await getOrCreateCurrentUser();
  const section = req.nextUrl.searchParams.get("section");
  const due = req.nextUrl.searchParams.get("due");

  const where: Prisma.GlossaryEntryWhereInput = { userId: user.id };
  if (section && (section === "A" || section === "B")) {
    where.section = section;
  }
  if (due === "1") {
    where.OR = [{ nextReviewAt: null }, { nextReviewAt: { lte: new Date() } }];
  }

  const entries = await db.glossaryEntry.findMany({
    where,
    orderBy:
      due === "1"
        ? [{ reviewBox: "asc" }, { createdAt: "asc" }]
        : { createdAt: "desc" },
  });

  return NextResponse.json({ entries });
}

// POST /api/glossary — add entry
export async function POST(req: NextRequest) {
  const user = await getOrCreateCurrentUser();
  const body = await req.json();
  const { section, phrase, context } = body as {
    section: string;
    phrase: string;
    context?: string;
  };

  if (!section || !["A", "B"].includes(section)) {
    return NextResponse.json({ error: "section must be A or B" }, { status: 400 });
  }
  if (!phrase || !phrase.trim()) {
    return NextResponse.json({ error: "phrase is required" }, { status: 400 });
  }

  const entry = await db.glossaryEntry.create({
    data: {
      userId: user.id,
      section,
      phrase: phrase.trim(),
      context: context?.trim() || null,
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}