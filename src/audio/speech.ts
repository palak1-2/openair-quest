/**
 * src/audio/speech.ts
 *
 * Browser Text-to-Speech wrapper (TRD §15).
 *
 * Wraps the Web Speech API (SpeechSynthesis).
 * Text is always the source of truth — TTS is additive.
 *
 * Functions: speak | pause | resume | stop | isSupported
 *
 * Fully wired to the UI in Phase 8.
 * Gracefully handles browsers without speech synthesis support.
 */

/**
 * Returns true if the browser supports SpeechSynthesis.
 */
export function isSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/**
 * Speaks the given text using the browser's default TTS voice.
 * Stops any currently speaking utterance first.
 *
 * @param text - The text to speak.
 * @param onEnd - Optional callback when speech ends naturally.
 */
export function speak(text: string, onEnd?: () => void): void {
  if (!isSupported()) return;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.95;
  utterance.pitch = 1;

  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
}

/**
 * Pauses ongoing speech (if any).
 */
export function pause(): void {
  if (!isSupported()) return;
  window.speechSynthesis.pause();
}

/**
 * Resumes paused speech (if any).
 */
export function resume(): void {
  if (!isSupported()) return;
  window.speechSynthesis.resume();
}

/**
 * Stops all speech immediately.
 */
export function stop(): void {
  if (!isSupported()) return;
  window.speechSynthesis.cancel();
}
