import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrSeedModels } from "@/lib/default-models";

const VALID_CATEGORIES = ["paid", "free", "custom"];

function normalizeCategory(c: unknown): string {
  return typeof c === "string" && VALID_CATEGORIES.includes(c) ? c : "custom";
}

// GET /api/models — list all models (seeds defaults on first use)
export async function GET() {
  const models = await getOrSeedModels(db);
  return NextResponse.json({ models });
}

// POST /api/models — add a new model
export async function POST(req: NextRequest) {
  const body = await req.json();
  const modelId = (body.modelId ?? "").toString().trim();
  const name = (body.name ?? "").toString().trim();
  const category = normalizeCategory(body.category);

  if (!modelId) {
    return NextResponse.json({ error: "L'identifiant du modèle est requis." }, { status: 400 });
  }

  const existing = await db.aiModel.findUnique({ where: { modelId } });
  if (existing) {
    return NextResponse.json({ error: "Ce modèle existe déjà." }, { status: 409 });
  }

  const max = await db.aiModel.findFirst({ orderBy: { sortOrder: "desc" } });
  const model = await db.aiModel.create({
    data: {
      modelId,
      name: name || modelId,
      category,
      sortOrder: (max?.sortOrder ?? -1) + 1,
    },
  });

  return NextResponse.json({ model });
}

// PATCH /api/models — edit an existing model
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const id = (body.id ?? "").toString();
  if (!id) return NextResponse.json({ error: "id manquant." }, { status: 400 });

  const existing = await db.aiModel.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });

  const nextModelId = body.modelId !== undefined ? body.modelId.toString().trim() : existing.modelId;
  if (!nextModelId) {
    return NextResponse.json({ error: "L'identifiant du modèle est requis." }, { status: 400 });
  }

  if (nextModelId !== existing.modelId) {
    const dup = await db.aiModel.findUnique({ where: { modelId: nextModelId } });
    if (dup) return NextResponse.json({ error: "Ce modèle existe déjà." }, { status: 409 });
  }

  const model = await db.aiModel.update({
    where: { id },
    data: {
      modelId: nextModelId,
      ...(body.name !== undefined ? { name: body.name.toString().trim() || nextModelId } : {}),
      ...(body.category !== undefined ? { category: normalizeCategory(body.category) } : {}),
    },
  });

  return NextResponse.json({ model });
}

// DELETE /api/models?id=... — remove a model
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id manquant." }, { status: 400 });

  const existing = await db.aiModel.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Modèle introuvable." }, { status: 404 });

  await db.aiModel.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
