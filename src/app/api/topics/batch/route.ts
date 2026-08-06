import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { section, topics } = body as {
      section: string;
      topics: { topic: string; starterSentence?: string; context?: string; category?: string }[];
    };

    if (!section || !["A", "B"].includes(section)) {
      return NextResponse.json({ error: "section must be A or B" }, { status: 400 });
    }
    if (!Array.isArray(topics) || topics.length === 0) {
      return NextResponse.json({ error: "topics array is required" }, { status: 400 });
    }

    const valid = topics.filter((t) => t.topic?.trim());

    await db.topicBank.createMany({
      data: valid.map((t) => ({
        section,
        topic: t.topic.trim(),
        starterSentence: section === "A" ? (t.starterSentence?.trim() || null) : null,
        context: section === "B" ? (t.context?.trim() || null) : null,
        category: t.category?.trim() || null,
        isDynamic: true,
      })),
    });

    return NextResponse.json({ count: valid.length, skipped: topics.length - valid.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur d'import" },
      { status: 500 }
    );
  }
}
