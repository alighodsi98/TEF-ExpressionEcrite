import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/user";

// GET /api/backup/export — full user data backup (JSON download)
export async function GET() {
  try {
    const user = await getCurrentUser();
    const userId = user?.id ?? "";

    const [aiModels, topics, glossaryEntries, sessions, exercises, corrections, smartMissions, chatConversations, chatMessages] =
      await Promise.all([
        db.aiModel.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
        db.topicBank.findMany({ orderBy: { createdAt: "asc" } }),
        userId
          ? db.glossaryEntry.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })
          : [],
        userId
          ? db.session.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })
          : [],
        userId
          ? db.exercise.findMany({ where: { session: { userId } }, orderBy: { submittedAt: "asc" } })
          : [],
        userId
          ? db.correction.findMany({ where: { exercise: { session: { userId } } }, orderBy: { createdAt: "asc" } })
          : [],
        userId
          ? db.smartMission.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })
          : [],
        userId
          ? db.chatConversation.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })
          : [],
        userId
          ? db.chatMessage.findMany({ where: { conversation: { userId } }, orderBy: { createdAt: "asc" } })
          : [],
      ]);

    const backup = {
      app: "tef-canada-expression-ecrite",
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      data: {
        userProfile: user,
        aiModels,
        topics,
        glossaryEntries,
        sessions,
        exercises,
        corrections,
        smartMissions,
        chatConversations,
        chatMessages,
      },
    };

    const dateStr = new Date().toISOString().slice(0, 10);
    return new NextResponse(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="sauvegarde-tef-canada-${dateStr}.json"`,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur lors de l'export" },
      { status: 500 }
    );
  }
}
