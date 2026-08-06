const PREFERRED_VOICE_KEY = "preferredFrVoice";

/** All voices whose language starts with "fr" (e.g. fr-FR, fr-CA). */
export function getFrVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return [];
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("fr"));
}

/** The user's preferred French voice name, if any (stored in localStorage). */
export function getPreferredVoiceName(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(PREFERRED_VOICE_KEY);
  } catch {
    return null;
  }
}

/** Persist the user's preferred French voice name (browser-specific). */
export function setPreferredVoiceName(name: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (name) window.localStorage.setItem(PREFERRED_VOICE_KEY, name);
    else window.localStorage.removeItem(PREFERRED_VOICE_KEY);
  } catch {
    // ignore storage errors (e.g. private mode)
  }
}

export function findFrVoice(): SpeechSynthesisVoice | undefined {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return undefined;
  const fr = getFrVoices();
  if (fr.length === 0) return undefined;
  const preferred = getPreferredVoiceName();
  if (preferred) {
    const match = fr.find((v) => v.name === preferred);
    if (match) return match;
  }
  return fr.find((v) => v.localService === false) ?? fr[0];
}

export function hasSpeechSupport(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Subscribe to French-voice availability. The browser loads the voice list
 * asynchronously, so this polls briefly (like the TTS floating button) and
 * listens for the `voiceschanged` event. Returns an unsubscribe function.
 */
export function onFrVoiceChange(
  cb: (hasVoice: boolean) => void,
  { pollMs = 200, pollTimeout = 5000 }: { pollMs?: number; pollTimeout?: number } = {},
): () => void {
  if (!hasSpeechSupport()) {
    cb(false);
    return () => {};
  }

  const check = () => cb(!!findFrVoice());
  const voiceTimer = window.setTimeout(check, 0);

  speechSynthesis.addEventListener("voiceschanged", check);
  const polling = window.setInterval(() => {
    if (findFrVoice()) {
      check();
      window.clearInterval(polling);
    }
  }, pollMs);
  window.setTimeout(() => window.clearInterval(polling), pollTimeout);

  return () => {
    window.clearTimeout(voiceTimer);
    window.clearInterval(polling);
    speechSynthesis.removeEventListener("voiceschanged", check);
  };
}

export function hasFrVoice(): boolean {
  return !!findFrVoice();
}

export function speakFrench(text: string, rate = 0.85): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return null;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = rate;
  const v = findFrVoice();
  if (v) u.voice = v;
  speechSynthesis.speak(u);
  return u;
}
