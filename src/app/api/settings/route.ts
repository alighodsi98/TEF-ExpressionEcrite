import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/settings — return current settings
export async function GET() {
  const user = await db.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    return NextResponse.json({ aiApiKey: "", aiModel: "google/gemini-2.5-flash", aiBaseUrl: "", smartMissionsEnabled: true });
  }
  return NextResponse.json({
    aiApiKey: user.aiApiKey || "",
    aiModel: user.aiModel || "google/gemini-2.5-flash",
    aiBaseUrl: user.aiBaseUrl || "",
    smartMissionsEnabled: user.smartMissionsEnabled,
  });
}

// POST /api/settings — update settings
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { aiApiKey, aiModel, aiBaseUrl, smartMissionsEnabled } = body as {
    aiApiKey?: string; aiModel?: string; aiBaseUrl?: string; smartMissionsEnabled?: boolean;
  };

  let user = await db.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    user = await db.userProfile.create({
      data: { name: "Apprenant", targetNclc: 7, smartMissionsEnabled: true },
    });
  }

  user = await db.userProfile.update({
    where: { id: user.id },
    data: {
      ...(aiApiKey !== undefined ? { aiApiKey } : {}),
      ...(aiModel !== undefined ? { aiModel } : {}),
      ...(aiBaseUrl !== undefined ? { aiBaseUrl: aiBaseUrl.trim() } : {}),
      ...(smartMissionsEnabled !== undefined ? { smartMissionsEnabled } : {}),
    },
  });

  return NextResponse.json({
    aiApiKey: user.aiApiKey || "",
    aiModel: user.aiModel || "google/gemini-2.5-flash",
    aiBaseUrl: user.aiBaseUrl || "",
    smartMissionsEnabled: user.smartMissionsEnabled,
  });
}
