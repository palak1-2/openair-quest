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
          className="container"
          style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1 }}
        >
          <p aria-hidden="true" style={{ fontSize: "4rem", marginBottom: "var(--space-4)" }}>🌿</p>
          <h1 className="page__title" style={{ marginBottom: "var(--space-3)", textAlign: "center" }}>
            Thank you!
          </h1>
          <p className="page__subtitle" style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
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
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "var(--space-3)",
            marginBottom: "var(--space-8)",
          }}
        >
          {FEEDBACK_OPTIONS.map(({ value, label, icon }) => {
            const isSelected = selected.includes(value);
            return (
              <button
                key={value}
                id={`feedback-${value}`}
                className="card"
                onClick={() => toggleFeedback(value)}
                aria-pressed={isSelected}
                style={{
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  padding: "var(--space-5)",
                  border: isSelected
                    ? "2px solid var(--color-primary)"
                    : "1px solid var(--color-border)",
                  boxShadow: isSelected ? "var(--shadow-glow-primary)" : "var(--shadow-sm)",
                  background: isSelected ? "hsl(152 60% 48% / 0.1)" : "var(--color-surface)",
                  borderRadius: "var(--radius-lg)",
                  transition: "border var(--transition-fast), background var(--transition-fast), box-shadow var(--transition-fast)",
                }}
              >
                <span aria-hidden="true" style={{ fontSize: "1.75rem" }}>{icon}</span>
                <span style={{ fontWeight: "var(--font-weight-medium)", fontSize: "var(--font-size-sm)" }}>
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
