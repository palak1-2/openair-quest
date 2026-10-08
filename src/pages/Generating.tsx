/**
 * src/pages/Generating.tsx
 *
 * Screen 4 — Generating
 *
 * Shown while the AI pipeline processes the user's input.
 * Communicates progress via accessible status messages.
 * No countdown timer — activity takes as long as it takes.
 *
 * Runs the selected local or deterministic mock provider pipeline.
 */
import { useEffect, useState } from "react";
import type { JSX } from "react";
import type { AccessibilityMode, DurationMinutes, EnvironmentOption, Mission } from "@/types";
import { generateSelectedMission } from "@/ai/providerFactory";
import type { ActivityRuntime, AIMode } from "@/ai/providerFactory";

interface SessionSnapshot {
  mode: AccessibilityMode | null;
  durationMinutes: DurationMinutes | null;
  environment: EnvironmentOption | null;
  photo: Blob | undefined;
  mission?: Mission | null;
  historyItemId?: string | null;
  usedLocalFallback?: boolean;
}

interface GeneratingProps {
  session: SessionSnapshot;
  onComplete: (
    mission: Mission,
    usedLocalFallback: boolean,
    usedManualEnvironmentRecovery: boolean,
    runtimeProvider: ActivityRuntime,
  ) => void;
  onError: () => void;
  aiMode: AIMode;
}

export function Generating({ session, onComplete, onError, aiMode }: GeneratingProps): JSX.Element {
  const [takingLonger, setTakingLonger] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => setTakingLonger(true), 15_000);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let active = true;
    console.info("[OpenAir Quest][FLOW] Generating page entered.", {
      mode: aiMode,
      preferencesReady: Boolean(session.mode && session.durationMinutes && session.environment),
      imageSelected: session.photo !== undefined,
    });
    if (!session.mode || !session.durationMinutes || !session.environment) {
      console.error("[OpenAir Quest][FLOW] Generation blocked: required preferences are missing.");
      onError();
      return () => {
        active = false;
      };
    }
    console.info("[OpenAir Quest][FLOW] Calling selected mission pipeline.", { mode: aiMode });
    void generateSelectedMission({
      mode: session.mode,
      durationMinutes: session.durationMinutes,
      environment: session.environment,
      photo: session.photo,
    }, aiMode).then(({ mission, usedLocalFallback, usedManualEnvironmentRecovery, runtimeProvider }) => {
      if (active) {
        console.info("[OpenAir Quest][FLOW] Mission pipeline returned.", { usedLocalFallback });
        onComplete(mission, usedLocalFallback, usedManualEnvironmentRecovery, runtimeProvider);
      }
    }).catch((error: unknown) => {
      console.error("[OpenAir Quest][FLOW] Mission pipeline rejected unexpectedly.", error);
      if (active) onError();
    });
    return () => {
      active = false;
    };
  }, [session, onComplete, onError, aiMode]);

  return (
    <main className="page" id="main-content" aria-label="Generating your activity">
      <div
        className="container"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
        }}
      >
        {/* Spinner */}
        <div
          className="spinner"
          role="status"
          aria-label="Loading"
          style={{ marginBottom: "var(--space-8)", width: "3.5rem", height: "3.5rem" }}
        />

        <h1
          className="page__title"
          style={{ marginBottom: "var(--space-4)", textAlign: "center" }}
        >
          Creating your activity
        </h1>

        {/* Live region for screen readers — updates as pipeline progresses */}
        <p
          className="status-live"
          aria-live="polite"
          aria-atomic="true"
          style={{ maxWidth: "20rem", textAlign: "center" }}
        >
          {takingLonger
            ? "This is taking a little longer than usual. Please keep this page open."
            : "Preparing your activity…"}
        </p>

        {/* Runtime mode is explicit while generation is in progress. */}
        <div
          className="banner banner--info"
          role="note"
          style={{ marginTop: "var(--space-8)", maxWidth: "24rem" }}
        >
          {aiMode === "local"
            ? "Local AI is preparing your activity on this device."
            : "Demo mode is preparing a deterministic activity. Photos are not analyzed."}
        </div>
      </div>
    </main>
  );
}
