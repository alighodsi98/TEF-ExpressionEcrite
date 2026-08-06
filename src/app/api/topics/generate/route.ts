import { NextRequest, NextResponse } from "next/server";
import { pickBankTopic, ensureTopicBankSeeded } from "@/lib/topic-bank";

// POST /api/topics/generate
// body: { sectionAOnly?, sectionBOnly?, category? }
// Always picks from the official topic bank.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const category = body.category as string | undefined;

    await ensureTopicBankSeeded();

    let sectionA: { topic: string; starterSentence: string; category: string } | null = null;
    let sectionB: { topic: string; context: string; category: string } | null = null;

    if (!body.sectionBOnly) {
      const t = await pickBankTopic("A", category) ?? await pickBankTopic("A");
      if (t?.starterSentence) {
        sectionA = { topic: t.topic, starterSentence: t.starterSentence, category: t.category || "fait_divers" };
      }
    }
    if (!body.sectionAOnly) {
      const t = await pickBankTopic("B", category) ?? await pickBankTopic("B");
      if (t?.context) {
        sectionB = { topic: t.topic, context: t.context, category: t.category || "societe" };
      }
    }

    return NextResponse.json({ sectionA, sectionB });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
