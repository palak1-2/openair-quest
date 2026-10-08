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
          <div
            style={{
              textAlign: "center",
              padding: "var(--space-12) var(--space-4)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "var(--space-4)",
            }}
          >
            <p aria-hidden="true" style={{ fontSize: "3rem" }}>🌿</p>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-lg)" }}>
              No activities yet.
            </p>
            <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", maxWidth: "18rem" }}>
              Complete your first activity and it will appear here.
            </p>
          </div>
        ) : (
          /* History list */
          <ul
            aria-label="Completed activities"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}
          >
            {items.map((item) => (
              <li key={item.id} className="card">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "var(--space-4)",
                    flexWrap: "wrap",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  <h2
                    style={{ fontSize: "var(--font-size-base)", fontWeight: "var(--font-weight-semi)" }}
                  >
                    {item.mission.title}
                  </h2>
                  <time
                    dateTime={item.completedAt}
                    style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", flexShrink: 0 }}
                  >
                    {formatTimestamp(item.completedAt)}
                  </time>
                </div>

                <dl
                  style={{
                    display: "flex",
                    gap: "var(--space-6)",
                    flexWrap: "wrap",
                    fontSize: "var(--font-size-sm)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  <div>
                    <dt className="sr-only">Environment</dt>
                    <dd style={{ textTransform: "capitalize" }}>{item.environment}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Accessibility mode</dt>
                    <dd style={{ textTransform: "capitalize" }}>{item.mode}</dd>
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
              className="btn-secondary"
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
