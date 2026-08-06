import { NextResponse } from "next/server";
import { db } from "@/lib/db";

async function getUserId() {
  const user = await db.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) throw new Error("No user profile");
  return user.id;
}

export async function GET() {
  try {
    const userId = await getUserId();
    const conversations = await db.chatConversation.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
          take: 1,
        },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        messageCount: c._count.messages,
        lastMessage: c.messages[0]?.content?.slice(0, 120) || null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    const { title } = (await req.json()) as { title?: string };

    const conversation = await db.chatConversation.create({
      data: {
        userId,
        title: title || "Nouvelle conversation",
      },
    });

    return NextResponse.json({ id: conversation.id, title: conversation.title });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur inconnue" },
      { status: 500 },
    );
  }
}
