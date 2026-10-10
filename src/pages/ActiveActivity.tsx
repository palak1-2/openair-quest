import { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import type { AccessibilityMode, DurationMinutes, EnvironmentOption, Mission } from "@/types";
import * as speech from "@/audio/speech";
import { Icon } from "@/Icon";

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
      <main className="page" id="main-content" aria-label="Active quest">
        <div className="page-frame">
          <p className="form-error" role="alert">No validated quest is available to begin.</p>
          <button className="text-action" onClick={onStop}>Leave quest</button>
        </div>
      </main>
    );
  }

  const total = steps.length;
  const isLast = currentIndex === total - 1;
  const isFirst = currentIndex === 0;
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
      setCurrentIndex((index) => index + 1);
    }
  }

  function goPrevious() {
    if (!isFirst) {
      stopSpeech();
      setCurrentIndex((index) => index - 1);
    }
  }

  return (
    <main className="page in-quest-page" id="main-content" aria-label="Active quest">
      <div className="in-quest-frame">
        <header className="in-quest-header">
          <p className="eyebrow">OpenAir Quest</p>
          <p className="in-quest-count" aria-label={`Step ${currentIndex + 1} of ${total}`}>
            <span>{String(currentIndex + 1).padStart(2, "0")}</span>
            <span aria-hidden="true">/</span>
            <span>{String(total).padStart(2, "0")}</span>
          </p>
        </header>

        <nav aria-label={`Step ${currentIndex + 1} of ${total}`} className="step-track">
          {steps.map((_, index) => (
            <span
              key={index}
              className={`step-track__segment${index < currentIndex ? " is-done" : ""}${index === currentIndex ? " is-current" : ""}`}
              aria-hidden="true"
            />
          ))}
        </nav>

        <p className="sr-only" aria-live="polite" aria-atomic="true">
          Step {currentIndex + 1} of {total}
        </p>

        <section key={currentIndex} className="present-step" aria-label={`Step ${currentIndex + 1}`}>
          <p className="eyebrow">Take a moment</p>
          <p className="present-step__instruction" aria-live="polite" aria-atomic="true">
            {steps[currentIndex]}
          </p>
        </section>

        {session.mode === "audio-first" && (
          <div className="audio-toolset" role="group" aria-label="Audio controls">
            <button
              id="btn-tts-speak"
              className="quiet-control"
              aria-label="Speak current step"
              disabled={!speechSupported}
              onClick={speakCurrentStep}
              title={speechSupported ? "Speak the current step" : "Speech synthesis is not supported in this browser"}
            >
              <Icon name="speaker" size={18} />
              {speechState === "speaking" ? "Replay" : "Listen"}
            </button>
            <button
              id="btn-tts-pause"
              className="quiet-control"
              aria-label={speechState === "paused" ? "Resume speech" : "Pause speech"}
              disabled={!speechSupported || (speechState !== "speaking" && speechState !== "paused")}
              onClick={togglePause}
            >
              <Icon name={speechState === "paused" ? "play" : "pause"} size={17} />
              {speechState === "paused" ? "Resume" : "Pause"}
            </button>
            <button
              id="btn-tts-stop"
              className="quiet-control"
              aria-label="Stop speech"
              disabled={!speechSupported || (speechState !== "speaking" && speechState !== "paused")}
              onClick={stopSpeech}
            >
              <Icon name="stop" size={16} /> Stop audio
            </button>
            <span
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className={!speechSupported ? "audio-toolset__status" : "sr-only"}
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

        <div className="step-navigation">
          <button
            id="btn-prev-step"
            className="quiet-control"
            onClick={goPrevious}
            disabled={isFirst}
            aria-label="Go to previous step"
          >
            <Icon name="arrow-left" size={18} /> Previous
          </button>
          {isLast ? (
            <button
              id="btn-complete-activity"
              className="btn-primary"
              onClick={() => {
                stopSpeech();
                onComplete();
              }}
              aria-label="Complete quest"
            >
              Complete quest <Icon name="check" size={18} />
            </button>
          ) : (
            <button id="btn-next-step" className="btn-primary" onClick={goNext} aria-label="Go to next step">
              Next <Icon name="arrow-right" size={18} />
            </button>
          )}
        </div>

        <div className="quest-exit">
          <button
            id="btn-stop-activity"
            className="text-action text-action--secondary"
            onClick={() => {
              stopSpeech();
              onStop();
            }}
            aria-label="Stop quest and go to feedback"
          >
            Stop quest
          </button>
        </div>
      </div>
    </main>
  );
}
