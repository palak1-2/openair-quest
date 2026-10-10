import type { JSX } from "react";
import type { ActivityRuntime } from "@/ai/providerFactory";
import type { MissionFallbackReason } from "@/ai/MockAIProvider";
import type { AccessibilityMode, DurationMinutes, EnvironmentOption, Mission, SceneContext } from "@/types";
import { Icon } from "@/Icon";

interface SessionSnapshot {
  mode: AccessibilityMode | null;
  durationMinutes: DurationMinutes | null;
  environment: EnvironmentOption | null;
  photo: Blob | undefined;
  mission: Mission | null;
  historyItemId?: string | null;
  usedLocalFallback?: boolean;
  usedManualEnvironmentRecovery?: boolean;
  fallbackReason?: MissionFallbackReason;
  runtimeProvider?: ActivityRuntime | null;
  scene?: SceneContext | null;
  sceneSource?: "vision" | "manual" | null;
}

interface ActivityProps {
  session: SessionSnapshot;
  onStart: () => void;
  onRestart: () => void;
  onBack: () => void;
}

const SPECIFIC_ENVIRONMENT_TERMS =
  /\b(courtyard|arboretum|botanical garden|greenhouse|plaza|terrace|playground)\b/i;

const ACCESSIBILITY_MODE_LABELS: Record<AccessibilityMode, string> = {
  quiet: "Quiet guidance",
  "audio-first": "Audio-first guidance",
  "simple-steps": "Simple steps",
};

function formatVisionContext(scene: SceneContext): string {
  const rawEnvironment = scene.environment.trim();
  const environment = rawEnvironment.charAt(0).toLocaleUpperCase() + rawEnvironment.slice(1);
  const environmentIsDescriptive = SPECIFIC_ENVIRONMENT_TERMS.test(environment);
  const features = environmentIsDescriptive ? [] : scene.features.slice(0, 2);
  return [environment, ...features].join(" · ");
}

function formatEnvironment(environment: EnvironmentOption): string {
  return environment.replace("-", " ");
}

function runtimeLabel(
  runtime: ActivityRuntime,
  _usedLocalFallback?: boolean,
  _fallbackReason?: MissionFallbackReason,
): string {
  if (runtime === "local-ai") return "Local AI · Generated on this device";
  if (runtime === "mock") return "Demo mode · Deterministic activity";
  return "Built-in activity · Generated output not used";
}

function fallbackMessage(
  _reason: MissionFallbackReason,
  sceneSource: "vision" | "manual" | null | undefined,
): string {
  const context = sceneSource === "vision"
    ? "It uses the validated context from your photo and your comfort profile."
    : "It uses the environment you selected and your comfort profile.";
  return `Generated output was unavailable or did not pass validation, so this built-in quest is shown. ${context}`;
}

export function Activity({ session, onStart, onRestart, onBack }: ActivityProps): JSX.Element {
  const mission = session.mission;
  if (!mission) {
    return (
      <main className="page" id="main-content" aria-label="Quest briefing">
        <div className="page-frame">
          <p className="form-error" role="alert">No validated quest is available. Return to your surroundings and try again.</p>
          <button className="text-action" onClick={onBack}><Icon name="arrow-left" size={18} /> Back</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page quest-page" id="main-content" aria-label="Quest briefing">
      <div className="page-frame quest-frame">
        <header className="quest-heading">
          <p className="eyebrow">Active quest briefing</p>
          <h1 className="quest-title">{mission.title}</h1>
          <p className="quest-summary">{mission.summary}</p>
        </header>

        <ul className="quest-meta" aria-label="Quest details">
          <li>{mission.durationMinutes} minutes</li>
          {session.mode && <li>{ACCESSIBILITY_MODE_LABELS[session.mode]}</li>}
          {session.environment && <li className="capitalize">{formatEnvironment(session.environment)}</li>}
        </ul>

        {session.runtimeProvider && (
          <p className="quest-runtime" role="note">
            <Icon name={session.runtimeProvider === "local-ai" ? "shield-check" : "info"} size={17} />
            {runtimeLabel(
              session.runtimeProvider,
              session.usedLocalFallback,
              session.fallbackReason,
            )}
          </p>
        )}

        {session.fallbackReason && (
          <p className="quest-recovery" role="status">
            {fallbackMessage(session.fallbackReason, session.sceneSource)}
          </p>
        )}

        {session.photo && session.sceneSource !== "vision" && (
          <p className="quest-recovery" role="status">
            The photo was not analyzed, so this quest follows the environment you selected.
          </p>
        )}

        {session.sceneSource === "vision" && session.scene && (
          <section className="photo-insight" aria-label="Context from your photo">
            <span className="photo-insight__marker"><Icon name="camera" size={19} /></span>
            <div>
              <p className="eyebrow">From your photo</p>
              <p className="photo-insight__description">{formatVisionContext(session.scene)}</p>
            </div>
          </section>
        )}

        <section className="field-notes" aria-labelledby="field-notes-heading">
          <div className="field-notes__heading">
            <h2 id="field-notes-heading" className="eyebrow">A few things to notice</h2>
            <span aria-hidden="true">{String(mission.steps.length).padStart(2, "0")} moments</span>
          </div>
          <ol className="field-notes__list">
            {mission.steps.map((step, index) => (
              <li key={`${index}-${step}`} className="field-note">
                <span className="field-note__number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <p>{step}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="quest-actions">
          <button
            id="btn-start-activity"
            className="btn-primary"
            onClick={onStart}
            aria-label="Begin quest"
          >
            Begin quest <Icon name="arrow-right" size={19} />
          </button>
          <button id="btn-regenerate" className="text-action" onClick={onRestart}>
            Prepare a different quest
          </button>
          <button id="btn-back-activity" className="text-action quest-actions__back" onClick={onBack}>
            <Icon name="arrow-left" size={18} /> Back to surroundings
          </button>
        </div>
      </div>
    </main>
  );
}
