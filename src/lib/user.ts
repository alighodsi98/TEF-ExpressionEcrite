import { db } from "@/lib/db";

// ---------------------------------------------------------------------------
// Single-user helpers. This app is a personal practice tool, so we always
// operate on the first (only) UserProfile. If none exists, return null and
// let the caller decide whether to create one.
// ---------------------------------------------------------------------------

export async function getCurrentUser() {
  const user = await db.userProfile.findFirst({
    orderBy: { createdAt: "asc" },
  });
  return user;
}

export async function getOrCreateCurrentUser() {
  let user = await db.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    user = await db.userProfile.create({
      data: { name: "Apprenant", targetNclc: 7 },
    });
  }
  return user;
}

// ---------------------------------------------------------------------------
// Word count (French-aware: split on whitespace)
// ---------------------------------------------------------------------------
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  // Handle apostrophes: "l'arbre" counts as one word
  return trimmed.split(/\s+/).filter(Boolean).length;
}
