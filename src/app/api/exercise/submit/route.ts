import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { correctExercise, type CorrectionResult } from "@/lib/ai";
import { getOrCreateCurrentUser, countWords } from "@/lib/user";
import { markTopicWritten } from "@/lib/topic-bank";
import { generateSmartMissions } from "@/lib/smart-mission";

const STEP_LABELS: Record<string, string> = {
  "A-realistic": "Section A — Réaliste",
  "B-realistic": "Section B — Réaliste",
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
        const { sectionA, sectionB } = body as {
          sectionA: { topic: string; starterSentence?: string; text: string; durationSec: number };
          sectionB: { topic: string; context?: string; text: string; durationSec: number };
        };

        const user = await getOrCreateCurrentUser();

        // Backend word count enforcement
        const minWordsA = 80;
        const minWordsB = 200;
        if (countWords(sectionA.text) < minWordsA) {
          send({ type: "error", message: `Section A : minimum ${minWordsA} mots requis (${countWords(sectionA.text)} mots écrits).` });
          return;
        }
        if (countWords(sectionB.text) < minWordsB) {
          send({ type: "error", message: `Section B : minimum ${minWordsB} mots requis (${countWords(sectionB.text)} mots écrits).` });
          return;
        }

        const totalSteps = 2;
        let completed = 0;

        const tasks = [
          { key: "A-realistic", section: "A" as const },
          { key: "B-realistic", section: "B" as const },
        ];

        send({ type: "start", total: totalSteps });

        const results = await Promise.allSettled(
          tasks.map(async (task) => {
            send({ type: "progress", completed, total: totalSteps, current: STEP_LABELS[task.key] });

            const topicText = task.section === "A" ? sectionA.topic : sectionB.topic;
            const corr = await correctExercise({
              section: task.section,
              topic: topicText,
              starterSentence: task.section === "A" ? sectionA.starterSentence : undefined,
              context: task.section === "B" ? sectionB.context : undefined,
              userText: task.section === "A" ? sectionA.text : sectionB.text,
            });

            await markTopicWritten(task.section, topicText);
            completed++;
            send({ type: "done_step", key: task.key, completed, total: totalSteps, label: STEP_LABELS[task.key] });

            return { section: task.section, corr };
          }),
        );

        send({ type: "progress", completed, total: totalSteps, current: "Sauvegarde des résultats…" });

        const corrBySection: Record<string, CorrectionResult> = {};
        let successCount = 0;
        let lastError = "";
        for (const task of tasks) {
          const r = results.find((res) => res.status === "fulfilled" && res.value.section === task.section);
          if (r && r.status === "fulfilled") {
            successCount++;
            corrBySection[task.section] = r.value.corr;
          } else {
            lastError = r && r.status === "rejected" ? String(r.reason) : lastError || `no result for ${task.section}`;
            corrBySection[task.section] = defaultCorrection();
          }
        }

        if (successCount === 0) {
          console.error(`[exercise/submit] All ${results.length} corrections failed. Last error: ${lastError}`);
          send({ type: "error", message: "La correction a échoué. Vérifiez votre clé API et le modèle sélectionné, puis réessayez." });
          return;
        }

        const session = await db.session.create({
          data: {
            userId: user.id,
            type: "practice",
            exercises: {
              create: [
                {
                  section: "A",
                  topic: sectionA.topic,
                  starterSentence: sectionA.starterSentence ?? null,
                  userText: sectionA.text,
                  wordCount: countWords(sectionA.text),
                  durationSec: sectionA.durationSec,
                  corrections: {
                    create: [correctionCreateData("realistic", corrBySection.A)],
                  },
                },
                {
                  section: "B",
                  topic: sectionB.topic,
                  context: sectionB.context ?? null,
                  userText: sectionB.text,
                  wordCount: countWords(sectionB.text),
                  durationSec: sectionB.durationSec,
                  corrections: {
                    create: [correctionCreateData("realistic", corrBySection.B)],
                  },
                },
              ],
            },
          },
          include: { exercises: { include: { corrections: true } } },
        });

        send({ type: "done", data: { sessionId: session.id, corrections: { realistic: corrBySection } } });

        generateSmartMissions(user.id, session.id, corrBySection).catch((e) =>
          console.warn("[exercise/submit] Smart mission generation failed:", e)
        );
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
