/**
 * src/pages/Welcome.tsx
 *
 * Screen 1 — Welcome
 *
 * Introduces OpenAir Quest and invites the user to start.
 * First meaningful content on load; contains the app's only <h1>.
 */
import type { JSX } from "react";

interface WelcomeProps {
  onStart: () => void;
}

export function Welcome({ onStart }: WelcomeProps): JSX.Element {
  return (
    <main className="page" id="main-content" aria-label="Welcome to OpenAir Quest">
      <div className="container">
        {/* Hero */}
        <header className="page__header">
          <p className="page__subtitle" aria-hidden="true" style={{ fontSize: "3rem", marginBottom: "1rem" }}>
            🌿
          </p>
          <h1 className="page__title">OpenAir Quest</h1>
          <p className="page__subtitle">
            Short outdoor activities adapted to your accessibility preferences
            and the environment around you.
          </p>
        </header>

        {/* Feature highlights */}
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <ul style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {[
              { icon: "🔒", text: "Fully offline — no internet required" },
              { icon: "♿", text: "Built for accessibility — quiet, audio, or simple-steps modes" },
              { icon: "🤖", text: "Optional local open-weight AI, with built-in mock activities" },
              { icon: "🌳", text: "Activities adapted to your environment" },
            ].map(({ icon, text }) => (
              <li key={text} style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <span aria-hidden="true" style={{ fontSize: "1.25rem" }}>{icon}</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Privacy note */}
        <div className="banner banner--info" role="note" aria-label="Privacy information">
          Preferences and history stay on this device. In local AI mode, uploaded
          photos are sent only to Ollama running on this device; mock mode does
          not analyze photos.
        </div>

        {/* Primary action */}
        <div className="page__actions">
          <button
            id="btn-start"
            className="btn-primary"
            onClick={onStart}
            aria-label="Start OpenAir Quest"
          >
            Start
          </button>
        </div>
      </div>
    </main>
  );
}
