import { db } from "@/lib/db";
import { grammarTopicLabel, TAG_TO_GRAMMAR_KEY } from "@/lib/topic-bank";
import type { CorrectionResult } from "@/lib/ai";

interface GrammarTopicScore {
  key: string;
  count: number;
  examples: string[];
}

export async function generateSmartMissions(
  userId: string,
  sessionId: string,
  corrections: Record<string, CorrectionResult>
) {
  const user = await db.userProfile.findUnique({ where: { id: userId } });
  if (!user?.smartMissionsEnabled) return [];

  const seen = new Map<string, GrammarTopicScore>();

  // Collect grammarIssues from correction results
  for (const corr of Object.values(corrections)) {
    for (const issue of corr.grammarIssues || []) {
      const existing = seen.get(issue.topic);
      if (existing) {
        existing.count += issue.count;
        existing.examples.push(...issue.examples);
      } else {
        seen.set(issue.topic, {
          key: issue.topic,
          count: issue.count,
          examples: [...issue.examples],
        });
      }
    }

    // Also count tags from level1Errors for granular detection
    for (const err of corr.level1Errors || []) {
      for (const tag of err.tags || []) {
        const mappedKey = TAG_TO_GRAMMAR_KEY[tag];
        if (mappedKey) {
          const existing = seen.get(mappedKey);
          if (existing) {
            existing.count += 0.5;
            if (err.original && !existing.examples.includes(err.original)) {
              existing.examples.push(err.original);
            }
          } else {
            seen.set(mappedKey, {
              key: mappedKey,
              count: 0.5,
              examples: err.original ? [err.original] : [],
            });
          }
        }
      }
    }
  }

  // Filter and rank
  const ranked = [...seen.values()]
    .filter((g) => g.count >= 1)
    .sort((a, b) => b.count - a.count);

  if (ranked.length === 0) return [];

  const topTopics = ranked.slice(0, 2);

  // Delete old pending missions for this session, then create new ones
  await db.smartMission.deleteMany({ where: { sessionId } });

  const missions: Array<{ id: string; topic: string; message: string; stat: string }> = [];
  for (const topic of topTopics) {
    const label = grammarTopicLabel(topic.key);
    const count = Math.round(topic.count);
    const message = `Entraînez-vous sur ${label.labelFr}. Vous avez fait ${count} erreur${count > 1 ? "s" : ""} dans cette séance.`;
    const mission = await db.smartMission.create({
      data: {
        userId,
        sessionId,
        topic: topic.key,
        message,
        stat: `${count} erreur${count > 1 ? "s" : ""}`,
      },
    });
    missions.push(mission);
  }

  return missions;
}
