import { NextRequest } from "next/server";
import { correctExercise, cefrFromNclcLevel } from "@/lib/ai";

/**
 * POST /api/score-validation
 *
 * Calibration endpoint for testing scoring consistency.
 * Accepts a text + section, runs the evaluation 3 times, and returns:
 * - all 3 results (scores, NCLC, CEFR, globalScore)
 * - majority NCLC level
 * - consistency score (how many runs agreed)
 *
 * Body: { text: string, section: "A" | "B", topic: string, starterSentence?: string, context?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, section, topic, starterSentence, context } = body as {
      text: string;
      section: "A" | "B";
      topic: string;
      starterSentence?: string;
      context?: string;
    };

    if (!text || !section || !topic) {
      return Response.json({ error: "Missing required fields: text, section, topic" }, { status: 400 });
    }

    if (text.trim().length < 10) {
      return Response.json({ error: "Text too short (minimum 10 characters)" }, { status: 400 });
    }

    // Run 3 evaluations for consistency check
    const runs = 3;
    const results = await Promise.all(
      Array.from({ length: runs }, () =>
        correctExercise({ section, topic, starterSentence, context, userText: text }),
      ),
    );

    // Analyze consistency
    const nclcCounts = new Map<string, number>();
    for (const r of results) {
      nclcCounts.set(r.nclcLevel, (nclcCounts.get(r.nclcLevel) ?? 0) + 1);
    }
    let majorityNclc = results[0].nclcLevel;
    let maxCount = 0;
    for (const [level, count] of nclcCounts) {
      if (count > maxCount) {
        maxCount = count;
        majorityNclc = level;
      }
    }

    const consistency = maxCount / runs;
    const majorityResult = results.find((r) => r.nclcLevel === majorityNclc) ?? results[0];

    return Response.json({
      summary: {
        majorityNclc,
        majorityCecr: cefrFromNclcLevel(Number(majorityNclc)),
        consistency: `${maxCount}/${runs}`,
        consistencyPct: Math.round(consistency * 100),
        globalScore: majorityResult.globalScore,
      },
      runs: results.map((r, i) => ({
        run: i + 1,
        scores: r.scores,
        total: r.scores.adequation + r.scores.coherence + r.scores.vocabulary + r.scores.grammar,
        nclcLevel: r.nclcLevel,
        cecrLevel: r.cecrLevel,
        globalScore: r.globalScore,
        level1Errors: r.level1Errors.map((e) => ({ original: e.original, correction: e.correction, tags: e.tags })),
      })),
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "Validation failed" },
      { status: 500 },
    );
  }
}
