import type { JSX } from "react";
import type { MissionGenerationStage } from "@/ai/MockAIProvider";
import type { AccessibilityMode, EnvironmentOption } from "@/types";

export type LandscapePhase =
  | "welcome"
  | "preferences"
  | "environment"
  | "generating"
  | "activity"
  | "settled";

export interface ResponsiveLandscapeProps {
  phase: LandscapePhase;
  awake: boolean;
  mode: AccessibilityMode | null;
  environment: EnvironmentOption | null;
  stage: MissionGenerationStage | null;
  resolved: boolean;
}

export function ResponsiveLandscape({
  phase,
  awake,
  mode,
  environment,
  stage,
  resolved,
}: ResponsiveLandscapeProps): JSX.Element {
  return (
    <div
      className="responsive-landscape"
      data-phase={phase}
      data-awake={awake ? "true" : "false"}
      data-mode={mode ?? "unset"}
      data-environment={environment ?? "unset"}
      data-stage={stage ?? "none"}
      data-resolved={resolved ? "true" : "false"}
      aria-hidden="true"
    >
      <svg className="responsive-landscape__svg" viewBox="0 0 440 360" fill="none">
        <circle className="landscape-sun" cx="286" cy="104" r="44" />
        <path
          className="landscape-line"
          d="M19 218c50-21 96-28 137-22 54 7 79 34 133 29 43-4 81-29 132-21"
        />
        <path
          className="landscape-line landscape-line--fine"
          d="M34 244c52-15 95-18 132-12 61 10 97 35 151 28 36-4 70-22 107-19"
        />
        <path
          className="landscape-ground"
          d="M17 274c50-21 100-28 146-20 58 10 92 37 148 30 40-5 76-28 112-21v79H17v-68Z"
        />
        <path
          className="landscape-tree"
          d="M337 278v-68m0-102 49 65h-29l36 44h-43l27 33h-80l27-33h-43l36-44h-29l49-65Z"
        />
        <path
          className="landscape-path"
          d="M197 360c23-35 27-64 20-88-6-20-19-30-19-49"
        />
        <path className="landscape-caption-line" d="M71 106h83M71 119h49" />
        <circle className="landscape-point" cx="63" cy="106" r="4" />
      </svg>
      {phase === "welcome" && (
        <span className="landscape-caption">A little more room to breathe</span>
      )}
    </div>
  );
}
