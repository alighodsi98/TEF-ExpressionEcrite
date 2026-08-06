import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateCurrentUser } from "@/lib/user";

export async function POST(req: NextRequest) {
  try {
    const user = await getOrCreateCurrentUser();
    const body = await req.json();
    const { entries } = body as {
      entries: { section: string; phrase: string; context?: string }[];
    };

    if (!Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json({ error: "entries array is required" }, { status: 400 });
    }

    const valid = entries.filter(
      (e) => e.phrase?.trim() && ["A", "B"].includes(e.section)
    );

    await db.glossaryEntry.createMany({
      data: valid.map((e) => ({
        userId: user.id,
        section: e.section,
        phrase: e.phrase.trim(),
        context: e.context?.trim() || null,
      })),
    });

    return NextResponse.json({ count: valid.length, skipped: entries.length - valid.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur d'import" },
      { status: 500 }
    );
  }
}
