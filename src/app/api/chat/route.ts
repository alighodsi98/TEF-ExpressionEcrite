import { NextResponse } from "next/server";
import { fetchLLM, FREE_MODELS, isCustomEndpoint } from "@/lib/ai";
import { db } from "@/lib/db";

const DEFAULT_MODEL = "google/gemini-2.5-flash";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

function truncate(s: string, max: number) {
  return s.length > max ? s.slice(0, max) + "…" : s;
}

export async function POST(req: Request) {
  try {
    const { messages, conversationId } = (await req.json()) as {
      messages: ChatMessage[];
      conversationId?: string;
    };

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "messages is required" }, { status: 400 });
    }

    const user = await db.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
    const apiKey = user?.aiApiKey || process.env.OPENROUTER_API_KEY || "";
    const model = user?.aiModel || DEFAULT_MODEL;
    const baseUrl = user?.aiBaseUrl || process.env.AI_BASE_URL || "";

    if (!apiKey && !isCustomEndpoint(baseUrl)) {
      return NextResponse.json(
        { error: "Clé API non configurée. Veuillez entrer votre clé API dans les paramètres." },
        { status: 400 },
      );
    }

    const apiMessages = [
      {
        role: "system",
        content:
          "You are a helpful French language tutor specializing in TEF Canada Expression Écrite preparation. " +
          "Answer questions about French grammar, vocabulary, spelling, writing techniques, and TEF Canada exam strategy. " +
          "Always respond in French unless the user asks in another language. " +
          "Be concise, pedagogical, and encouraging. Use examples when helpful.",
      },
      ...messages,
    ];

    // Try user's model first, then round-robin free models (OpenRouter only)
    let content = "";
    try {
      content = await fetchLLM(apiKey, model, apiMessages, baseUrl);
    } catch (primaryErr) {
      console.warn(`[chat] Primary model "${model}" failed: ${primaryErr instanceof Error ? primaryErr.message : primaryErr}`);
      if (!isCustomEndpoint(baseUrl)) {
        for (const freeModel of FREE_MODELS) {
          if (freeModel === model) continue;
          try {
            content = await fetchLLM(apiKey, freeModel, apiMessages, baseUrl);
            console.log(`[chat] Fallback model "${freeModel}" succeeded`);
            break;
          } catch (err) {
            console.warn(`[chat] Free model "${freeModel}" failed: ${err instanceof Error ? err.message : err}`);
          }
        }
      }
    }

    if (!content) {
      return NextResponse.json(
        { error: "Tous les modèles ont échoué. Veuillez réessayer plus tard." },
        { status: 502 },
      );
    }

    // Auto-save messages if conversationId is provided
    let savedUserMsgId: string | null = null;
    let savedAssistantMsgId: string | null = null;

    if (conversationId && user) {
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg) {
        const savedUserMsg = await db.chatMessage.create({
          data: {
            conversationId,
            role: "user",
            content: lastUserMsg.content,
          },
        });
        savedUserMsgId = savedUserMsg.id;
      }

      const savedAssistantMsg = await db.chatMessage.create({
        data: {
          conversationId,
          role: "assistant",
          content,
        },
      });
      savedAssistantMsgId = savedAssistantMsg.id;

      // Auto-generate title from first user message if still default
      const convo = await db.chatConversation.findUnique({ where: { id: conversationId } });
      if (convo && convo.title === "Nouvelle conversation") {
        const firstUserMsg = messages[0];
        if (firstUserMsg) {
          await db.chatConversation.update({
            where: { id: conversationId },
            data: { title: truncate(firstUserMsg.content, 60) },
          });
        }
      }

      // Touch updatedAt
      await db.chatConversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });
    }

    return NextResponse.json({
      content,
      savedUserMsgId,
      savedAssistantMsgId,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
