// Default AI model catalogue. Seeded into the database on first use, after
// which the user can add / edit / delete models from the settings page.
import type { PrismaClient } from "@prisma/client";

export interface DefaultModel {
  modelId: string;
  name: string;
  category: "paid" | "free";
}

export const DEFAULT_MODELS: DefaultModel[] = [];

// Returns the models from the database, seeding the defaults on first use.
// Kept in lib so both the /api/models and /api/health routes stay consistent.
export async function getOrSeedModels(db: PrismaClient) {
  let models = await db.aiModel.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  if (models.length === 0) {
    await db.aiModel.createMany({
      data: DEFAULT_MODELS.map((m, i) => ({ ...m, sortOrder: i })),
    });
    models = await db.aiModel.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  }
  return models;
}
