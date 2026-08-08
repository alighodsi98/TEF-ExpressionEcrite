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
          "Tu es un professeur de français spécialisé dans la préparation à l'épreuve d'expression écrite du TEF Canada.\n\n" +
          "STRUCTURE DE L'ÉPREUVE (à connaître parfaitement) :\n" +
          "- L'épreuve d'expression écrite du TEF Canada comprend EXACTEMENT 2 sections, jamais plus :\n" +
          "  • Section A — Fait divers (25 minutes) : continuer une phrase de départ pour rédiger un fait divers (article de presse), minimum 80 mots.\n" +
          "  • Section B — Argumentation (35 minutes) : exprimer et justifier son point de vue sur un sujet de société, minimum 200 mots.\n" +
          "- Il n'existe PAS de section C, ni de sections numérotées 1, 2, 3. Ne mentionne jamais d'autres sections que A et B.\n" +
          "- La section B ne doit PAS être rédigée sous forme de lettre (règle officielle du TEF Canada : « il n'est pas du tout obligatoire de rédiger son argumentation sous forme de lettre »).\n\n" +
          "RÈGLES DE RÉPONSE :\n" +
          "- Réponds directement à la question, SANS phrase d'introduction générique du type « C'est une excellente question ! », « Bonne question ! », « Très bonne idée ! ».\n" +
          "- Ne termine jamais par une question de prospection générique du type « Avez-vous besoin d'un exercice pour pratiquer ? » ou « Souhaitez-vous un exemple ? » — sauf si l'utilisateur le demande explicitement.\n" +
          "- Sois concis, précis et pédagogique. Utilise des exemples quand c'est utile.\n" +
          "- Réponds en français, sauf si l'utilisateur écrit dans une autre langue.",
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
