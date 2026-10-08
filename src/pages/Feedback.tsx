/**
 * src/pages/Feedback.tsx
 *
 * Screen 7 — Feedback
 *
 * After completing an activity, the user can submit simple feedback.
 * Feedback is stored locally (Phase 9). In Phase 1 the selection is
 * captured in state but not persisted.
 *
 * Available feedback values (per PRD §7):
 *   comfortable | too-difficult | too-noisy | enjoyable
 *
 * Feedback is optional — the user can skip and go straight to History.
 */
import { useState } from "react";
import type { JSX } from "react";
import type { FeedbackType, AccessibilityMode, DurationMinutes, EnvironmentOption } from "@/types";
import { addFeedback } from "@/storage/historyStore";

interface SessionSnapshot {
  mode: AccessibilityMode | null;
  durationMinutes: DurationMinutes | null;
  environment: EnvironmentOption | null;
  photo: Blob | undefined;
}

interface FeedbackProps {
  session: SessionSnapshot;
  onDone: () => void;
  onStartNew: () => void;
  historyItemId: string | null;
}

const FEEDBACK_OPTIONS: { value: FeedbackType; label: string; icon: string }[] = [
  { value: "comfortable", label: "Comfortable", icon: "😌" },
  { value: "too-difficult", label: "Too difficult", icon: "😰" },
  { value: "too-noisy", label: "Too noisy", icon: "🔇" },
  { value: "enjoyable", label: "Enjoyable", icon: "😊" },
];

export function Feedback({ historyItemId, onDone, onStartNew }: FeedbackProps): JSX.Element {
  const [selected, setSelected] = useState<FeedbackType[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function toggleFeedback(value: FeedbackType) {
    setSelected((prev) =>
      prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
    );
  }

  function handleSubmit() {
    if (historyItemId && selected.length > 0) addFeedback(historyItemId, selected);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="page" id="main-content" aria-label="Feedback submitted">
        <div
          className="container centered-content"
        >
          <p aria-hidden="true" className="empty-state__icon">🌿</p>
          <h1 className="page__title feedback-thanks__title">
            Thank you!
          </h1>
          <p className="page__subtitle feedback-thanks__subtitle">
            Your feedback helps improve future activities.
          </p>
          <div className="page__actions">
            <button id="btn-view-history" className="btn-primary" onClick={onDone}>
              View history
            </button>
            <button id="btn-start-new-from-feedback" className="btn-secondary" onClick={onStartNew}>
              Start a new activity
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page" id="main-content" aria-label="Activity feedback">
      <div className="container">
        <header className="page__header">
          <h1 className="page__title">How did it go?</h1>
          <p className="page__subtitle">
            Select all that apply. Feedback is optional.
          </p>
        </header>

        {/* Feedback options as toggle buttons */}
        <div
          role="group"
          aria-label="Feedback options"
          className="choice-grid choice-grid--feedback"
        >
          {FEEDBACK_OPTIONS.map(({ value, label, icon }) => {
            const isSelected = selected.includes(value);
            return (
              <button
                key={value}
                id={`feedback-${value}`}
                className={`choice-card choice-card--feedback${isSelected ? " choice-card--selected" : ""}`}
                onClick={() => toggleFeedback(value)}
                aria-pressed={isSelected}
              >
                <span aria-hidden="true" className="choice-card__icon">{icon}</span>
                <span className="choice-card__label">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="page__actions">
          <button
            id="btn-submit-feedback"
            className="btn-primary"
            onClick={handleSubmit}
          >
            {selected.length > 0 ? "Submit feedback" : "Skip"}
          </button>
          <button id="btn-start-new-skip" className="btn-secondary" onClick={onStartNew}>
            Start a new activity
          </button>
        </div>
      </div>
    </main>
  );
}
