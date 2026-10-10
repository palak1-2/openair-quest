import { useState } from "react";
import type { JSX } from "react";
import type { HistoryItem } from "@/types";
import { clearHistory, getHistory } from "@/storage/historyStore";
import { Icon } from "@/Icon";

interface HistoryProps {
  onStartNew: () => void;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function formatFeedback(feedback: HistoryItem["feedback"]): string {
  if (!feedback?.length) return "";
  return feedback
    .map((value) => value.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "))
    .join(" · ");
}

function formatMode(mode: HistoryItem["mode"]): string {
  if (mode === "audio-first") return "Audio-first";
  if (mode === "simple-steps") return "Simple steps";
  return "Quiet";
}

export function History({ onStartNew }: HistoryProps): JSX.Element {
  const [items, setItems] = useState<HistoryItem[]>(getHistory);

  function handleClear() {
    clearHistory();
    setItems([]);
  }

  return (
    <main className="page journal-page" id="main-content" aria-label="Quest journal">
      <div className="page-frame journal-frame">
        <header className="page__header page__header--left journal-heading">
          <p className="eyebrow">Your quests</p>
          <h1 className="page__title">A journal of being outside.</h1>
          <p className="page__subtitle">
            Completed experiences, kept quietly on this device.
          </p>
        </header>

        {items.length === 0 ? (
          <section className="journal-empty" aria-label="No completed quests">
            <span className="journal-empty__line" aria-hidden="true" />
            <p className="journal-empty__title">Your completed outdoor experiences will appear here.</p>
            <p className="journal-empty__copy">A place to return to the small things you noticed.</p>
          </section>
        ) : (
          <ol aria-label="Completed quests" className="journal-list">
            {items.map((item, index) => {
              const feedback = formatFeedback(item.feedback);
              return (
                <li key={item.id} className="journal-entry">
                  <span className="journal-entry__index" aria-hidden="true">
                    {String(items.length - index).padStart(2, "0")}
                  </span>
                  <article className="journal-entry__content">
                    <div className="journal-entry__topline">
                      <h2 className="journal-entry__title">{item.mission.title}</h2>
                      <time dateTime={item.completedAt}>{formatTimestamp(item.completedAt)}</time>
                    </div>
                    <p className="journal-entry__place">
                      <span>{item.environment.replace("-", " ")}</span>
                      <span aria-hidden="true">·</span>
                      <span>{item.mission.durationMinutes} minutes</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatMode(item.mode)}</span>
                    </p>
                    {feedback && <p className="journal-entry__reflection">{feedback}</p>}
                  </article>
                </li>
              );
            })}
          </ol>
        )}

        <div className="journal-actions">
          {items.length > 0 && (
            <button id="btn-clear-history" className="text-action text-action--secondary" onClick={handleClear}>
              Clear journal
            </button>
          )}
          <button id="btn-start-new-from-history" className="btn-primary" onClick={onStartNew}>
            Start exploring <Icon name="arrow-right" size={19} />
          </button>
        </div>
      </div>
    </main>
  );
}
