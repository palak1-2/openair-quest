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
          <h2 id="mode-heading" style={{ marginBottom: "var(--space-4)", fontSize: "var(--font-size-lg)" }}>
            Accessibility mode
          </h2>
          <div
            role="radiogroup"
            aria-labelledby="mode-heading"
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
          >
            {MODES.map(({ value, label, description, icon }) => {
              const isSelected = mode === value;
              return (
                <label
                  key={value}
                  className="card"
                  htmlFor={`mode-${value}`}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "var(--space-4)",
                    border: isSelected
                      ? "2px solid var(--color-primary)"
                      : "1px solid var(--color-border)",
                    boxShadow: isSelected ? "var(--shadow-glow-primary)" : "var(--shadow-md)",
                    transition: "border var(--transition-fast), box-shadow var(--transition-fast)",
                    padding: "var(--space-5)",
                  }}
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
                  <span aria-hidden="true" style={{ fontSize: "1.5rem", flexShrink: 0 }}>{icon}</span>
                  <div>
                    <div style={{ fontWeight: "var(--font-weight-semi)", marginBottom: "var(--space-1)" }}>
                      {label}
                    </div>
                    <div style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)" }}>
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
          <h2 id="duration-heading" style={{ marginBottom: "var(--space-4)", fontSize: "var(--font-size-lg)" }}>
            Duration
          </h2>
          <div
            role="radiogroup"
            aria-labelledby="duration-heading"
            style={{ display: "flex", gap: "var(--space-3)" }}
          >
            {DURATIONS.map(({ value, label }) => {
              const isSelected = duration === value;
              return (
                <label
                  key={value}
                  htmlFor={`duration-${value}`}
                  style={{
                    flex: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    border: isSelected
                      ? "2px solid var(--color-primary)"
                      : "1px solid var(--color-border)",
                    background: isSelected ? "hsl(152 60% 48% / 0.1)" : "var(--color-surface)",
                    cursor: "pointer",
                    fontWeight: "var(--font-weight-semi)",
                    transition: "border var(--transition-fast), background var(--transition-fast)",
                  }}
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
