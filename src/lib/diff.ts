// ---------------------------------------------------------------------------
// Plain-text normalization + word-level diff used by the glossary review mode
// (dictation: user types what they heard, we compare with the correct phrase).
// Accents are significant (French); case and whitespace are not.
// ---------------------------------------------------------------------------

export function stripMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_~`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string): string[] {
  return stripMarkdown(text).split(" ").filter(Boolean);
}

export interface DiffSegment {
  text: string;
  // "same"   -> correct word, identical
  // "wrong"  -> user's token that does not match the correct phrase
  // "missing"-> correct word the user did not reproduce
  status: "same" | "wrong" | "missing";
}

export interface WordDiff {
  user: DiffSegment[];     // one entry per user token; "missing" tokens carry "" text
  correct: DiffSegment[];  // one entry per correct token; "wrong" tokens carry "" text
  matched: number;
  total: number;
  pct: number;             // 0-100, matched / correct tokens
}

export function diffWords(userText: string, correctText: string): WordDiff {
  const user = tokenize(userText);
  const correct = tokenize(correctText);
  const n = user.length;
  const m = correct.length;

  // LCS table (bottom-up)
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] =
        user[i].toLowerCase() === correct[j].toLowerCase()
          ? dp[i + 1][j + 1] + 1
          : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const userSegs: DiffSegment[] = [];
  const correctSegs: DiffSegment[] = [];
  let matched = 0;
  let i = 0;
  let j = 0;

  while (i < n && j < m) {
    if (user[i].toLowerCase() === correct[j].toLowerCase()) {
      userSegs.push({ text: user[i], status: "same" });
      correctSegs.push({ text: correct[j], status: "same" });
      matched++;
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      userSegs.push({ text: user[i], status: "wrong" });
      correctSegs.push({ text: "", status: "wrong" });
      i++;
    } else {
      userSegs.push({ text: "", status: "missing" });
      correctSegs.push({ text: correct[j], status: "missing" });
      j++;
    }
  }
  while (i < n) {
    userSegs.push({ text: user[i], status: "wrong" });
    correctSegs.push({ text: "", status: "wrong" });
    i++;
  }
  while (j < m) {
    userSegs.push({ text: "", status: "missing" });
    correctSegs.push({ text: correct[j], status: "missing" });
    j++;
  }

  return {
    user: userSegs,
    correct: correctSegs,
    matched,
    total: m,
    pct: m > 0 ? Math.round((matched / m) * 100) : 100,
  };
}
