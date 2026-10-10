import { useState } from "react";
import type { JSX } from "react";
import type { FeedbackType, AccessibilityMode, DurationMinutes, EnvironmentOption } from "@/types";
import { addFeedback } from "@/storage/historyStore";
import { Icon } from "@/Icon";

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

const FEEDBACK_OPTIONS: {
  value: FeedbackType;
  label: string;
  icon: "smile" | "accessibility" | "speaker-off" | "heart";
}[] = [
  { value: "comfortable", label: "Comfortable", icon: "smile" },
  { value: "too-difficult", label: "A little challenging", icon: "accessibility" },
  { value: "too-noisy", label: "Too noisy", icon: "speaker-off" },
  { value: "enjoyable", label: "Enjoyable", icon: "heart" },
];

export function Feedback({ historyItemId, onDone, onStartNew }: FeedbackProps): JSX.Element {
  const [selected, setSelected] = useState<FeedbackType[]>([]);
  const [submitted, setSubmitted] = useState(false);

  function toggleFeedback(value: FeedbackType) {
    setSelected((previous) =>
      previous.includes(value)
        ? previous.filter((feedback) => feedback !== value)
        : [...previous, value],
    );
  }

  function handleDone() {
    if (historyItemId && selected.length > 0) addFeedback(historyItemId, selected);
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main className="page completion-page" id="main-content" aria-label="Quest complete">
        <div className="completion-composition">
          <div className="completion-mark" aria-hidden="true"><Icon name="check" size={26} /></div>
          <p className="eyebrow">Quest complete</p>
          <h1 className="completion-title">You made a little space to notice.</h1>
          <p className="completion-copy">
            This moment has been added to your outdoor journal on this device.
          </p>
          <div className="page__actions page__actions--completion">
            <button id="btn-view-history" className="btn-primary" onClick={onDone}>
              View your journal <Icon name="arrow-right" size={19} />
            </button>
            <button id="btn-start-new-from-feedback" className="text-action" onClick={onStartNew}>
              Begin another quest
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page reflection-page" id="main-content" aria-label="Quest complete">
      <div className="reflection-composition">
        <header className="reflection-heading">
          <p className="eyebrow">Quest complete</p>
          <h1 className="reflection-title">How did that feel?</h1>
          <p className="reflection-copy">
            Take a moment to reflect. Choose any that fit, or leave it blank.
          </p>
        </header>

        <div className="reflection-choices" role="group" aria-label="Optional feedback">
          {FEEDBACK_OPTIONS.map(({ value, label, icon }, index) => {
            const active = selected.includes(value);
            return (
              <button
                key={value}
                id={`feedback-${value}`}
                className={`reflection-choice${active ? " is-selected" : ""}`}
                onClick={() => toggleFeedback(value)}
                aria-pressed={active}
              >
                <span className="reflection-choice__index" aria-hidden="true">0{index + 1}</span>
                <span className="reflection-choice__icon"><Icon name={icon} size={20} /></span>
                <span className="reflection-choice__label">{label}</span>
                <span className="reflection-choice__check" aria-hidden="true"><Icon name="check" size={17} /></span>
              </button>
            );
          })}
        </div>

        <div className="page__actions page__actions--flow">
          <span className="reflection-optional">Your answer stays on this device.</span>
          <button id="btn-submit-feedback" className="btn-primary" onClick={handleDone}>
            Done <Icon name="arrow-right" size={19} />
          </button>
        </div>
      </div>
    </main>
  );
}
