/**
 * src/storage/historyStore.ts
 *
 * Local history storage (TRD §14, IMPLEMENTATION_PLAN §10).
 *
 * Reads and writes HistoryItem records to browser localStorage.
 * No remote database. No account required.
 *
 * Fully implemented in Phase 9.
 * In Phase 1 all functions are present but return empty/no-op results.
 */
import type { HistoryItem, FeedbackType } from "@/types";

const STORAGE_KEY = "openair-quest:history";

/**
 * Reads all history items from localStorage, newest first.
 */
export function getHistory(): HistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryItem[];
  } catch {
    return [];
  }
}

/**
 * Appends a new history item.
 */
export function addHistoryItem(item: HistoryItem): void {
  const existing = getHistory();
  const updated = [item, ...existing];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage may be unavailable (e.g. private mode quota exceeded).
    console.warn("[OpenAir Quest] Could not save history item to localStorage.");
  }
}

/**
 * Attaches feedback to an existing history item by id.
 */
export function addFeedback(id: string, feedback: FeedbackType[]): void {
  const existing = getHistory();
  const updated = existing.map((item) =>
    item.id === id ? { ...item, feedback } : item
  );
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    console.warn("[OpenAir Quest] Could not update feedback in localStorage.");
  }
}

/**
 * Clears all stored history. Called from the History screen.
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    console.warn("[OpenAir Quest] Could not clear history from localStorage.");
  }
}
