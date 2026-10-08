/**
 * src/pages/ActiveActivity.tsx
 *
 * Screen 6 — Active Activity (step-by-step execution)
 *
 * Displays one step at a time during the activity.
 * No automatic countdown (per PRD §6 / IMPLEMENTATION_PLAN §9).
 *
 * Audio-first mode: TTS controls are shown (wired in Phase 8).
 * Phase 1: TTS buttons are present but speech is not yet implemented.
 *
 * Accessibility:
 *   - Keyboard-navigable Previous / Next controls
 *   - Step announced via aria-live="polite"
 *   - Progress indicator with aria-label
 *   - Text is ALWAYS the source of truth (TTS is additive)
 */
import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import type { AccessibilityMode, DurationMinutes, EnvironmentOption, Mission } from "@/types";
import * as speech from "@/audio/speech";

interface SessionSnapshot {
  mode: AccessibilityMode | null;
  durationMinutes: DurationMinutes | null;
  environment: EnvironmentOption | null;
  photo: Blob | undefined;
  mission: Mission | null;
  historyItemId?: string | null;
}

interface ActiveActivityProps {
  session: SessionSnapshot;
  onComplete: () => void;
  onStop: () => void;
}

export function ActiveActivity({ session, onComplete, onStop }: ActiveActivityProps): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [speechState, setSpeechState] = useState<
    "idle" | "speaking" | "paused" | "finished" | "stopped"
  >("idle");
  const speechSequence = useRef(0);
  const steps = session.mission?.steps ?? [];
  const audioVersion = session.mission?.audioVersion ?? [];
  useEffect(() => () => {
    speechSequence.current += 1;
    speech.stop();
  }, []);

  if (steps.length === 0) {
    return (
      <main className="page" id="main-content" aria-label="Active activity">
        <div className="container">
          <p role="alert">No validated activity is available to start.</p>
          <button className="btn-secondary" onClick={onStop}>Stop activity</button>
        </div>
      </main>
    );
  }
  const total = steps.length;
  const isLast = currentIndex === total - 1;
  const isFirst = currentIndex === 0;
  const isAudioFirst = session.mode === "audio-first";
  const speechSupported = speech.isSupported();

  function stopSpeech() {
    speechSequence.current += 1;
    speech.stop();
    setSpeechState("stopped");
  }

  function speakCurrentStep() {
    if (!speechSupported) return;
    const sequence = ++speechSequence.current;
    setSpeechState("speaking");
    speech.speak(audioVersion[currentIndex], () => {
      if (speechSequence.current === sequence) setSpeechState("finished");
    });
  }

  function togglePause() {
    if (speechState === "speaking") {
      speech.pause();
      setSpeechState("paused");
    } else if (speechState === "paused") {
      speech.resume();
      setSpeechState("speaking");
    }
  }

  function goNext() {
    if (!isLast) {
      stopSpeech();
      setCurrentIndex((i) => i + 1);
    }
  }

  function goPrev() {
    if (!isFirst) {
      stopSpeech();
      setCurrentIndex((i) => i - 1);
    }
  }

  return (
    <main className="page" id="main-content" aria-label="Active activity">
      <div className="container">
        {/* Header */}
        <header className="page__header active-activity__header">
          <h1 className="page__title active-activity__title">
            {session.mission?.title}
          </h1>
        </header>

        {/* Progress indicator */}
        <nav
          aria-label={`Step ${currentIndex + 1} of ${total}`}
          className="progress-bar"
        >
          {steps.map((_, i) => {
            let cls = "progress-bar__dot";
            if (i === currentIndex) cls += " progress-bar__dot--active";
            else if (i < currentIndex) cls += " progress-bar__dot--done";
            return <div key={i} className={cls} aria-hidden="true" />;
          })}
        </nav>

        {/* Step counter for SR */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Step {currentIndex + 1} of {total}
        </p>

        {/* Current step */}
        <div
          className="active-step"
        >
          <p
            aria-live="polite"
            aria-atomic="true"
            className="active-step__text"
          >
            {steps[currentIndex]}
          </p>
        </div>

        {/* Audio-first speech controls */}
        {isAudioFirst && (
          <div
            className="activity-audio-controls"
            role="group"
            aria-label="Audio controls"
          >
            <button
              id="btn-tts-speak"
              className="btn-secondary"
              aria-label="Speak current step"
              disabled={!speechSupported}
              onClick={speakCurrentStep}
              title={speechSupported ? "Speak the current step" : "Speech synthesis is not supported in this browser"}
            >
              🔊 {speechState === "speaking" ? "Replay" : "Speak"}
            </button>
            <button
              id="btn-tts-pause"
              className="btn-secondary"
              aria-label={speechState === "paused" ? "Resume speech" : "Pause speech"}
              disabled={!speechSupported || (speechState !== "speaking" && speechState !== "paused")}
              onClick={togglePause}
            >
              {speechState === "paused" ? "▶ Resume" : "⏸ Pause"}
            </button>
            <button
              id="btn-tts-stop"
              className="btn-secondary"
              aria-label="Stop speech"
              disabled={!speechSupported || (speechState !== "speaking" && speechState !== "paused")}
              onClick={stopSpeech}
            >
              ⏹ Stop
            </button>
            <span
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className={!speechSupported ? "activity-audio-controls__status" : "sr-only"}
            >
              {!speechSupported
                ? "Speech playback is not available in this browser. You can follow the written steps and use the buttons below."
                : speechState === "speaking"
                  ? "Speaking current step."
                  : speechState === "paused"
                    ? "Speech paused."
                    : speechState === "finished"
                      ? "Speech finished."
                      : speechState === "stopped"
                        ? "Speech stopped."
                        : "Ready to speak current step."}
            </span>
          </div>
        )}

        {/* Step navigation */}
        <div
          className="activity-controls"
        >
          <button
            id="btn-prev-step"
            className="btn-secondary"
            onClick={goPrev}
            disabled={isFirst}
            aria-label="Go to previous step"
          >
            ← Previous
          </button>

          {isLast ? (
            <button
              id="btn-complete-activity"
              className="btn-primary"
              onClick={() => {
                stopSpeech();
                onComplete();
              }}
              aria-label="Complete activity"
            >
              Complete ✓
            </button>
          ) : (
            <button
              id="btn-next-step"
              className="btn-primary"
              onClick={goNext}
              aria-label="Go to next step"
            >
              Next →
            </button>
          )}
        </div>

        {/* Stop button */}
        <div className="activity-stop">
          <button
            id="btn-stop-activity"
            className="btn-secondary"
            onClick={() => {
              stopSpeech();
              onStop();
            }}
            aria-label="Stop activity and go to feedback"
          >
            Stop activity
          </button>
        </div>
      </div>
    </main>
  );
}
