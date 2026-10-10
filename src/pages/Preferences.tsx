import { useState } from "react";
import type { JSX } from "react";
import type { AccessibilityMode, DurationMinutes } from "@/types";
import { Icon } from "@/Icon";

interface PreferencesProps {
  onComplete: (mode: AccessibilityMode, duration: DurationMinutes) => void;
  onBack: () => void;
}

const MODES: {
  value: AccessibilityMode;
  label: string;
  description: string;
  icon: "leaf" | "volume" | "check-circle";
}[] = [
  {
    value: "quiet",
    label: "Quiet",
    description: "Calm language, low sensory stimulation, minimal social interaction.",
    icon: "leaf",
  },
  {
    value: "audio-first",
    label: "Audio-first",
    description: "Short spoken sentences, with text equivalents and pause controls.",
    icon: "volume",
  },
  {
    value: "simple-steps",
    label: "Simple steps",
    description: "One clear action at a time in a predictable layout.",
    icon: "check-circle",
  },
];

const DURATIONS: { value: DurationMinutes; label: string; note: string }[] = [
  { value: 5, label: "5", note: "A few minutes" },
  { value: 10, label: "10", note: "A little longer" },
  { value: 20, label: "20", note: "Take your time" },
];

export function Preferences({ onComplete, onBack }: PreferencesProps): JSX.Element {
  const [mode, setMode] = useState<AccessibilityMode | null>(null);
  const [duration, setDuration] = useState<DurationMinutes | null>(null);
  const selectedMode = MODES.find((item) => item.value === mode);
  const canProceed = mode !== null && duration !== null;

  return (
    <main className="page preferences-page" id="main-content" aria-label="Select your preferences">
      <div className="page-frame preferences-frame">
        <header className="page__header page__header--left">
          <p className="eyebrow">Step 01 <span aria-hidden="true">—</span> Comfort profile</p>
          <h1 className="page__title">How would you like to experience the outdoors?</h1>
          <p className="page__subtitle">
            Tell your companion what feels right. You can choose differently next time.
          </p>
        </header>

        <div className="preferences-layout">
          <section className="preferences-main" aria-labelledby="mode-heading">
            <h2 id="mode-heading" className="section-heading">Choose a way that feels comfortable</h2>
            <div role="radiogroup" aria-labelledby="mode-heading" className="comfort-list">
              {MODES.map(({ value, label, description, icon }, index) => {
                const selected = mode === value;
                return (
                  <label
                    key={value}
                    htmlFor={`mode-${value}`}
                    className={`comfort-choice${selected ? " is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      id={`mode-${value}`}
                      name="accessibility-mode"
                      value={value}
                      checked={selected}
                      onChange={() => setMode(value)}
                      className="sr-only"
                    />
                    <span className="comfort-choice__index" aria-hidden="true">0{index + 1}</span>
                    <span className="comfort-choice__icon"><Icon name={icon} size={22} /></span>
                    <span className="comfort-choice__copy">
                      <span className="comfort-choice__title">{label}</span>
                      <span className="comfort-choice__description">{description}</span>
                    </span>
                    <span className="comfort-choice__check" aria-hidden="true"><Icon name="check" size={18} /></span>
                  </label>
                );
              })}
            </div>

            <section className="duration-setting" aria-labelledby="duration-heading">
              <div className="duration-setting__heading">
                <h2 id="duration-heading" className="eyebrow">Duration target</h2>
                <span className="duration-setting__unit">Minutes</span>
              </div>
              <div role="radiogroup" aria-labelledby="duration-heading" className="duration-segment">
                {DURATIONS.map(({ value, label, note }) => {
                  const selected = duration === value;
                  return (
                    <label
                      key={value}
                      htmlFor={`duration-${value}`}
                      className={`duration-option${selected ? " is-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        id={`duration-${value}`}
                        name="duration"
                        value={value}
                        checked={selected}
                        onChange={() => setDuration(value)}
                        className="sr-only"
                      />
                      <span className="duration-option__value">{label} min</span>
                      <span className="duration-option__note">{note}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          </section>

          <aside className="comfort-reflection" aria-live="polite">
            <span className="comfort-reflection__mark"><Icon name={selectedMode?.icon ?? "leaf"} size={25} /></span>
            <p className="eyebrow">A note for your companion</p>
            <p className="comfort-reflection__title">
              {selectedMode ? selectedMode.label : "Your pace, your way"}
            </p>
            <p className="comfort-reflection__body">
              {selectedMode
                ? selectedMode.description
                : "Choose the kind of guidance that will help you feel at ease outside."}
            </p>
          </aside>
        </div>

        <div className="page__actions page__actions--flow">
          <button id="btn-back-preferences" className="text-action" onClick={onBack}>
            <Icon name="arrow-left" size={18} /> Back
          </button>
          <button
            id="btn-continue-preferences"
            className="btn-primary"
            disabled={!canProceed}
            onClick={() => mode && duration && onComplete(mode, duration)}
            aria-disabled={!canProceed}
          >
            Choose surroundings <Icon name="arrow-right" size={19} />
          </button>
        </div>
      </div>
    </main>
  );
}
