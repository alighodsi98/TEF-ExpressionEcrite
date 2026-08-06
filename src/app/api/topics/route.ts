import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/topics — list all topics (optionally filtered by section)
export async function GET(req: NextRequest) {
  const section = req.nextUrl.searchParams.get("section");

  const where: { section?: string } = {};
  if (section && (section === "A" || section === "B")) {
    where.section = section;
  }

  const topics = await db.topicBank.findMany({
    where,
    orderBy: [{ section: "asc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ topics });
}

// POST /api/topics — add a topic
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { section, topic, starterSentence, context, category } = body as {
    section: string;
    topic: string;
    starterSentence?: string;
    context?: string;
    category?: string;
  };

  if (!section || !["A", "B"].includes(section)) {
    return NextResponse.json({ error: "section must be A or B" }, { status: 400 });
  }
  if (!topic || !topic.trim()) {
    return NextResponse.json({ error: "topic is required" }, { status: 400 });
  }

  const t = await db.topicBank.create({
    data: {
      section,
      topic: topic.trim(),
      starterSentence: starterSentence?.trim() || null,
      context: context?.trim() || null,
      category: category?.trim() || null,
      isDynamic: true,
    },
  });

  return NextResponse.json({ topic: t }, { status: 201 });
}