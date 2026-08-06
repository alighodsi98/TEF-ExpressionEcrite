import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkModelHealth, isCustomEndpoint } from "@/lib/ai";
import { getOrSeedModels } from "@/lib/default-models";

const CACHE_TTL_MS = 15_000;
let cache: { data: NextResponse; timestamp: number } | null = null;

export async function GET() {
  const now = Date.now();
  if (cache && now - cache.timestamp < CACHE_TTL_MS) {
    return cache.data;
  }

  const user = await db.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
  const apiKey = user?.aiApiKey || process.env.OPENROUTER_API_KEY || "";
  const configuredModel = user?.aiModel || "";
  const baseUrl = user?.aiBaseUrl || process.env.AI_BASE_URL || "";

  if (!apiKey && !isCustomEndpoint(baseUrl)) {
    const data = NextResponse.json({
      configured: false,
      models: [],
      checkedAt: new Date().toISOString(),
    });
    cache = { data, timestamp: now };
    return data;
  }

  const catalogue = await getOrSeedModels(db);

  const known = new Map(catalogue.map((m) => [m.modelId, m.name] as const));
  const modelIds = Array.from(
    new Set([...(configuredModel ? [configuredModel] : []), ...catalogue.map((m) => m.modelId)]),
  );

  const results = await Promise.all(
    modelIds.map(async (id) => {
      const { available, reason, errorType } = await checkModelHealth(apiKey, id, baseUrl);
      return {
        id,
        name: known.get(id) ?? id,
        available,
        reason,
        errorType: errorType || null,
        configured: id === configuredModel,
      };
    }),
  );

  const data = NextResponse.json({
    configured: true,
    models: results,
    checkedAt: new Date().toISOString(),
  });

  cache = { data, timestamp: now };
  return data;
}
