/**
 * src/App.tsx
 *
 * OpenAir Quest — Root application component.
 *
 * Implements a simple useState-based screen router. No third-party router
 * is used; screen state is lifted here and passed down as props.
 *
 * Screen flow (from PRD §4):
 *   welcome → preferences → environment → generating → activity
 *   → active-activity → feedback → history
 *
 * Runs mock or local Ollama providers through one validated pipeline.
 */
import { useCallback, useState } from "react";
import type { JSX } from "react";
import "./index.css";

import { Welcome } from "./pages/Welcome";
import { Preferences } from "./pages/Preferences";
import { Environment } from "./pages/Environment";
import { Generating } from "./pages/Generating";
import { Activity } from "./pages/Activity";
import { ActiveActivity } from "./pages/ActiveActivity";
import { Feedback } from "./pages/Feedback";
import { History } from "./pages/History";
import { addHistoryItem } from "./storage/historyStore";
import { getConfiguredAIMode } from "./ai/providerFactory";
import type { ActivityRuntime, AIMode } from "./ai/providerFactory";
import type { MissionGenerationStage } from "./ai/MockAIProvider";
import { Icon } from "./Icon";

import type {
  AppScreen,
  AccessibilityMode,
  DurationMinutes,
  EnvironmentOption,
  Mission,
  SceneContext,
} from "./types";

/** Aggregated user selections that flow through the pipeline. */
interface SessionState {
  mode: AccessibilityMode | null;
  durationMinutes: DurationMinutes | null;
  environment: EnvironmentOption | null;
  photo: Blob | undefined;
  mission: Mission | null;
  historyItemId: string | null;
  usedLocalFallback: boolean;
  usedManualEnvironmentRecovery: boolean;
  runtimeProvider: ActivityRuntime | null;
  scene: SceneContext | null;
  sceneSource: "vision" | "manual" | null;
}

const INITIAL_SESSION: SessionState = {
  mode: null,
  durationMinutes: null,
  environment: null,
  photo: undefined,
  mission: null,
  historyItemId: null,
  usedLocalFallback: false,
  usedManualEnvironmentRecovery: false,
  runtimeProvider: null,
  scene: null,
  sceneSource: null,
};

export default function App({ aiMode = getConfiguredAIMode() }: { aiMode?: AIMode }): JSX.Element {
  const [screen, setScreen] = useState<AppScreen>("welcome");
  const [session, setSession] = useState<SessionState>(INITIAL_SESSION);
  const [generationStage, setGenerationStage] = useState<MissionGenerationStage | null>(null);

  // ------------------------------------------------------------------
  // Navigation helpers
  // ------------------------------------------------------------------

  const goTo = useCallback((next: AppScreen) => {
    console.info("[OpenAir Quest][FLOW] Navigating to screen.", { screen: next });
    setScreen(next);
    // Move focus to the top of the new screen for keyboard/SR users.
    // The <main id="main-content"> in each page is the focus target.
    requestAnimationFrame(() => {
      const main = document.getElementById("main-content");
      if (main) {
        main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: false });
      }
    });
  }, []);

  function resetSession() {
    setSession(INITIAL_SESSION);
    setGenerationStage(null);
    goTo("welcome");
  }

  // ------------------------------------------------------------------
  // Screen render
  // ------------------------------------------------------------------

  function renderScreen(): JSX.Element {
    switch (screen) {
      case "welcome":
        return <Welcome onStart={() => goTo("preferences")} />;

      case "preferences":
        return (
          <Preferences
            onComplete={(mode, duration) => {
              setSession((s) => ({ ...s, mode, durationMinutes: duration }));
              goTo("environment");
            }}
            onBack={() => goTo("welcome")}
          />
        );

      case "environment":
        return (
          <Environment
            onComplete={(environment, photo) => {
              console.info("[OpenAir Quest][FLOW] Saving environment and preferences.", {
                screen: "generating",
                imageSelected: photo !== undefined,
                preferencesReady: session.mode !== null && session.durationMinutes !== null,
              });
              setGenerationStage(null);
              setSession((s) => ({ ...s, environment, photo }));
              goTo("generating");
            }}
            onBack={() => goTo("preferences")}
            aiMode={aiMode}
          />
        );

      case "generating":
        return (
          <Generating
            session={session}
            aiMode={aiMode}
            onStage={setGenerationStage}
            onComplete={handleGenerationComplete}
            onError={handleGenerationError}
          />
        );

      case "activity":
        return (
          <Activity
            session={session}
            onStart={() => goTo("active-activity")}
            onRestart={() => {
              setGenerationStage(null);
              goTo("generating");
            }}
            onBack={() => goTo("environment")}
          />
        );

      case "active-activity":
        return (
          <ActiveActivity
            session={session}
            onComplete={() => {
              if (session.mission && session.mode && session.environment) {
                const id = globalThis.crypto?.randomUUID?.()
                  ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
                addHistoryItem({
                  id,
                  mission: session.mission,
                  mode: session.mode,
                  environment: session.environment,
                  completedAt: new Date().toISOString(),
                });
                setSession((s) => ({ ...s, historyItemId: id }));
              }
              goTo("feedback");
            }}
            onStop={() => goTo("feedback")}
          />
        );

      case "feedback":
        return (
          <Feedback
            session={session}
            historyItemId={session.historyItemId}
            onDone={() => goTo("history")}
            onStartNew={() => resetSession()}
          />
        );

      case "history":
        return (
          <History
            onStartNew={() => resetSession()}
          />
        );
    }
  }

  const handleGenerationComplete = useCallback((
    mission: Mission,
    usedLocalFallback: boolean,
    usedManualEnvironmentRecovery: boolean,
    runtimeProvider: ActivityRuntime,
    scene?: SceneContext,
    sceneSource?: "vision" | "manual",
  ) => {
    console.info("[OpenAir Quest][FLOW] Generation completed; opening Activity.", {
      usedLocalFallback,
    });
    setSession((s) => ({
      ...s,
      mission,
      usedLocalFallback,
      usedManualEnvironmentRecovery,
      runtimeProvider,
      scene: scene ?? null,
      sceneSource: sceneSource ?? null,
    }));
    goTo("activity");
  }, [goTo]);

  const handleGenerationError = useCallback(() => {
    console.error("[OpenAir Quest][FLOW] Generation could not start; returning to Environment.");
    goTo("environment");
  }, [goTo]);

  const stateLabel: Record<AppScreen, string> = {
    welcome: "A moment outdoors, made for you",
    preferences: "Comfort comes first",
    environment: "Start with the place around you",
    generating: generationStage === "understanding"
      ? "Understanding your surroundings"
      : generationStage === "adapting"
        ? "Adapting to your comfort"
        : "Preparing your quest",
    activity: "A field guide for right now",
    "active-activity": "Take this one step at a time",
    feedback: "Keep a moment from the day",
    history: "Your outdoor journal",
  };

  return (
    <div className="app-shell" data-screen={screen} data-stage={generationStage ?? "none"}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <header className="brand-header">
        <div className="brand-lockup" aria-label="OpenAir Quest, an outdoor companion">
          <span className="brand-mark"><Icon name="tree" size={21} /></span>
          <span className="brand-copy">
            <span className="brand-name">OpenAir Quest</span>
            <span className="brand-tagline">Outside, at your own pace.</span>
          </span>
        </div>
        <p className="brand-state" aria-live="polite">{stateLabel[screen]}</p>
      </header>
      <div key={screen} className="screen-transition">
        {renderScreen()}
      </div>
    </div>
  );
}
