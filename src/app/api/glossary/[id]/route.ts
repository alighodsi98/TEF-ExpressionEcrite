import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateCurrentUser } from "@/lib/user";

// PATCH /api/glossary/[id] — edit an entry
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateCurrentUser();
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const entry = await db.glossaryEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const body = await req.json();
  const { section, phrase, context } = body as {
    section?: string;
    phrase?: string;
    context?: string | null;
  };

  if (section && !["A", "B"].includes(section)) {
    return NextResponse.json({ error: "section must be A or B" }, { status: 400 });
  }
  if (phrase !== undefined && !phrase.trim()) {
    return NextResponse.json({ error: "phrase cannot be empty" }, { status: 400 });
  }

  const updated = await db.glossaryEntry.update({
    where: { id },
    data: {
      ...(section !== undefined ? { section } : {}),
      ...(phrase !== undefined ? { phrase: phrase.trim() } : {}),
      ...(context !== undefined ? { context: context?.trim() || null } : {}),
    },
  });

  return NextResponse.json({ entry: updated });
}

// DELETE /api/glossary/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getOrCreateCurrentUser();
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const entry = await db.glossaryEntry.findUnique({ where: { id } });
  if (!entry || entry.userId !== user.id) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await db.glossaryEntry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
