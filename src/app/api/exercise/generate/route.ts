import { NextRequest, NextResponse } from "next/server";
import { pickBankTopic, ensureTopicBankSeeded } from "@/lib/topic-bank";

// POST /api/exercise/generate
// body: { category?, mix? (default true) }
// Returns Section A + B topics from the official bank.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const category = body.category as string | undefined;

    await ensureTopicBankSeeded();

    let sectionA: { topic: string; starterSentence: string; category: string } | null = null;
    let sectionB: { topic: string; context: string; category: string } | null = null;

    // Try category-specific first, then fall back to any topic in that section
    const tA = await pickBankTopic("A", category) ?? await pickBankTopic("A");
    if (tA?.starterSentence) {
      sectionA = { topic: tA.topic, starterSentence: tA.starterSentence, category: tA.category || "fait_divers" };
    }

    const tB = await pickBankTopic("B", category) ?? await pickBankTopic("B");
    if (tB?.context) {
      sectionB = { topic: tB.topic, context: tB.context, category: tB.category || "societe" };
    }

    return NextResponse.json({ sectionA, sectionB });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
