import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/topics/[id] — edit a topic
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.topicBank.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json();
  const { topic, starterSentence, context, category } = body as {
    topic?: string;
    starterSentence?: string;
    context?: string;
    category?: string;
  };

  const updated = await db.topicBank.update({
    where: { id },
    data: {
      ...(topic !== undefined ? { topic: topic.trim() } : {}),
      ...(starterSentence !== undefined ? { starterSentence: starterSentence.trim() || null } : {}),
      ...(context !== undefined ? { context: context.trim() || null } : {}),
      ...(category !== undefined ? { category: category.trim() || null } : {}),
    },
  });

  return NextResponse.json({ topic: updated });
}

// DELETE /api/topics/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const existing = await db.topicBank.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "not found" }, { status: 404 });

  await db.topicBank.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
