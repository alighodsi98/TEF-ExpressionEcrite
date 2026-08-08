import { db } from "@/lib/db";
import { countWords } from "@/lib/user";

// ---------------------------------------------------------------------------
// OpenAI-compatible LLM client (reads config from database)
// Supports OpenRouter (default) or any custom endpoint such as a local
// 9router proxy (http://localhost:20128/v1).
// ---------------------------------------------------------------------------
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemini-2.5-flash";

// Free models tried in round-robin order when the user's model fails
const FREE_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-31b-it:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
] as const;

// Turn a user-supplied base URL into a full chat/completions endpoint.
// Accepts values like:
//   ""                             -> OpenRouter default
//   "http://localhost:20128/v1"    -> ".../v1/chat/completions"
//   "http://localhost:20128"       -> ".../v1/chat/completions"
//   ".../v1/chat/completions"      -> used as-is
export function resolveEndpoint(baseUrl?: string | null): string {
  const raw = (baseUrl ?? "").trim();
  if (!raw) return OPENROUTER_API_URL;

  let url = raw.replace(/\/+$/, "");
  if (/\/chat\/completions$/i.test(url)) return url;
  if (/\/v\d+$/i.test(url)) return `${url}/chat/completions`;
  return `${url}/v1/chat/completions`;
}

// A custom base URL means "not OpenRouter" — its model IDs differ, so the
// OpenRouter free-model fallback list must be skipped.
export function isCustomEndpoint(baseUrl?: string | null): boolean {
  return !!(baseUrl ?? "").trim();
}

async function getAIConfig(): Promise<{ apiKey: string; model: string; baseUrl: string }> {
  const user = await db.userProfile.findFirst({ orderBy: { createdAt: "asc" } });
  const apiKey = user?.aiApiKey || process.env.OPENROUTER_API_KEY || "";
  const model = user?.aiModel || DEFAULT_MODEL;
  const baseUrl = user?.aiBaseUrl || process.env.AI_BASE_URL || "";
  return { apiKey, model, baseUrl };
}

const LLM_TIMEOUT_MS = 180_000; // 180 seconds per request

// Reads the assistant content from an LLM response, transparently handling
// both plain JSON and Server-Sent Events (streaming) responses. Some local
// OpenAI-compatible proxies (e.g. 9router) stream by default; `response.json()`
// then throws on the SSE body, which wrongly marks the model as unavailable.
async function readResponseContent(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream")) {
    return readSSEContent(response);
  }
  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

async function readSSEContent(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") continue;
      try {
        const json = JSON.parse(payload);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string") {
          content += delta;
        } else if (typeof json?.choices?.[0]?.message?.content === "string") {
          content = json.choices[0].message.content;
        }
      } catch {
        // Ignore malformed / keep-alive chunks.
      }
    }
  }
  return content;
}

async function fetchLLM(
  apiKey: string,
  model: string,
  messages: { role: string; content: string }[],
  baseUrl?: string | null,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  const endpoint = resolveEndpoint(baseUrl);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream: false, temperature: 0, max_tokens: 8192 }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown");
      throw new Error(`AI API error ${response.status}: ${errText}`);
    }

    const content = await readResponseContent(response);
    if (!content) throw new Error("Empty response from model");
    return content;
  } finally {
    clearTimeout(timer);
  }
}

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const { apiKey, model, baseUrl } = await getAIConfig();
  if (!apiKey && !isCustomEndpoint(baseUrl)) {
    throw new Error("Clé API non configurée. Veuillez entrer votre clé API dans les paramètres.");
  }

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ];

  // Try user's chosen model first (with 1 retry)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      return await fetchLLM(apiKey, model, messages, baseUrl);
    } catch (primaryErr) {
      console.warn(`[callLLM] Primary model "${model}" attempt ${attempt + 1} failed: ${primaryErr instanceof Error ? primaryErr.message : primaryErr}`);
    }
  }

  // The OpenRouter free-model fallback only applies to OpenRouter itself.
  if (!isCustomEndpoint(baseUrl)) {
    // Round-robin through free models (each with 1 retry)
    for (const freeModel of FREE_MODELS) {
      if (freeModel === model) continue;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const result = await fetchLLM(apiKey, freeModel, messages, baseUrl);
          console.log(`[callLLM] Fallback model "${freeModel}" succeeded`);
          return result;
        } catch (err) {
          console.warn(`[callLLM] Free model "${freeModel}" attempt ${attempt + 1} failed: ${err instanceof Error ? err.message : err}`);
        }
      }
    }
  }

  throw new Error("Tous les modèles ont échoué. Veuillez réessayer plus tard.");
}

// Re-export for chat route
export { fetchLLM, FREE_MODELS, callLLM };

// ---------------------------------------------------------------------------
// Model health check
// ---------------------------------------------------------------------------
const HEALTH_CHECK_TIMEOUT_MS = 20_000;

// Sends a quick probe to a single model. The model is considered available
// if it returns any non-empty response. Returns the availability plus a
// human-readable reason when it fails, so the UI can surface the actual
// problem instead of a generic "unavailable".
export async function checkModelHealth(
  apiKey: string,
  model: string,
  baseUrl?: string | null,
): Promise<{ available: boolean; reason?: string; errorType?: string }> {
  if (!model) return { available: false, reason: "Aucun modèle configuré.", errorType: "no_model" };
  if (!apiKey && !isCustomEndpoint(baseUrl))
    return { available: false, reason: "Clé API non configurée.", errorType: "no_key" };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(resolveEndpoint(baseUrl), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 10,
        temperature: 0,
        stream: false,
        messages: [
          {
            role: "user",
            content:
              'If you receive this message, respond only with "hi". Nothing more. No punctuation, no explanation.',
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "unknown");
      let errorType = "server_error";
      if (response.status === 401 || response.status === 403) errorType = "auth_error";
      else if (response.status === 429) errorType = "rate_limit";
      else if (response.status === 402) errorType = "insufficient_quota";
      else if (response.status >= 500) errorType = "server_error";
      return { available: false, reason: `Erreur HTTP ${response.status}: ${errText.slice(0, 200)}`, errorType };
    }

    const content: string = await readResponseContent(response);
    const trimmed = content.trim();
    if (trimmed.length > 0) return { available: true };
    return {
      available: false,
      reason: "Réponse vide du modèle.",
      errorType: "empty_response",
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[checkModelHealth] model "${model}" failed: ${message}`);
    let errorType = "unknown";
    if (err instanceof DOMException && err.name === "AbortError") errorType = "timeout";
    else if (message.includes("ENOTFOUND") || message.includes("ECONNREFUSED") || message.includes("fetch")) errorType = "network_error";
    return { available: false, reason: message, errorType };
  } finally {
    clearTimeout(timer);
  }
}

function stripJSONComments(text: string): string {
  // Remove line comments (// ...) and block comments (/* ... */).
  // Must not strip // inside string literals. We do a simple state-machine
  // pass that tracks whether we are inside a JSON string.
  let result = "";
  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    // String literal — copy verbatim until closing quote
    if (ch === '"') {
      result += ch;
      i++;
      while (i < text.length) {
        const s = text[i];
        result += s;
        i++;
        if (s === "\\") { i++; if (i < text.length) { result += text[i]; i++; } }
        else if (s === '"') break;
      }
      continue;
    }

    // Line comment
    if (ch === "/" && text[i + 1] === "/") {
      while (i < text.length && text[i] !== "\n") i++;
      continue;
    }

    // Block comment
    if (ch === "/" && text[i + 1] === "*") {
      i += 2;
      while (i < text.length && !(text[i] === "*" && text[i + 1] === "/")) i++;
      i += 2; // skip */
      continue;
    }

    result += ch;
    i++;
  }
  return result;
}

function extractJSON<T = unknown>(raw: string): T {
  // Strip BOM, zero-width and other invisible characters that some
  // proxies/models inject and that break JSON.parse.
  let text = raw
    .replace(/﻿/g, "")
    .replace(/[​‍﻿⁠]/g, "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  // Strip JSONC-style comments (// ... and /* ... */) that free models emit
  text = stripJSONComments(text);

  // Strategy 0: Delimiter markers — our prompts ask the model to wrap JSON
  // in <<<JSON>>> ... >>>. Extract content between them.
  const delim = text.match(/<<<JSON>>>\s*([\s\S]*?)\s*>>>/i);
  if (delim) {
    const inside = stripJSONComments(delim[1].trim());
    try {
      return JSON.parse(inside) as T;
    } catch { /* continue */ }
  }

  // Strategy 0b: Some models echo "Here is the JSON:" then the object.
  // Try to find the first { or [ that starts a balanced block.
  const firstOpen = text.search(/[{[]/);
  if (firstOpen >= 0) {
    const candidate = text.slice(firstOpen);
    try {
      return JSON.parse(candidate) as T;
    } catch { /* continue */ }
  }

  // Strategy 3: Direct parse
  try {
    return JSON.parse(text) as T;
  } catch { /* continue */ }

  // Strategy 4: Trim to last } or ] and try
  const lastBrace = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (lastBrace > 0) {
    try {
      return JSON.parse(text.slice(0, lastBrace + 1)) as T;
    } catch { /* continue */ }
  }

  // Strategy 5: Try to find the outermost { ... } or [ ... ] by counting braces
  for (const open of ["{", "["]) {
    const close = open === "{" ? "}" : "]";
    const start = text.indexOf(open);
    if (start < 0) continue;
    let depth = 0;
    let inStr = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (c === '"' && (i === 0 || text[i - 1] !== "\\")) inStr = !inStr;
      if (inStr) continue;
      if (c === open) depth++;
      if (c === close) depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        try {
          return JSON.parse(candidate) as T;
        } catch { /* continue inner loop */ }
        break;
      }
    }
  }

  // Strategy 6: Try to extract JSON from lines that look like JSON
  const lines = raw.split("\n");
  const jsonLines: string[] = [];
  let collecting = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) collecting = true;
    if (collecting) jsonLines.push(line);
    if ((trimmed.endsWith("}") || trimmed.endsWith("]")) && collecting) {
      try {
        const joined = stripJSONComments(jsonLines.join("\n"));
        return JSON.parse(joined) as T;
      } catch { /* continue */ }
      collecting = false;
      jsonLines.length = 0;
    }
  }

  // Strategy 7: Aggressive — find all occurrences of { and try each one
  let bestMatch: string | null = null;
  let bestLength = 0;
  const allStarts: number[] = [];
  let idx = -1;
  while ((idx = text.indexOf("{", idx + 1)) !== -1) allStarts.push(idx);

  for (const start of allStarts) {
    let depth = 0;
    let inStr = false;
    for (let i = start; i < text.length; i++) {
      const c = text[i];
      if (c === '"' && (i === 0 || text[i - 1] !== "\\")) inStr = !inStr;
      if (inStr) continue;
      if (c === "{") depth++;
      if (c === "}") depth--;
      if (depth === 0) {
        const candidate = text.slice(start, i + 1);
        if (candidate.length > bestLength) {
          bestMatch = candidate;
          bestLength = candidate.length;
        }
        break;
      }
    }
  }
  if (bestMatch) {
    try {
      return JSON.parse(bestMatch) as T;
    } catch { /* continue */ }
  }

  // Strategy 8: Strip trailing commas (a common model mistake) and retry the
  // whole-string parse. Safe-ish because we only remove a comma that is
  // immediately followed by optional whitespace and a closing brace/bracket.
  try {
    const noTrailing = text.replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(noTrailing) as T;
  } catch { /* continue */ }

  // Strategy 9: Strip trailing commas + re-strip comments (comments may have
  // survived inside code-fence extraction in Strategy 1)
  try {
    const cleaned = stripJSONComments(text).replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(cleaned) as T;
  } catch { /* continue */ }

  console.error(`[extractJSON] All strategies failed. First 500 chars of raw response:\n${raw.slice(0, 500)}`);
  throw new Error("Failed to parse JSON from LLM response");
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface SectionATopic {
  topic: string;
  starterSentence: string;
  category: string;
}

export interface SectionBTopic {
  topic: string;
  context: string;
  category: string;
}

export interface GeneratedTopics {
  sectionA: SectionATopic;
  sectionB: SectionBTopic;
}

// ---------------------------------------------------------------------------
// 0) Utilities
// ---------------------------------------------------------------------------

function mean(...xs: number[]): number {
  const v = xs.filter((n) => typeof n === "number" && !isNaN(n));
  if (v.length === 0) return 0;
  return v.reduce((a, b) => a + b, 0) / v.length;
}

// 4 official TEF Canada Expression Écrite scoring criteria (each 0-45, total 0-180)
export interface TefScores {
  adequation: number;       // ADÉQUATION À LA CONSIGNE (0-45)
  coherence: number;        // COHÉRENCE ET COHÉSION (0-45)
  vocabulary: number;       // MAÎTRISE DU VOCABULAIRE (0-45)
  grammar: number;          // MAÎTRISE DE LA GRAMMAIRE (0-45)
}

// ---------------------------------------------------------------------------
// Official TEF Canada — NCLC level derivation (score → level)
// ---------------------------------------------------------------------------

/**
 * Official TEF Canada — NCLC level from total score (0-180).
 * Source: "Correspondance Score TEF – Niveau NCLC" (IRCC / ministère canadien).
 * Total = sum of 4 criteria (each 0-45). NCLC level derived deterministically.
 */
export function nclcFromTotal(total: number): number {
  if (total >= 163) return 12;  // 163-180
  if (total >= 148) return 11;  // 148-162
  if (total >= 135) return 10;  // 135-147
  if (total >= 120) return 9;   // 120-134
  if (total >= 105) return 8;   // 105-119
  if (total >= 90)  return 7;   // 90-104
  if (total >= 75)  return 6;   // 75-89
  if (total >= 60)  return 5;   // 60-74
  if (total >= 45)  return 4;   // 45-59
  if (total >= 30)  return 3;   // 30-44
  if (total >= 15)  return 2;   // 15-29
  return 1;                      // 0-14
}

/**
 * NCLC level → CEFR mapping (standard IRCC correspondence).
 */
export function cefrFromNclcLevel(nclc: number): string {
  if (nclc <= 2) return "A1";
  if (nclc <= 4) return "A2";
  if (nclc <= 6) return "B1";
  if (nclc <= 8) return "B2";
  if (nclc <= 10) return "C1";
  return "C2";
}

/**
 * NCLC bands on the 0-699 TEF scale (for globalScore display).
 * Source: "Correspondance Score TEF – Niveau NCLC" (IRCC, since 11/12/2023).
 */
export const NCLC_TEF_BANDS: Record<number, [number, number]> = {
  1: [0, 89],
  2: [90, 178],
  3: [179, 267],
  4: [268, 329],
  5: [330, 378],
  6: [379, 427],
  7: [428, 471],
  8: [472, 511],
  9: [512, 557],
  10: [558, 591],
  11: [592, 641],
  12: [642, 699],
};

/**
 * Deterministic global TEF score (0-699): places the score inside the official
 * NCLC band, positioned by the average of the 4 criteria within that band.
 */
export function computeTefScore(nclcLevel: number, scores: TefScores): number {
  const lvl = Math.min(12, Math.max(1, nclcLevel));
  const [min, max] = NCLC_TEF_BANDS[lvl] ?? NCLC_TEF_BANDS[1];
  const avg = mean(scores.adequation, scores.coherence, scores.vocabulary, scores.grammar); // 0-45
  const pct = Math.max(0, Math.min(1, avg / 45)); // 0-1
  const span = max - min;
  return Math.round(min + span * pct);
}

export interface Level1Error {
  type: string;          // spelling | conjugation | agreement | punctuation | article | preposition | other
  tags: string[];        // linguistic tags e.g. ["Conjugaison","Orthographe"], ["Accord de genre","Orthographe"]
  original: string;
  correction: string;
  explanation: string;
}

export interface Level2Suggestion {
  original: string;
  suggestion: string;
  reason: string;
}

export interface Level3Advanced {
  original: string;
  improved: string;
  explanation: string;
}

export interface GrammarIssue {
  topic: string;         // grammar topic key
  topicLabel: string;    // human readable (French)
  count: number;
  examples: string[];
}

export interface VocabularyIssue {
  word: string;
  issue: string;
  context: string;
}

export interface CorrectionResult {
  level1Errors: Level1Error[];
  level2Suggestions: Level2Suggestion[];
  level3Advanced: Level3Advanced[];
  level4Rewrite: string;
  scores: TefScores;
  nclcLevel: string;
  cecrLevel: string;
  globalScore: number;        // TEF global score 0-699
  grammarIssues: GrammarIssue[];
  vocabularyIssues: VocabularyIssue[];
  feedback: string;
}

export interface PlacementResult {
  levelSectionA: string;   // NCLC e.g. "5"
  levelSectionB: string;
  levelOverallNclc: string;
  levelOverallCecr: string;
  summarySectionA: string;
  summarySectionB: string;
  grammarIssues: GrammarIssue[];
  vocabularyIssues: VocabularyIssue[];
  sectionACorrection: CorrectionResult;
  sectionBCorrection: CorrectionResult;
}


// ---------------------------------------------------------------------------
// 1) Topic generation
// ---------------------------------------------------------------------------
export async function generateTopics(
  opts: { sectionAOnly?: boolean; sectionBOnly?: boolean; category?: string } = {}
): Promise<GeneratedTopics> {
  const system = `CRITICAL FORMAT RULE: Your ENTIRE response must be EXACTLY one JSON object. Start with <<<JSON>>> then the JSON then >>>. No text, no markdown fences, no commentary, no explanation before or after. Failure to follow this format will cause an error.

You are an expert TEF Canada Expression Écrite examiner. You produce original exam-style writing prompts in French.`;

  const parts: string[] = [];
  parts.push("Generate fresh TEF Canada writing prompts.");

  if (!opts.sectionBOnly) {
    parts.push(`SECTION A (fait divers / news story):
- The candidate must continue a given opening sentence into a news report (min 80 words, 25 min).
- The opening sentence should describe an unusual, surprising or newsworthy event.
- The candidate is expected to use past tenses (imparfait, passé composé, plus-que-parfait), conditionnel, voix passive, discours indirect, news vocabulary and time connectors.
- Register: journalistic, objective, informative tone (fait divers style).
- Pick a varied, original topic (avoid clichés). Provide a realistic but slightly surprising starter sentence in French.`);
  }
  if (!opts.sectionAOnly) {
    parts.push(`SECTION B (argumentation / point de vue justifié):
- The candidate must express and justify a point of view on a debatable statement (min 200 words, 35 min): agree or disagree, with 3 arguments (pro or con) each supported by a concrete example / study / evidence, plus a conclusion.
- IMPORTANT: the letter format is NOT required. The official TEF Canada instructions say the argumentation does NOT have to be written as a letter ("il n'est pas du tout obligatoire de rédiger son argumentation sous forme de lettre"). Do NOT impose a letter format, letterhead, or "letter to the editor" framing.
- Choose a debatable topic in education, health, politics, society, family, sports or environment.
- Register: clear, structured, persuasive but measured; appropriate for a formal written argumentation (not necessarily a letter).
- Provide a clear situational context: a statement or opinion the candidate must react to (e.g. an article, an editorial, a public debate).${opts.category ? ` The category MUST be: ${opts.category}.` : ""}`);
  }

  parts.push(`<<<JSON>>>
{
  ${!opts.sectionBOnly ? `"sectionA": { "topic": string, "starterSentence": string, "category": string },` : ""}
  ${!opts.sectionAOnly ? `"sectionB": { "topic": string, "context": string, "category": string }` : ""}
}
>>>
All text values in French. Do not include any other keys.`);

  const raw = await callLLM(system, parts.join("\n\n"));
  const parsed = extractJSON<GeneratedTopics>(raw);
  return parsed;
}

// ---------------------------------------------------------------------------
// 2) Four-level correction + scoring + analytics
// ---------------------------------------------------------------------------
export async function correctExercise(params: {
  section: "A" | "B";
  topic: string;
  starterSentence?: string;
  context?: string;
  userText: string;
}): Promise<CorrectionResult> {
  const { section, topic, userText } = params;

  const sectionDesc =
    section === "A"
      ? `SECTION A — Fait divers (news story). The candidate continued a starter sentence into a news report (min 80 words). Expected: past tenses (imparfait, passé composé, plus-que-parfait), conditionnel, voix passive, discours indirect, news vocabulary, time connectors. Register: journalistic, objective, informative tone.`
      : `SECTION B — Argumentation (point de vue justifié). The candidate must express and justify a point of view on a debatable statement (min 200 words): agree or disagree, with arguments each supported by concrete examples / evidence, and a conclusion. IMPORTANT: the letter format is NOT required — the official TEF Canada instructions state the argumentation does NOT have to be written as a letter ("il n'est pas du tout obligatoire de rédiger son argumentation sous forme de lettre"). Do NOT penalize a candidate for not using a letter format, letterhead, or "letter to the editor" framing. Register: clear, structured, persuasive but measured.`;

  const system = `CRITICAL FORMAT RULE: Your ENTIRE response must be EXACTLY one JSON object. Start your response with <<<JSON>>> then the JSON then >>>. No text, no markdown fences, no commentary, no explanation before or after. Failure to follow this format will cause an error.

You are a senior TEF Canada Expression Écrite examiner and French language coach. You correct candidate writing with pedagogical depth.

MODE ÉVALUATION : RÉALISTE (grille officielle). Appliquez fidèlement la grille officielle TEF Canada (4 critères officiels). Listez TOUTES les erreurs du candidat de manière EXHAUSTIVE — ne manquez aucune faute. Soyez minutieux et complet dans l'identification des erreurs (niveau 1).

TEF CANADA — EXPRESSION ÉCRITE : grille officielle d'évaluation
The TEF Canada written expression is graded on exactly FOUR official areas (CCIP / Chambre de Commerce et d'Industrie de Paris grid; each area 0-45 points). Score each area HONESTLY on the 0-45 scale:
  1. PERTINENCE DES INFORMATIONS TRANSMISES (0-45) — adéquation avec le sujet : respect des consignes (longueur, genre textuel, registre), informations nouvelles et pertinentes par rapport au sujet.
  2. QUALITÉ DES INFORMATIONS / DES ARGUMENTS (0-45) — développement, détails, illustrations, exemples concrets (Section A : qualité des informations ; Section B : qualité des arguments).
  3. COHÉRENCE INTERNE, COHÉSION DU TEXTE ET DE LA PHRASE, QUALITÉ DES PHRASES ET DU VOCABULAIRE (0-45) — structure, enchaînement logique, connecteurs, progression des idées, variété, correction, précision et adéquation du vocabulaire avec le sujet.
  4. ORTHOGRAPHE ET PONCTUATION (0-45) — maîtrise de l'orthographe lexicale et grammaticale, de la ponctuation, et de la grammaire (syntaxe, temps, modes, conjugaison, accords).

SCORING ANCHORS — USE THESE CONCRETE EXAMPLES TO CALIBRATE:

Score 10-15/45 (faible — frequent errors, limited mastery):
  Example text: "Le hier un homme a sauver des gens du magasin. Le feu était grande. Les pompiers sont venue et ont éteint le feu. Les gens sont blessé."
  → Only passé composé, no connectors, basic vocabulary, many spelling/grammar errors, no paragraph structure.

Score 20-25/45 (moyen — some strengths but significant weaknesses):
  Example text: "Hier matin, un incendie s'est déclaré dans un centre commercial. Un pompier retraité a sauvé plusieurs personnes. Les pompiers sont arrivés et ont éteint le feu. Les blessés ont été transportés à l'hôpital."
  → Correct basic structure, some connectors, adequate vocabulary but limited variety, 3-5 errors, no complex grammar.

Score 30-35/45 (bon — competent with minor weaknesses):
  Example text: "Un employé d'un centre commercial a sauvé la vie de plusieurs personnes lors d'un incendie survenu hier matin dans le quatrième arrondissement de Paris. Alerté par le système d'alarme, un pompier retraité a agi rapidement pour évacuer les clients piégés. Les sapeurs-pompiers, intervenus après l'alerte, ont maîtrisé les flammes en une heure. Aucun décès n'est à déplorer, mais plusieurs blessés hospitalisés."
  → Good structure, appropriate connectors (lorsque, alerté par, intervenus après), varied vocabulary, 1-2 minor errors, mostly correct grammar.

Score 38-45/45 (excellent — near-native mastery):
  Example text: "Un employé d'un centre commercial du quatrième arrondissement de Paris a sauvé la vie de plusieurs personnes lors d'un incendie déclaré hier matin. Un ancien pompier, présent sur les lieux, a immédiatement entrepris l'évacuation des clients pris au piège, tandis que les sapeurs-pompiers, alertés par le système d'alarme, se rendaient sur place. Après une heure d'intervention, les flammes ont été maîtrisées. Les blessés, dont certains dans un état critique, ont été transportés vers les hôpitaux avoisinants. La Préfecture de Police a ouvert une enquête pour déterminer les causes de l'incendie."
  → Rich vocabulary (déclaré, pris au piège, maîtrisées, avoisinants), complex syntax (tandis que, dont), passive voice, precise register, 0-1 minor errors.

SECTION B ANCHORS (argumentation — use these to calibrate Section B scores):

Score 10-15/45 (faible — frequent errors, limited mastery):
  Example text: "Je suis d'accord avec vous. Le tabac est dangereux. Il faut l'interdire. Beaucoup de gens sont malade. Les jeunes commence à fumer trop tôt. C'est pas bien."
  → Simple sentences, no connectors, no developed arguments, basic vocabulary, several errors, no structure.

Score 20-25/45 (moyen — some strengths but significant weaknesses):
  Example text: "Je suis d'accord avec l'article. Le tabac est très dangereux pour la santé. Il faut l'interdire parce que beaucoup de personnes meurent chaque année. Les jeunes commencent à fumer de plus en plus tôt. Le gouvernement devrait prendre des mesures. Par exemple, il pourrait augmenter les prix."
  → Clear opinion, some arguments, basic connectors (parce que, par exemple), adequate vocabulary but limited variety, 3-5 errors, no complex grammar.

Score 30-35/45 (bon — competent with minor weaknesses):
  Example text: "Je partage entièrement l'opinion exprimée dans votre article : le tabac représente un danger majeur pour la santé publique. En effet, selon l'Organisation mondiale de la santé, le tabagisme provoque plusieurs millions de décès chaque année dans le monde. De plus, la prévention auprès des jeunes reste insuffisante, malgré les campagnes de sensibilisation. Il me semble donc indispensable de renforcer les mesures d'interdiction, tout en développant l'accompagnement des fumeurs souhaitant arrêter."
  → Good structure, appropriate connectors (en effet, de plus, donc), developed arguments with evidence, varied vocabulary, 1-2 minor errors.

Score 38-45/45 (excellent — near-native mastery):
  Example text: "L'article paru dans votre journal soulève une question essentielle : celle de la place du tabac dans notre société. Si je partage le constat alarmant des dangers du tabagisme, je pense toutefois qu'une interdiction pure et simple ne saurait suffire. En effet, l'expérience de nombreux pays montre que la répression, sans politique d'accompagnement, conduit souvent à un marché parallèle. Il conviendrait plutôt de combiner prévention précoce, soutien au sevrage et taxation progressive, comme l'ont démontré les études menées au Canada. C'est à cette condition que nous pourrons réellement réduire le tabagisme, sans laisser personne de côté."
  → Rich vocabulary (constat, sevrage, taxation progressive), complex syntax (si... je pense que, sans politique d'accompagnement), nuanced argumentation, precise register, 0-1 minor errors.

CRITICAL CALIBRATION RULES:
- A text with 5+ errors is typically NCLC 5-6 at best.
- A text with 3-4 errors is typically NCLC 6-7 at best.
- A text with no complex syntax (no subordinate clauses, no passive voice, no conditional) is typically NCLC 5-6 at best.
- A text using only basic connectors (et, mais, ensuite) is typically NCLC 5-6 at best.
- A text with informal register in a formal task is typically NCLC 5-6 at best.
- Be fair and precise: score based on the actual text quality against the anchors above. Avoid systematic leniency or harshness.

OFFICIAL EXAM RULES (CCIP — apply these when scoring):
- Section A: "Ne recopiez pas le début du texte, cela ne vous fait pas gagner de point. Ne résumez pas et ne reformulez pas le texte. Apportez des informations nouvelles, en faisant appel à votre imagination." If the candidate merely paraphrases the starter sentence or repeats it at length, deduct from "pertinence/qualité des informations" (criteria 1 and 2).
- Section B: "Inutile de rédiger sous forme de lettre formelle, avec un en-tête officiel : ça ne rapporte aucun point." The letter format is NOT required and earns no points — do NOT penalize its absence and do NOT reward its presence.
- Section B: "Évitez absolument les longues introductions et conclusions génériques, qui marchent pour tous les sujets : les évaluateurs n'en tiennent pas compte." Generic introductions/conclusions that could fit any topic count for nothing — do not reward them; focus on the quality and development of the arguments.
- Section A time: 25 minutes (transmettre des informations). Section B time: 35 minutes (exprimer et justifier son point de vue). Total: 60 minutes.

CRITICAL: Assign nclcLevel (1-12) and cecrLevel (A1-C2) based on the 4 scores. The 4 scores are 0-45 each.`;

  const wordCount = countWords(userText);
  const minWords = section === "A" ? 80 : 200;

  const userPrompt = `${sectionDesc}

TOPIC: ${topic}
${params.starterSentence ? `STARTER SENTENCE (Section A): ${params.starterSentence}` : ""}
${params.context ? `CONTEXT (Section B): ${params.context}` : ""}

WORD COUNT: ${wordCount} words (minimum required: ${minWords}).

CANDIDATE TEXT:
"""
${userText}
"""

Produce a JSON object wrapped in <<<JSON>>> ... >>> with EXACTLY this shape:
<<<JSON>>>
{
  "level1Errors": [
    { "type": "spelling|conjugation|agreement|punctuation|article|preposition|other",
      "tags": ["Passé composé: avoir", "Orthographe"],
      "original": "the exact erroneous snippet from the text",
      "correction": "the corrected form",
      "explanation": "short French explanation" }
  ],
  "level2Suggestions": [
    { "original": "a word/phrase that is correct but could be better",
      "suggestion": "a more precise/natural alternative",
      "reason": "short French explanation of why it is better in this context" }
  ],
  "level3Advanced": [
    { "original": "a sentence/clause that is grammatically fine but stylistically plain",
      "improved": "a more advanced/sophisticated rewrite",
      "explanation": "what syntactic or stylistic technique was used (in French)" }
  ],
  "level4Rewrite": "a complete, natural rewrite of the WHOLE candidate text at C1 level, in French, preserving the meaning and tone",
  "scores": { "adequation": 0, "coherence": 0, "vocabulary": 0, "grammar": 0 },
  "nclcLevel": "6",
  "cecrLevel": "B1",
  "grammarIssues": [
    { "topic": "passe-compose", "topicLabel": "Passé composé", "count": 2, "examples": ["J'as allé", "il a veni"] }
  ],
  "vocabularyIssues": [
    { "word": "bien", "issue": "vocabulaire trop générique", "context": "le feu était bien grand" }
  ],
  "feedback": "2-4 sentence overall feedback in French, encouraging and specific"
}
>>>

Rules:
- Fill ALL arrays; if empty, use an empty array [].
- scores: each of the 4 official TEF criteria scored 0-45 (decimals allowed). Be fair and consistent with official TEF standards.
- WORD COUNT: if the candidate's word count is below the minimum (80 for Section A, 200 for Section B), deduct significantly from "adequation" (e.g. -10 to -15 points). A text far below the minimum (e.g. half the required length) cannot score above 20/45 on adequation.
- nclcLevel: your assessment of the candidate's level (1-12). It is used as a reference — the final level is derived from the 4 scores via the official conversion table, so keep it consistent with the scores.
- cecrLevel: corresponding CEFR level (A1, A2, B1, B2, C1, C2), consistent with nclcLevel.
- For Section A, pay special attention to past tenses, conditionnel, voix passive, discours indirect, and journalistic register.
- For Section B, pay special attention to argumentation structure, connectors, vocabulary variety, and persuasive register.
- REGISTER: evaluate whether the candidate uses the appropriate register and tone for the task (journalistic/objective for Section A, persuasive/structured for Section B). Deduct for informal register, inconsistent tone, or inappropriate formality — reflect this deduction in the "adequation" score.
- Section A: the candidate must bring NEW information (details, explanations, events) not present in the starter sentence. Paraphrasing or summarizing the starter sentence earns no points — deduct from "adequation" and "coherence".
- Section B: the letter format is NOT required (official TEF Canada rule). Do NOT penalize the absence of a letter format, letterhead, or salutation. Generic introductions/conclusions that could fit any topic count for nothing — do not reward them.
- grammarIssues: group the grammar errors from level1Errors by topic. Use the exact tag keys as topic keys (e.g. "passe-compose", "imparfait", "accord-participe-passe"). Each entry: topic (key), topicLabel (French label), count (number of errors), examples (up to 3 original erroneous snippets).
- vocabularyIssues: list vocabulary weaknesses (imprecise, repetitive, informal or misused words). Each entry: word, issue (short French description), context (the snippet where the word appears).
- IMPORTANT — tags on level1Errors: each error MUST have 1 or more VERY SPECIFIC linguistic tags.
  One error can belong to MULTIPLE tags. Tags must be PRECISE — use the EXACT tense, mood, or structure name.
  NEVER use vague tags like "Conjugaison" or "Temps du passé". Always pick the precise tense/mood.

  Example: "J'as un voiture" → "J'as" gets tags ["Passé composé: avoir", "Orthographe"],
  "un voiture" gets tags ["Accord determinant-nom", "Orthographe"].

  EXHAUSTIVE tag list — always use one of these exact tags:

  VERB TENSES (past):
  "Passé composé", "Imparfait", "Plus-que-parfait", "Passé simple", "Passé antérieur",
  "Passé composé: avoir", "Passé composé: être",
  "Passé composé: participe passé", "Imparfait du subjonctif",
  VERB TENSES (present/future):
  "Présent", "Futur simple", "Futur antérieur",
  "Passé récent (venir de)", "Proche futur (aller + infinitif)",
  VERB TENSES (conditionnel):
  "Conditionnel présent", "Conditionnel passé 1ère forme", "Conditionnel passé 2ème forme",
  VERB TENSES (subjonctif):
  "Subjonctif présent", "Subjonctif passé", "Subjonctif plus-que-parfait",
  MOODS & FORMS:
  "Impératif", "Gérondif", "Participe présent", "Participe passé",
  "Infinitif passé", "Voix passive", "Voix active",
  AGREEMENT:
  "Accord sujet-verbe", "Accord adjectif-nom (genre)", "Accord adjectif-nom (nombre)",
  "Accord participe passé-avoir", "Accord participe passé-être",
  "Accord determinant-nom", "Accord du participe passé avec COD antéposé",
  PRONOUNS:
  "Pronom COD", "Pronom COI", "Pronom y", "Pronom en",
  "Pronom relatif", "Pronom démonstratif", "Pronom indéfini",
  "Pronom personnel sujet", "Adverbe pronominal",
  ARTICLES & DETERMINANTS:
  "Article défini", "Article indéfini", "Article partitif",
  "Contraction à + le (au)", "Contraction de + le (du)",
  PREPOSITIONS:
  "Préposition de lieu", "Préposition de temps", "Préposition abstraite",
  NEGATION:
  "Négation ne...pas", "Négation ne...plus", "Négation ne...jamais",
  "Négation ne...rien", "Négation ne...aucun", "Négation ne...ni...ni",
  STRUCTURE:
  "Discours indirect", "Discours direct", "Discours rapporté",
  "Comparatif", "Superlatif", "Interrogation",
  LANGUAGE:
  "Connecteurs logiques", "Registre de langue", "Vocabulaire",
  "Ponctuation", "Syntaxe", "Orthographe", "Accentuation"

CRITICAL: You MUST identify and list EVERY SINGLE ERROR in level1Errors. Be exhaustive — miss no spelling mistake, conjugation error, agreement error, punctuation error, article error, preposition error, register inconsistency, or syntax error. If the text has 20 errors, list all 20. Do not summarize or group errors — each distinct error gets its own entry.`;

  const raw = await callLLM(system, userPrompt);
  let result: CorrectionResult;
  try {
    result = extractJSON<CorrectionResult>(raw);
  } catch (parseErr) {
    console.warn(`[correctExercise] JSON parse failed on first attempt (section=${section}), retrying with simpler prompt...`);
    // Retry with an explicit, shorter prompt demanding strict JSON
    const retrySystem = `CRITICAL: Your ENTIRE response must be ONE JSON object wrapped in <<<JSON>>> ... >>>. No text, no markdown, no commentary. Just the JSON.`;
    const retryUser = `<<<JSON>>>
{
  "level1Errors": [{ "type": "spelling|conjugation|agreement|punctuation|article|preposition|other", "tags": ["Passé composé"], "original": "...", "correction": "...", "explanation": "..." }],
  "level2Suggestions": [{ "original": "...", "suggestion": "...", "reason": "..." }],
  "level3Advanced": [{ "original": "...", "improved": "...", "explanation": "..." }],
  "level4Rewrite": "complete C1-level rewrite in French",
  "scores": { "adequation": 30, "coherence": 28, "vocabulary": 25, "grammar": 27 },
  "nclcLevel": "6",
  "cecrLevel": "B1",
  "grammarIssues": [{ "topic": "passe-compose", "topicLabel": "Passé composé", "count": 1, "examples": ["..."] }],
  "vocabularyIssues": [{ "word": "...", "issue": "...", "context": "..." }],
  "feedback": "feedback in French"
}
>>>
Section: ${section} (${section === "A" ? "fait divers" : "argumentation"}). Topic: ${topic}.
Text: """${userText}"""`;
    const retryRaw = await callLLM(retrySystem, retryUser);
    result = extractJSON<CorrectionResult>(retryRaw);
  }

  // Safety: ensure scores object exists with numeric values
  const defaultScores: TefScores = {
    adequation: 0, coherence: 0, vocabulary: 0, grammar: 0,
  };
  result.scores = { ...defaultScores, ...(result.scores || {}) };
  result.level1Errors = (result.level1Errors || []).map((e) => ({
    ...e,
    tags: e.tags || (e.type ? [e.type] : []),
  }));
  result.level2Suggestions = result.level2Suggestions || [];
  result.level3Advanced = result.level3Advanced || [];
  result.grammarIssues = result.grammarIssues || [];
  result.vocabularyIssues = result.vocabularyIssues || [];
  result.level4Rewrite = result.level4Rewrite || "";
  result.feedback = result.feedback || "";

  // ── Derive NCLC level deterministically from the 4 official scores ──
  // The official TEF Canada table maps the total (0-180) to an NCLC level.
  // Using the deterministic conversion guarantees the level is always
  // consistent with the criteria scores (the LLM's nclcLevel is kept as a
  // reference only and is overridden when it contradicts the scores).
  const total =
    (result.scores.adequation ?? 0) +
    (result.scores.coherence ?? 0) +
    (result.scores.vocabulary ?? 0) +
    (result.scores.grammar ?? 0);
  const nclc = nclcFromTotal(total);
  result.nclcLevel = String(nclc);
  result.cecrLevel = cefrFromNclcLevel(nclc);
  result.globalScore = computeTefScore(nclc, result.scores);

  return result;
}

/**
 * Consistency check: runs correctExercise N times and returns the result
 * whose NCLC level is the majority. Prevents outlier scores from a single
 * LLM call. If all3 disagree, returns the first result.
 */
export async function consistentCorrectExercise(
  params: Parameters<typeof correctExercise>[0],
  runs: number = 3,
): Promise<CorrectionResult> {
  if (runs <= 1) return correctExercise(params);

  const results = await Promise.all(
    Array.from({ length: runs }, () => correctExercise(params)),
  );

  // Find majority NCLC level
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

  // Return the result whose NCLC matches the majority
  const best = results.find((r) => r.nclcLevel === majorityNclc) ?? results[0];
  console.log(
    `[consistentCorrectExercise] ${runs} runs → NCLC levels: [${results.map((r) => r.nclcLevel).join(", ")}] → majority: ${majorityNclc}`,
  );
  return best;
}

// ---------------------------------------------------------------------------
// 3) Placement test evaluation (combines both sections into final levels)
// ---------------------------------------------------------------------------
export async function evaluatePlacement(params: {
  sectionA: CorrectionResult;
  sectionB: CorrectionResult;
}): Promise<PlacementResult> {
  const { sectionA, sectionB } = params;

  const system = `CRITICAL FORMAT RULE: Your ENTIRE response must be EXACTLY one JSON object. Start with <<<JSON>>> then the JSON then >>>. No text, no markdown fences, no commentary. Failure to follow this format will cause an error.

You are a senior TEF Canada examiner producing a final placement decision. The TEF Canada written expression is graded on FOUR official areas (CCIP grid): (1) pertinence des informations transmises (adéquation avec le sujet), (2) qualité des informations / des arguments (développement, détails, illustrations), (3) cohérence interne du texte, cohésion du texte et de la phrase, qualité des phrases et du vocabulaire, (4) orthographe et ponctuation. The overall NCLC level is the synthesis of these four areas.`;

  const userPrompt = `A candidate took a placement test with two sections.

SECTION A (fait divers) correction:
- NCLC: ${sectionA.nclcLevel}, CEFR: ${sectionA.cecrLevel}
- Scores (4 official criteria, each 0-45): ${JSON.stringify(sectionA.scores)}

SECTION B (argumentation) correction:
- NCLC: ${sectionB.nclcLevel}, CEFR: ${sectionB.cecrLevel}
- Scores (4 official criteria, each 0-45): ${JSON.stringify(sectionB.scores)}

Produce a JSON object wrapped in <<<JSON>>> ... >>> with EXACTLY this shape:
<<<JSON>>>
{
  "levelSectionA": "5",
  "levelSectionB": "6",
  "levelOverallNclc": "5",
  "levelOverallCecr": "B1",
  "summarySectionA": "1-2 sentence French summary of section A performance",
  "summarySectionB": "1-2 sentence French summary of section B performance",
  "sectionACorrection": ${JSON.stringify(sectionA)},
  "sectionBCorrection": ${JSON.stringify(sectionB)}
}
>>>

Rules:
- levelOverallNclc must be the synthesis of the FOUR official areas across both sections. Weigh Section B slightly more (it is harder and more diagnostic).
- levelOverallCecr must be consistent with levelOverallNclc (A1≈1-2, A2≈3-4, B1≈5-6, B2≈7-8, C1≈9-10, C2≈11-12).
- French text for the two summaries and everything else.`;

  const raw = await callLLM(system, userPrompt);

  let result: PlacementResult;
  try {
    result = extractJSON<PlacementResult>(raw);
  } catch (parseErr) {
    console.warn(`[evaluatePlacement] JSON parse failed on first attempt, retrying with simpler prompt...`);
    try {
      const retrySystem = `CRITICAL: Your ENTIRE response must be ONE JSON object wrapped in <<<JSON>>> ... >>>. No text, no markdown, no commentary. Just the JSON.`;
      const retryUser = `<<<JSON>>>
{
  "levelSectionA": "5",
  "levelSectionB": "6",
  "levelOverallNclc": "5",
  "levelOverallCecr": "B1",
  "summarySectionA": "1-2 sentence French summary of section A",
  "summarySectionB": "1-2 sentence French summary of section B"
}
>>>
Section A NCLC: ${sectionA.nclcLevel}, CEFR: ${sectionA.cecrLevel}.
Section B NCLC: ${sectionB.nclcLevel}, CEFR: ${sectionB.cecrLevel}.
Weigh Section B slightly more. French text only.`;
      const retryRaw = await callLLM(retrySystem, retryUser);
      result = extractJSON<PlacementResult>(retryRaw);
    } catch {
      // Final fallback: derive the placement directly from the section
      // corrections we already have, so the results are never lost.
      const a = Number(sectionA.nclcLevel);
      const b = Number(sectionB.nclcLevel);
      const overallNum = !isNaN(b) && b > 0
        ? Math.round((a + b * 1.25) / 2.25)
        : (!isNaN(a) ? a : 0);
      result = {
        levelSectionA: sectionA.nclcLevel,
        levelSectionB: sectionB.nclcLevel,
        levelOverallNclc: String(overallNum),
        levelOverallCecr: sectionB.cecrLevel,
        summarySectionA: sectionA.feedback || "Performance évaluée à partir de la section A.",
        summarySectionB: sectionB.feedback || "Performance évaluée à partir de la section B.",
        grammarIssues: [...(sectionA.grammarIssues || []), ...(sectionB.grammarIssues || [])],
        vocabularyIssues: [...(sectionA.vocabularyIssues || []), ...(sectionB.vocabularyIssues || [])],
        sectionACorrection: sectionA,
        sectionBCorrection: sectionB,
      };
    }
  }

  // Re-attach the raw corrections in case the model dropped them
  result.sectionACorrection = sectionA;
  result.sectionBCorrection = sectionB;
  return result;
}

