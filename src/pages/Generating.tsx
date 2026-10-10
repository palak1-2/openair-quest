import { useCallback, useEffect, useState } from "react";
import type { JSX } from "react";
import type { AccessibilityMode, DurationMinutes, EnvironmentOption, Mission, SceneContext } from "@/types";
import { generateSelectedMission } from "@/ai/providerFactory";
import type { ActivityRuntime, AIMode } from "@/ai/providerFactory";
import type { MissionGenerationStage } from "@/ai/MockAIProvider";
import { Icon } from "@/Icon";

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
    scene?: SceneContext,
    sceneSource?: "vision" | "manual",
  ) => void;
  onError: () => void;
  onStage: (stage: MissionGenerationStage) => void;
  aiMode: AIMode;
}

const STAGES: {
  id: MissionGenerationStage;
  title: string;
  manual: string;
  localVision: string;
}[] = [
  {
    id: "understanding",
    title: "Understanding your surroundings",
    manual: "Starting with the environment you chose",
    localVision: "Considering visual context on this device",
  },
  {
    id: "adapting",
    title: "Adapting to your comfort",
    manual: "Applying your comfort profile and sensory preferences",
    localVision: "Applying your comfort profile to the validated scene",
  },
  {
    id: "preparing",
    title: "Preparing your quest",
    manual: "Shaping a suitable activity for your chosen duration",
    localVision: "Shaping a suitable activity for your chosen duration",
  },
];

export function Generating({
  session,
  onComplete,
  onError,
  onStage,
  aiMode,
}: GeneratingProps): JSX.Element {
  const [stage, setStage] = useState<MissionGenerationStage>("understanding");
  const [takingLonger, setTakingLonger] = useState(false);
  const updateStage = useCallback((next: MissionGenerationStage) => {
    setStage(next);
    onStage(next);
  }, [onStage]);

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

    void generateSelectedMission({
      mode: session.mode,
      durationMinutes: session.durationMinutes,
      environment: session.environment,
      photo: session.photo,
    }, aiMode, updateStage).then((result) => {
      if (active) {
        onComplete(
          result.mission,
          result.usedLocalFallback,
          result.usedManualEnvironmentRecovery,
          result.runtimeProvider,
          result.scene,
          result.sceneSource,
        );
      }
    }).catch((error: unknown) => {
      console.error("[OpenAir Quest][FLOW] Mission pipeline rejected unexpectedly.", error);
      if (active) onError();
    });
    return () => {
      active = false;
    };
  }, [session, onComplete, onError, aiMode, updateStage]);

  const currentIndex = STAGES.findIndex(({ id }) => id === stage);
  const current = STAGES[currentIndex] ?? STAGES[0];
  const description = session.photo && aiMode === "local"
    ? current.localVision
    : current.manual;

  return (
    <main className="page preparing-page" id="main-content" aria-label="Preparing your quest">
      <div className="preparing-layout">
        <section className="preparing-story" aria-labelledby="preparing-title">
          <p className="eyebrow">A moment of understanding</p>
          <h1 id="preparing-title" className="preparing-title">{current.title}</h1>
          <p className="preparing-description" aria-live="polite" aria-atomic="true">
            {description}
          </p>
          <ol className="preparation-stages" aria-label="Quest preparation">
            {STAGES.map(({ id, title }, index) => {
              const complete = index < currentIndex;
              const currentStage = index === currentIndex;
              return (
                <li
                  key={id}
                  className={`preparation-stage${complete ? " is-complete" : ""}${currentStage ? " is-current" : ""}`}
                  aria-current={currentStage ? "step" : undefined}
                >
                  <span className="preparation-stage__mark">
                    {complete ? <Icon name="check" size={15} /> : <span />}
                  </span>
                  <span>{title}</span>
                </li>
              );
            })}
          </ol>
          <p className="preparing-runtime" role="note">
            <Icon name={aiMode === "local" ? "shield-check" : "info"} size={17} />
            {aiMode === "local"
              ? "Your activity is being prepared locally on this device."
              : "Demo mode uses your selected environment; photos are not analyzed."}
          </p>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {takingLonger
              ? "This is taking a little longer than usual. Please keep this page open."
              : `${current.title}. ${description}.`}
          </p>
        </section>
        <div className="preparing-imprint" aria-hidden="true">
          <span className="preparing-imprint__ring" />
          <span className="preparing-imprint__ring preparing-imprint__ring--inner" />
          <span className="preparing-imprint__seed" />
          <span className="preparing-imprint__caption">The place · your pace</span>
        </div>
      </div>
    </main>
  );
}
