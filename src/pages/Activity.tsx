/**
 * src/pages/Activity.tsx
 *
 * Screen 5 — Activity (preview before starting)
 *
 * Displays the generated mission for the user to review before beginning.
 * Displays the validated mission returned by the selected AI provider pipeline.
 *
 * User can:
 *   - Read title, summary, duration, and steps
 *   - Start the activity
 *   - Regenerate (go back to Generating)
 *   - Go back to Environment
 */
import type { JSX } from "react";
import type { ActivityRuntime } from "@/ai/providerFactory";
import type { AccessibilityMode, DurationMinutes, EnvironmentOption, Mission, SceneContext } from "@/types";

interface SessionSnapshot {
  mode: AccessibilityMode | null;
  durationMinutes: DurationMinutes | null;
  environment: EnvironmentOption | null;
  photo: Blob | undefined;
  mission: Mission | null;
  historyItemId?: string | null;
  usedLocalFallback?: boolean;
  usedManualEnvironmentRecovery?: boolean;
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
  quiet: "Quiet",
  "audio-first": "Audio-first",
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

export function Activity({ session, onStart, onRestart, onBack }: ActivityProps): JSX.Element {
  const mission = session.mission;

  if (!mission) {
    return (
      <main className="page" id="main-content" aria-label="Activity preview">
        <div className="container">
          <p role="alert">No validated activity is available. Please generate an activity first.</p>
          <button className="btn-secondary" onClick={onBack}>Back</button>
        </div>
      </main>
    );
  }

  return (
    <main className="page" id="main-content" aria-label="Activity preview">
      <div className="container">
        <header className="page__header">
          <p className="metadata-label">
            Your activity is ready
          </p>
          <h1 className="page__title">{mission.title}</h1>
          <p className="page__subtitle">{mission.summary}</p>
        </header>

        {session.runtimeProvider && (
          <div
            className="banner banner--info activity-banner"
            role="note"
          >
            {session.runtimeProvider === "local-ai" ? (
              <span><strong>Local AI</strong> · Generated on this device</span>
            ) : session.runtimeProvider === "mock" ? (
              <span><strong>Demo mode</strong> · Deterministic activity</span>
            ) : (
              <span>
                <strong>Built-in activity</strong>
                {" · "}
                {session.usedLocalFallback
                  ? "Local AI unavailable"
                  : "Ready-to-use fallback"}
              </span>
            )}
          </div>
        )}

        {session.usedManualEnvironmentRecovery && (
          <div className="banner banner--info activity-banner" role="status">
            The photo could not be used, so this activity was created using your selected environment.
          </div>
        )}

        {session.sceneSource === "vision" && session.scene && (
          <section
            aria-label="Context from your photo"
            className="photo-context"
          >
            <p className="photo-context__label">
              From your photo
            </p>
            <p>{formatVisionContext(session.scene)}</p>
          </section>
        )}

        {/* Meta row */}
        <div className="metadata-row">
          {session.mode && (
            <div>
              <div className="metadata-label">
                Mode
              </div>
              <div className="metadata-value">
                {ACCESSIBILITY_MODE_LABELS[session.mode]}
              </div>
            </div>
          )}
          <div>
            <div className="metadata-label">
              Duration
            </div>
            <div className="metadata-value">
              {mission.durationMinutes} min
            </div>
          </div>
          {session.environment && (
            <div>
              <div className="metadata-label">
                Environment
              </div>
              <div className="metadata-value" style={{ textTransform: "capitalize" }}>
                {formatEnvironment(session.environment)}
              </div>
            </div>
          )}
        </div>

        {/* Steps preview */}
        <section aria-labelledby="steps-heading">
          <h2
            id="steps-heading"
            className="section-heading"
          >
            Steps
          </h2>
          <ol
            className="step-list"
            aria-label="Activity steps"
          >
            {mission.steps.map((step, i) => (
              <li
                key={i}
                className="step-list__item"
              >
                <span
                  aria-hidden="true"
                  className="step-list__number"
                >
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* Actions */}
        <div className="page__actions">
          <button
            id="btn-start-activity"
            className="btn-primary"
            onClick={onStart}
            aria-label="Start activity"
          >
            Start activity
          </button>
          <button
            id="btn-regenerate"
            className="btn-secondary"
            onClick={onRestart}
            aria-label="Generate a different activity"
          >
            Try another
          </button>
          <button id="btn-back-activity" className="btn-secondary" onClick={onBack}>
            Back
          </button>
        </div>
      </div>
    </main>
  );
}
