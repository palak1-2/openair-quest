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

function formatVisionContext(scene: SceneContext): string {
  const rawEnvironment = scene.environment.trim();
  const environment = rawEnvironment.charAt(0).toLocaleUpperCase() + rawEnvironment.slice(1);
  const environmentIsDescriptive = SPECIFIC_ENVIRONMENT_TERMS.test(environment);
  const features = environmentIsDescriptive ? [] : scene.features.slice(0, 2);
  return [environment, ...features].join(" · ");
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
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--font-size-sm)", marginBottom: "var(--space-2)" }}>
            Your activity is ready
          </p>
          <h1 className="page__title">{mission.title}</h1>
          <p className="page__subtitle">{mission.summary}</p>
        </header>

        {session.runtimeProvider && (
          <div
            className="banner banner--info"
            role="note"
            style={{ marginBottom: "var(--space-6)", alignItems: "center" }}
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
          <div className="banner banner--info" role="status" style={{ marginBottom: "var(--space-6)" }}>
            The photo could not be used, so this activity was created using your selected environment.
          </div>
        )}

        {session.sceneSource === "vision" && session.scene && (
          <section
            aria-label="Context from your photo"
            style={{
              marginBottom: "var(--space-6)",
              color: "var(--color-text-muted)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <p style={{ fontWeight: "var(--font-weight-semi)", marginBottom: "var(--space-1)" }}>
              From your photo
            </p>
            <p>{formatVisionContext(session.scene)}</p>
          </section>
        )}

        {/* Meta row */}
        <div
          className="card"
          style={{
            display: "flex",
            gap: "var(--space-6)",
            flexWrap: "wrap",
            marginBottom: "var(--space-6)",
          }}
        >
          {session.mode && (
            <div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
                Mode
              </div>
              <div style={{ fontWeight: "var(--font-weight-semi)", textTransform: "capitalize" }}>
                {session.mode}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
              Duration
            </div>
            <div style={{ fontWeight: "var(--font-weight-semi)" }}>
              {mission.durationMinutes} min
            </div>
          </div>
          {session.environment && (
            <div>
              <div style={{ fontSize: "var(--font-size-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>
                Environment
              </div>
              <div style={{ fontWeight: "var(--font-weight-semi)", textTransform: "capitalize" }}>
                {session.environment.replace("-", " ")}
              </div>
            </div>
          )}
        </div>

        {/* Steps preview */}
        <section aria-labelledby="steps-heading">
          <h2
            id="steps-heading"
            style={{ fontSize: "var(--font-size-lg)", marginBottom: "var(--space-4)" }}
          >
            Steps
          </h2>
          <ol
            style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
            aria-label="Activity steps"
          >
            {mission.steps.map((step, i) => (
              <li
                key={i}
                className="card"
                style={{
                  display: "flex",
                  gap: "var(--space-4)",
                  alignItems: "flex-start",
                  padding: "var(--space-4) var(--space-5)",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    width: "1.75rem",
                    height: "1.75rem",
                    borderRadius: "var(--radius-full)",
                    background: "hsl(152 60% 48% / 0.15)",
                    color: "var(--color-primary)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-bold)",
                  }}
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
