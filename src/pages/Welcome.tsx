import type { JSX } from "react";
import { Icon } from "@/Icon";
import { ResponsiveLandscape } from "@/landscape/ResponsiveLandscape";

interface WelcomeProps {
  onStart: () => void;
}

export function Welcome({ onStart }: WelcomeProps): JSX.Element {
  return (
    <main className="page welcome-page" id="main-content" aria-label="Welcome to OpenAir Quest">
      <div className="welcome-composition">
        <section className="welcome-copy">
          <p className="eyebrow welcome-eyebrow">System initialized <span aria-hidden="true">—</span> Offline-ready</p>
          <h1 className="welcome-title">Your local AI outdoor companion.</h1>
          <p className="welcome-description">
            Short, mindful outdoor activities adapted entirely to your accessibility
            needs and the environment around you.
          </p>
          <button
            id="btn-start"
            className="btn-primary btn-primary--threshold"
            onClick={onStart}
            aria-label="Initialize exploration"
          >
            Initialize exploration <Icon name="arrow-right" size={19} />
          </button>
          <p className="welcome-privacy" role="note">
            <Icon name="shield-check" size={17} />
            Preferences and history stay on this device.
          </p>
        </section>
        <div className="welcome-landscape">
          <ResponsiveLandscape
            phase="welcome"
            awake
            mode={null}
            environment={null}
            stage={null}
            resolved={false}
          />
        </div>
      </div>
    </main>
  );
}
