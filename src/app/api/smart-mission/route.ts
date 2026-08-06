import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/smart-mission?sessionId=xxx — get pending missions for a session
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  const user = await db.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) return NextResponse.json({ missions: [] });

  const where: Record<string, unknown> = { userId: user.id, dismissed: false };
  if (sessionId) where.sessionId = sessionId;

  const missions = await db.smartMission.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return NextResponse.json({ missions });
}

// PUT /api/smart-mission — accept or dismiss a mission
export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, accepted, dismissed } = body as {
    id: string; accepted?: boolean; dismissed?: boolean;
  };

  const mission = await db.smartMission.update({
    where: { id },
    data: {
      ...(accepted !== undefined ? { accepted } : {}),
      ...(dismissed !== undefined ? { dismissed } : {}),
    },
  });

  return NextResponse.json({ mission });
}
