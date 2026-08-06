import { NextResponse } from "next/server";
import { pickBankTopic, ensureTopicBankSeeded } from "@/lib/topic-bank";

// POST /api/placement/start
// Returns both Section A & B topics from the official bank.
export async function POST() {
  try {
    await ensureTopicBankSeeded();

    const tA = await pickBankTopic("A");
    const tB = await pickBankTopic("B");

    const sectionA = tA?.starterSentence
      ? { topic: tA.topic, starterSentence: tA.starterSentence, category: tA.category || "fait_divers" }
      : null;
    const sectionB = tB?.context
      ? { topic: tB.topic, context: tB.context, category: tB.category || "societe" }
      : null;

    return NextResponse.json({ sectionA, sectionB });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
