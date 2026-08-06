import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const SCHEMA_VERSION = 1;
const VALID_CATEGORIES = ["paid", "free", "custom"];

const CATEGORY_KEYS = ["settings", "glossary", "sessions", "models", "topics", "chats"] as const;
type Category = (typeof CATEGORY_KEYS)[number];

function toDate(v: unknown): Date | null {
  if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return new Date(v);
  return null;
}

function asString(v: unknown): string | null {
  if (typeof v === "string") return v;
  if (v == null) return null;
  return String(v);
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function hasId<T extends { id?: string }>(x: T): x is T & { id: string } {
  return typeof x.id === "string" && x.id.length > 0;
}

function parseInclude(v: unknown): Set<Category> {
  const out = new Set<Category>();
  if (v && typeof v === "object") {
    const record = v as Record<string, unknown>;
    for (const c of CATEGORY_KEYS) {
      if (record[c] === true) out.add(c);
    }
  } else if (Array.isArray(v)) {
    for (const c of v) {
      if (CATEGORY_KEYS.includes(c as Category)) out.add(c as Category);
    }
  }
  if (out.size === 0) return new Set(CATEGORY_KEYS);
  return out;
}

interface ImportCounts {
  settings: number;
  glossaryEntries: number;
  sessions: number;
  exercises: number;
  corrections: number;
  smartMissions: number;
  aiModels: number;
  topics: number;
  chatConversations: number;
  chatMessages: number;
  skippedSettingsMerge: number;
}

type Tx = Parameters<Parameters<typeof db.$transaction>[0]>[0];

// POST /api/backup/import — restore a backup (selected categories, replace or merge)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Fichier de sauvegarde invalide." }, { status: 400 });
    }

    const data = (body as { data?: unknown }).data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json(
        { error: "Fichier de sauvegarde invalide : champ « data » manquant." },
        { status: 400 }
      );
    }
    const d = data as Record<string, unknown>;
    const mode = (body as { mode?: unknown }).mode === "merge" ? "merge" : "replace";
    const include = parseInclude((body as { include?: unknown }).include);

    const counts: ImportCounts = {
      settings: 0,
      glossaryEntries: 0,
      sessions: 0,
      exercises: 0,
      corrections: 0,
      smartMissions: 0,
      aiModels: 0,
      topics: 0,
      chatConversations: 0,
      chatMessages: 0,
      skippedSettingsMerge: 0,
    };

    const result = await db.$transaction(async (tx: Tx) => {
      let user = await tx.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
      if (!user) {
        user = await tx.userProfile.create({
          data: { name: "Apprenant", targetNclc: 7, smartMissionsEnabled: true },
        });
      }

      const up = (d.userProfile ?? null) as Record<string, unknown> | null;

      // ----- settings / profile -----
      if (include.has("settings") && up) {
        if (mode === "merge") {
          counts.skippedSettingsMerge = 1;
        } else {
          await tx.userProfile.update({
            where: { id: user.id },
            data: {
              name: asString(up.name)?.trim() || user.name,
              targetNclc: asNumber(up.targetNclc) ?? user.targetNclc,
              placementDone: typeof up.placementDone === "boolean" ? up.placementDone : user.placementDone,
              placementMode: asString(up.placementMode) ?? user.placementMode,
              levelSectionA: asString(up.levelSectionA) ?? user.levelSectionA,
              levelSectionB: asString(up.levelSectionB) ?? user.levelSectionB,
              levelOverallNclc: asString(up.levelOverallNclc) ?? user.levelOverallNclc,
              levelOverallCecr: asString(up.levelOverallCecr) ?? user.levelOverallCecr,
              aiApiKey: asString(up.aiApiKey) ?? user.aiApiKey,
              aiModel: asString(up.aiModel) ?? user.aiModel,
              aiBaseUrl: asString(up.aiBaseUrl) ?? user.aiBaseUrl,
              smartMissionsEnabled:
                typeof up.smartMissionsEnabled === "boolean" ? up.smartMissionsEnabled : user.smartMissionsEnabled,
            },
          });
          counts.settings = 1;
        }
      }

      // ----- glossary -----
      if (include.has("glossary")) {
        const entries = (Array.isArray(d.glossaryEntries) ? d.glossaryEntries : [])
          .map((e) => {
            const eObj = e as Record<string, unknown>;
            return {
              id: mode === "replace" ? (asString(eObj?.id) ?? undefined) : undefined,
              userId: user.id,
              section: asString(eObj?.section) === "B" ? "B" : "A",
              phrase: asString(eObj?.phrase)?.trim() ?? "",
              context: asString(eObj?.context),
              createdAt: toDate(eObj?.createdAt) ?? new Date(),
            };
          })
          .filter((e) => e.phrase);
        if (entries.length) {
          if (mode === "replace") {
            await tx.glossaryEntry.deleteMany({ where: { userId: user.id } });
            await tx.glossaryEntry.createMany({ data: entries });
          } else {
            await tx.glossaryEntry.createMany({ data: entries });
          }
          counts.glossaryEntries = entries.length;
        }
      }

      // ----- sessions (+ exercises, corrections, smart missions) -----
      if (include.has("sessions")) {
        if (mode === "replace") {
          await tx.session.deleteMany({ where: { userId: user.id } });
        }

        const sessionIdMap = new Map<string, string>();
        const sessions = (Array.isArray(d.sessions) ? d.sessions : [])
          .map((s) => {
            const sObj = s as Record<string, unknown>;
            return {
              id: asString(sObj?.id) ?? undefined,
              userId: user.id,
              type: asString(sObj?.type) === "placement" ? "placement" : "practice",
              createdAt: toDate(sObj?.createdAt) ?? new Date(),
            };
          })
          .filter(hasId);

        for (const s of sessions) {
          const created =
            mode === "replace"
              ? await tx.session.create({ data: { ...s, id: s.id } })
              : await tx.session.create({ data: { id: undefined, userId: s.userId, type: s.type, createdAt: s.createdAt } });
          sessionIdMap.set(s.id, created.id);
        }
        counts.sessions = sessions.length;

        const exerciseIdMap = new Map<string, string>();
        const exercises = (Array.isArray(d.exercises) ? d.exercises : [])
          .map((x) => {
            const xObj = x as Record<string, unknown>;
            return {
              id: asString(xObj?.id) ?? undefined,
              sessionId: asString(xObj?.sessionId) ?? "",
              section: asString(xObj?.section) === "B" ? "B" : "A",
              topic: asString(xObj?.topic)?.trim() ?? "",
              starterSentence: asString(xObj?.starterSentence),
              context: asString(xObj?.context),
              userText: asString(xObj?.userText) ?? "",
              wordCount: asNumber(xObj?.wordCount) ?? 0,
              durationSec: asNumber(xObj?.durationSec) ?? 0,
              submittedAt: toDate(xObj?.submittedAt) ?? new Date(),
            };
          })
          .filter((x) => hasId(x) && sessionIdMap.has(x.sessionId));

        for (const x of exercises) {
          const created = await tx.exercise.create({
            data: {
              ...x,
              id: mode === "replace" ? x.id : undefined,
              sessionId: sessionIdMap.get(x.sessionId)!,
            },
          });
          exerciseIdMap.set(x.id!, created.id);
        }
        counts.exercises = exercises.length;

        const corrections = (Array.isArray(d.corrections) ? d.corrections : [])
          .map((c) => {
            const cObj = c as Record<string, unknown>;
            return {
              id: asString(cObj?.id) ?? undefined,
              exerciseId: asString(cObj?.exerciseId) ?? "",
              mode: asString(cObj?.mode) ?? "realistic",
              level1Errors: asString(cObj?.level1Errors) ?? "[]",
              level2Suggestions: asString(cObj?.level2Suggestions) ?? "[]",
              level3Advanced: asString(cObj?.level3Advanced) ?? "[]",
              level4Rewrite: asString(cObj?.level4Rewrite) ?? "",
              scores: asString(cObj?.scores) ?? "{}",
              nclcLevel: asString(cObj?.nclcLevel) ?? "",
              cecrLevel: asString(cObj?.cecrLevel) ?? "",
              globalScore: asNumber(cObj?.globalScore) ?? 0,
              grammarIssues: asString(cObj?.grammarIssues) ?? "[]",
              vocabularyIssues: asString(cObj?.vocabularyIssues) ?? "[]",
              feedback: asString(cObj?.feedback) ?? "",
              createdAt: toDate(cObj?.createdAt) ?? new Date(),
            };
          })
          .filter((c) => hasId(c) && exerciseIdMap.has(c.exerciseId));

        for (const c of corrections) {
          await tx.correction.create({
            data: {
              ...c,
              id: mode === "replace" ? c.id : undefined,
              exerciseId: exerciseIdMap.get(c.exerciseId)!,
            },
          });
        }
        counts.corrections = corrections.length;

        const smartMissions = (Array.isArray(d.smartMissions) ? d.smartMissions : [])
          .map((s) => {
            const sObj = s as Record<string, unknown>;
            return {
              id: asString(sObj?.id) ?? undefined,
              userId: user.id,
              sessionId: asString(sObj?.sessionId) ?? "",
              topic: asString(sObj?.topic) ?? "",
              message: asString(sObj?.message) ?? "",
              stat: asString(sObj?.stat) ?? "",
              createdAt: toDate(sObj?.createdAt) ?? new Date(),
              accepted: Boolean(sObj?.accepted),
              dismissed: Boolean(sObj?.dismissed),
            };
          })
          .filter((s) => hasId(s) && sessionIdMap.has(s.sessionId));

        for (const s of smartMissions) {
          await tx.smartMission.create({
            data: {
              ...s,
              id: mode === "replace" ? s.id : undefined,
              sessionId: sessionIdMap.get(s.sessionId)!,
            },
          });
        }
        counts.smartMissions = smartMissions.length;
      }

      // ----- AI models -----
      if (include.has("models")) {
        if (mode === "replace") {
          await tx.aiModel.deleteMany();
        }
        const existingModelIds = new Set(
          (await tx.aiModel.findMany({ select: { modelId: true } })).map((m) => m.modelId)
        );
        const models = (Array.isArray(d.aiModels) ? d.aiModels : [])
          .map((m) => {
            const mObj = m as Record<string, unknown>;
            const modelId = asString(mObj?.modelId)?.trim() ?? "";
            const category = asString(mObj?.category) ?? "custom";
            return {
              id: mode === "replace" ? (asString(mObj?.id) ?? undefined) : undefined,
              modelId,
              name: asString(mObj?.name)?.trim() || modelId,
              category: VALID_CATEGORIES.includes(category) ? category : "custom",
              sortOrder: asNumber(mObj?.sortOrder) ?? 0,
              createdAt: toDate(mObj?.createdAt) ?? new Date(),
            };
          })
          .filter((m) => m.modelId && (mode === "replace" || !existingModelIds.has(m.modelId)));

        if (models.length) {
          await tx.aiModel.createMany({ data: models });
        }
        counts.aiModels = models.length;
      }

      // ----- topic bank -----
      if (include.has("topics")) {
        if (mode === "replace") {
          await tx.topicBank.deleteMany();
        }
        const topics = (Array.isArray(d.topics) ? d.topics : [])
          .map((t) => {
            const tObj = t as Record<string, unknown>;
            return {
              id: mode === "replace" ? (asString(tObj?.id) ?? undefined) : undefined,
              section: asString(tObj?.section) === "B" ? "B" : "A",
              topic: asString(tObj?.topic)?.trim() ?? "",
              starterSentence: asString(tObj?.starterSentence),
              context: asString(tObj?.context),
              category: asString(tObj?.category),
              isDynamic: Boolean(tObj?.isDynamic),
              written: Boolean(tObj?.written),
              createdAt: toDate(tObj?.createdAt) ?? new Date(),
            };
          })
          .filter((t) => t.topic);

        if (topics.length) {
          await tx.topicBank.createMany({ data: topics });
        }
        counts.topics = topics.length;
      }

      // ----- chat conversations + messages -----
      if (include.has("chats")) {
        if (mode === "replace") {
          await tx.chatConversation.deleteMany({ where: { userId: user.id } });
        }

        const conversationIdMap = new Map<string, string>();
        const conversations = (Array.isArray(d.chatConversations) ? d.chatConversations : [])
          .map((c) => {
            const cObj = c as Record<string, unknown>;
            return {
              id: asString(cObj?.id) ?? undefined,
              userId: user.id,
              title: asString(cObj?.title) ?? "Conversation",
              createdAt: toDate(cObj?.createdAt) ?? new Date(),
              updatedAt: toDate(cObj?.updatedAt) ?? new Date(),
            };
          })
          .filter(hasId);

        for (const c of conversations) {
          const created = await tx.chatConversation.create({
            data: {
              ...c,
              id: mode === "replace" ? c.id : undefined,
              userId: user.id,
            },
          });
          conversationIdMap.set(c.id, created.id);
        }
        counts.chatConversations = conversations.length;

        const messages = (Array.isArray(d.chatMessages) ? d.chatMessages : [])
          .map((m) => {
            const mObj = m as Record<string, unknown>;
            return {
              id: asString(mObj?.id) ?? undefined,
              conversationId: asString(mObj?.conversationId) ?? "",
              role: asString(mObj?.role) === "assistant" ? "assistant" : "user",
              content: asString(mObj?.content) ?? "",
              createdAt: toDate(mObj?.createdAt) ?? new Date(),
            };
          })
          .filter((m) => hasId(m) && conversationIdMap.has(m.conversationId));

        for (const m of messages) {
          await tx.chatMessage.create({
            data: {
              ...m,
              id: mode === "replace" ? m.id : undefined,
              conversationId: conversationIdMap.get(m.conversationId)!,
            },
          });
        }
        counts.chatMessages = messages.length;
      }

      return { counts };
    });

    return NextResponse.json({
      ok: true,
      schemaVersion: SCHEMA_VERSION,
      mode,
      counts: result.counts,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur lors de l'import" },
      { status: 500 }
    );
  }
}
