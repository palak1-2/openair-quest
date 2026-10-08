/**
 * src/pages/Preferences.tsx
 *
 * Screen 2 — Preferences
 *
 * User selects:
 *   - Accessibility mode (quiet | audio-first | simple-steps)
 *   - Duration (5 | 10 | 20 minutes)
 *
 * Selections are lifted to App via onComplete.
 */
import { useState } from "react";
import type { JSX } from "react";
import type { AccessibilityMode, DurationMinutes } from "@/types";

interface PreferencesProps {
  onComplete: (mode: AccessibilityMode, duration: DurationMinutes) => void;
  onBack: () => void;
}

const MODES: { value: AccessibilityMode; label: string; description: string; icon: string }[] = [
  {
    value: "quiet",
    label: "Quiet",
    description: "Calm language, low sensory stimulation, minimal social interaction.",
    icon: "🌾",
  },
  {
    value: "audio-first",
    label: "Audio-first",
    description: "Short spoken sentences with text equivalents and pause controls.",
    icon: "🔊",
  },
  {
    value: "simple-steps",
    label: "Simple steps",
    description: "One clear action at a time with a predictable layout.",
    icon: "📋",
  },
];

const DURATIONS: { value: DurationMinutes; label: string }[] = [
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
  { value: 20, label: "20 min" },
];

export function Preferences({ onComplete, onBack }: PreferencesProps): JSX.Element {
  const [mode, setMode] = useState<AccessibilityMode | null>(null);
  const [duration, setDuration] = useState<DurationMinutes | null>(null);

  const canProceed = mode !== null && duration !== null;

  return (
    <main className="page" id="main-content" aria-label="Select your preferences">
      <div className="container">
        <header className="page__header">
          <h1 className="page__title">Your Preferences</h1>
          <p className="page__subtitle">Choose an accessibility mode and activity duration.</p>
        </header>

        {/* Accessibility mode */}
        <section aria-labelledby="mode-heading">
          <h2 id="mode-heading" className="section-heading">
            Accessibility mode
          </h2>
          <div
            role="radiogroup"
            aria-labelledby="mode-heading"
            className="choice-list"
          >
            {MODES.map(({ value, label, description, icon }) => {
              const isSelected = mode === value;
              return (
                <label
                  key={value}
                  className={`choice-card${isSelected ? " choice-card--selected" : ""}`}
                  htmlFor={`mode-${value}`}
                >
                  <input
                    type="radio"
                    id={`mode-${value}`}
                    name="accessibility-mode"
                    value={value}
                    checked={isSelected}
                    onChange={() => setMode(value)}
                    className="sr-only"
                  />
                  <span aria-hidden="true" className="choice-card__icon">{icon}</span>
                  <div>
                    <div className="choice-card__title" style={{ marginBottom: "var(--space-1)" }}>
                      {label}
                    </div>
                    <div className="choice-card__description">
                      {description}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </section>

        <div className="divider" />

        {/* Duration */}
        <section aria-labelledby="duration-heading">
          <h2 id="duration-heading" className="section-heading">
            Duration
          </h2>
          <div
            role="radiogroup"
            aria-labelledby="duration-heading"
            className="choice-duration-group"
          >
            {DURATIONS.map(({ value, label }) => {
              const isSelected = duration === value;
              return (
                <label
                  key={value}
                  htmlFor={`duration-${value}`}
                  className={`choice-duration${isSelected ? " choice-duration--selected" : ""}`}
                >
                  <input
                    type="radio"
                    id={`duration-${value}`}
                    name="duration"
                    value={value}
                    checked={isSelected}
                    onChange={() => setDuration(value)}
                    className="sr-only"
                  />
                  {label}
                </label>
              );
            })}
          </div>
        </section>

        {/* Actions */}
        <div className="page__actions">
          <button
            id="btn-continue-preferences"
            className="btn-primary"
            disabled={!canProceed}
            onClick={() => {
              if (mode && duration) onComplete(mode, duration);
            }}
            aria-disabled={!canProceed}
          >
            Continue
          </button>
          <button id="btn-back-preferences" className="btn-secondary" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </main>
  );
}
