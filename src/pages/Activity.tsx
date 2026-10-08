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
import type { AccessibilityMode, DurationMinutes, EnvironmentOption, Mission } from "@/types";

interface SessionSnapshot {
  mode: AccessibilityMode | null;
  durationMinutes: DurationMinutes | null;
  environment: EnvironmentOption | null;
  photo: Blob | undefined;
  mission: Mission | null;
  historyItemId?: string | null;
  usedLocalFallback?: boolean;
  usedManualEnvironmentRecovery?: boolean;
}

interface ActivityProps {
  session: SessionSnapshot;
  onStart: () => void;
  onRestart: () => void;
  onBack: () => void;
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

        {session.usedLocalFallback && (
          <div className="banner banner--info" role="status" style={{ marginBottom: "var(--space-6)" }}>
            Local AI could not create an activity this time, so a built-in activity is ready.
          </div>
        )}

        {session.usedManualEnvironmentRecovery && (
          <div className="banner banner--info" role="status" style={{ marginBottom: "var(--space-6)" }}>
            The photo could not be used, so this activity was created using your selected environment.
          </div>
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
