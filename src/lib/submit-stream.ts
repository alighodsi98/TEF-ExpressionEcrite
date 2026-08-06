import type { LoadingProgress } from "@/lib/store";

export type StreamEvent =
  | { type: "progress"; total: number; completed: number; current: string }
  | { type: "done_step"; key: string; total: number; completed: number; label: string }
  | { type: "done"; data: Record<string, unknown> }
  | { type: "error"; message: string };

const STREAM_TIMEOUT_MS = 12 * 60 * 1000; // 12 minutes

/**
 * Reads an SSE stream from a POST fetch and yields events.
 * Includes a timeout to prevent infinite loading.
 */
export async function* readSubmitStream(
  url: string,
  body: unknown,
): AsyncGenerator<StreamEvent> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, STREAM_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeout);
    yield { type: "error", message: err instanceof Error && err.name === "AbortError"
      ? "La connexion a expiré. Veuillez réessayer."
      : "Erreur réseau. Vérifiez votre connexion." };
    return;
  }

  if (!response.ok) {
    clearTimeout(timeout);
    const text = await response.text().catch(() => "Erreur réseau");
    yield { type: "error", message: text };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    clearTimeout(timeout);
    yield { type: "error", message: "Impossible de lire la réponse du serveur." };
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let receivedTerminalEvent = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (!jsonStr) continue;

        try {
          const event = JSON.parse(jsonStr) as StreamEvent;
          yield event;
          if (event.type === "done" || event.type === "error") {
            receivedTerminalEvent = true;
            clearTimeout(timeout);
            return;
          }
        } catch (e) {
          console.warn("[readSubmitStream] skipping unparseable SSE line:", jsonStr.slice(0, 200), e);
        }
      }
    }
  } finally {
    clearTimeout(timeout);
    reader.releaseLock();
  }

  if (!receivedTerminalEvent) {
    yield { type: "error", message: "La connexion au serveur a été interrompue. Veuillez réessayer." };
  }
}
