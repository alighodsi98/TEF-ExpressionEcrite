import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { correctExercise, type CorrectionResult } from "@/lib/ai";
import { getOrCreateCurrentUser, countWords } from "@/lib/user";
import { markTopicWritten } from "@/lib/topic-bank";

const STEP_LABELS: Record<string, string> = {
  "realistic": "Évaluation — Réaliste",
};

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const body = await req.json();
        const { section, topic, starterSentence, context, userText, durationSec } = body as {
          section: "A" | "B";
          topic: string;
          starterSentence?: string;
          context?: string;
          userText: string;
          durationSec?: number;
        };

        if (!topic || !userText) {
          send({ type: "error", message: "Le sujet et le texte sont requis." });
          return;
        }

        const user = await getOrCreateCurrentUser();

        const totalSteps = 1;
        let completed = 0;

        send({ type: "start", total: totalSteps });

        send({ type: "progress", completed, total: totalSteps, current: STEP_LABELS["realistic"] });

        const corr = await correctExercise({
          section,
          topic,
          starterSentence: section === "A" ? starterSentence : undefined,
          context: section === "B" ? context : undefined,
          userText,
        });

        // If the topic comes from the bank, mark it as written
        await markTopicWritten(section, topic);

        completed++;
        send({ type: "done_step", key: "realistic", completed, total: totalSteps, label: STEP_LABELS["realistic"] });

        send({ type: "progress", completed, total: totalSteps, current: "Sauvegarde des résultats…" });

        const session = await db.session.create({
          data: {
            userId: user.id,
            type: "external",
            exercises: {
              create: [
                {
                  section,
                  topic,
                  starterSentence: starterSentence ?? null,
                  context: context ?? null,
                  userText,
                  wordCount: countWords(userText),
                  durationSec: durationSec ?? 0,
                  corrections: {
                    create: [correctionCreateData("realistic", corr)],
                  },
                },
              ],
            },
          },
          include: { exercises: { include: { corrections: true } } },
        });

        send({ type: "done", data: { sessionId: session.id, section, corrections: { realistic: corr } } });
      } catch (e) {
        send({ type: "error", message: e instanceof Error ? e.message : "Erreur inconnue" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function correctionCreateData(mode: string, c: CorrectionResult) {
  return {
    mode,
    level1Errors: JSON.stringify(c.level1Errors),
    level2Suggestions: JSON.stringify(c.level2Suggestions),
    level3Advanced: JSON.stringify(c.level3Advanced),
    level4Rewrite: c.level4Rewrite,
    scores: JSON.stringify(c.scores),
    nclcLevel: c.nclcLevel,
    cecrLevel: c.cecrLevel,
    globalScore: c.globalScore,
    grammarIssues: JSON.stringify(c.grammarIssues),
    vocabularyIssues: JSON.stringify(c.vocabularyIssues),
    feedback: c.feedback,
  };
}

function defaultCorrection(): CorrectionResult {
  return {
    level1Errors: [],
    level2Suggestions: [],
    level3Advanced: [],
    level4Rewrite: "",
    scores: { adequation: 0, coherence: 0, vocabulary: 0, grammar: 0 },
    nclcLevel: "—",
    cecrLevel: "—",
    globalScore: 0,
    grammarIssues: [],
    vocabularyIssues: [],
    feedback: "La correction a échoué. Veuillez réessayer.",
  };
}
