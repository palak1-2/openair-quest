/**
 * src/pages/History.tsx
 *
 * Screen 8 — History
 *
 * Displays previously completed activities stored locally.
 * In Phase 1, history is empty (localStorage wired in Phase 9).
 * Renders a clear empty state with a call to action.
 *
 * History items (when available) display:
 *   - Activity title
 *   - Environment
 *   - Accessibility mode
 *   - Duration
 *   - Feedback
 *   - Completion timestamp
 *
 * No account required. All data is local.
 */
import { useState } from "react";
import type { JSX } from "react";
import type { HistoryItem } from "@/types";
import { clearHistory, getHistory } from "@/storage/historyStore";

interface HistoryProps {
  onStartNew: () => void;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function formatFeedback(feedback: HistoryItem["feedback"]): string {
  if (!feedback || feedback.length === 0) return "No feedback";
  return feedback
    .map((f) =>
      f
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    )
    .join(", ");
}

function formatMode(mode: HistoryItem["mode"]): string {
  if (mode === "audio-first") return "Audio-first";
  if (mode === "simple-steps") return "Simple steps";
  return "Quiet";
}

export function History({ onStartNew }: HistoryProps): JSX.Element {
  const [items, setItems] = useState<HistoryItem[]>(getHistory);

  function handleClearHistory() {
    clearHistory();
    setItems([]);
  }

  return (
    <main className="page" id="main-content" aria-label="Activity history">
      <div className="container">
        <header className="page__header">
          <h1 className="page__title">History</h1>
          <p className="page__subtitle">Your completed activities — stored locally on this device.</p>
        </header>

        {items.length === 0 ? (
          /* Empty state */
          <div className="empty-state">
            <p aria-hidden="true" className="empty-state__icon">🌿</p>
            <p className="empty-state__title">
              No activities yet.
            </p>
            <p className="empty-state__description">
              Complete your first activity and it will appear here.
            </p>
          </div>
        ) : (
          /* History list */
          <ul
            aria-label="Completed activities"
            className="history-list"
          >
            {items.map((item) => (
              <li key={item.id} className="history-item">
                <div className="history-item__header">
                  <h2 className="history-item__title">
                    {item.mission.title}
                  </h2>
                  <time
                    dateTime={item.completedAt}
                    className="history-item__time"
                  >
                    {formatTimestamp(item.completedAt)}
                  </time>
                </div>

                <dl
                  className="history-item__metadata"
                >
                  <div>
                    <dt className="sr-only">Environment</dt>
                    <dd style={{ textTransform: "capitalize" }}>{item.environment}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Accessibility mode</dt>
                    <dd>{formatMode(item.mode)}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Duration</dt>
                    <dd>{item.mission.durationMinutes} min</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Feedback</dt>
                    <dd>{formatFeedback(item.feedback)}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}

        {/* Actions */}
        <div className="page__actions">
          {items.length > 0 && (
            <button
              id="btn-clear-history"
              className="btn-secondary btn-danger"
              onClick={handleClearHistory}
            >
              Clear history
            </button>
          )}
          <button
            id="btn-start-new-from-history"
            className="btn-primary"
            onClick={onStartNew}
          >
            Start a new activity
          </button>
        </div>
      </div>
    </main>
  );
}
