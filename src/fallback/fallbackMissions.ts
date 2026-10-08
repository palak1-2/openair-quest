/**
 * src/fallback/fallbackMissions.ts
 *
 * Predefined fallback missions (AI_SPEC §19, PRD §14).
 *
 * Used when local AI is unavailable, produces invalid output,
 * or fails safety validation.
 *
 * All fallback missions:
 *   - Follow MissionSchema exactly
 *   - Pass safety validation
 *   - Are appropriate for each supported environment and accessibility mode
 *
 * Expanded in Phase 5 with more environment/mode combinations.
 */
import type { Mission, EnvironmentOption, AccessibilityMode } from "@/types";
import { MissionSchema } from "@/schemas/mission";
import { validateSafety } from "@/validation/safetyValidator";

/** A single validated fallback mission. */
const QUIET_NATURE_OBSERVATION: Mission = {
  title: "Quiet Nature Observation",
  summary: "A calm activity for gently noticing simple details in your surroundings.",
  durationMinutes: 10,
  steps: [
    "Find a comfortable place to stand or sit.",
    "Notice one tree, plant, or natural feature nearby.",
    "Look for one interesting colour in your surroundings.",
    "Pause quietly and notice any gentle sounds around you.",
    "When you feel ready, the activity is complete.",
  ],
  audioVersion: [
    "Find a comfortable place to stand or sit.",
    "Notice one tree, plant, or natural feature nearby.",
    "Look for one interesting colour in your surroundings.",
    "Pause quietly and notice any gentle sounds around you.",
    "When you feel ready, the activity is complete.",
  ],
  comfortAdjustment: "If anything feels uncomfortable, stop and rest. There is no pressure to continue.",
  safetyNote: "Stay aware of your surroundings. Stop if you feel uncomfortable at any point.",
};

const SIMPLE_STEPS_OBSERVATION: Mission = {
  title: "Simple Outdoor Noticing",
  summary: "One step at a time — notice simple things around you outdoors.",
  durationMinutes: 5,
  steps: [
    "Stop where you are.",
    "Look at one thing nearby.",
    "Notice its shape.",
    "Notice its colour.",
    "Take a slow breath.",
  ],
  audioVersion: [
    "Stop where you are.",
    "Look at one thing nearby.",
    "Notice its shape.",
    "Notice its colour.",
    "Take a slow breath.",
  ],
  comfortAdjustment: "Stop whenever you want. There is no right or wrong way to do this.",
  safetyNote: "Stay in a comfortable area. Stop if you feel unsure.",
};

const AUDIO_FIRST_OBSERVATION: Mission = {
  title: "Listen and Look",
  summary: "Short spoken steps to help you notice your surroundings.",
  durationMinutes: 5,
  steps: [
    "Find a place to stand still.",
    "Listen. What sounds do you hear?",
    "Look. What do you see nearby?",
    "Find one colour you like.",
    "You are done.",
  ],
  audioVersion: [
    "Find a place to stand still.",
    "Listen. What sounds do you hear?",
    "Look. What do you see nearby?",
    "Find one colour you like.",
    "You are done.",
  ],
  comfortAdjustment: "Stop at any step if you need a break.",
  safetyNote: "Stay where you feel safe. Stop if anything feels wrong.",
};

/** Default fallback used when no better match is available. */
export const DEFAULT_FALLBACK: Mission = QUIET_NATURE_OBSERVATION;

/**
 * Returns the most appropriate predefined fallback mission for the given
 * accessibility mode and environment.
 *
 * @param mode - User's accessibility mode.
 * @param _environment - User's selected environment (used in future refinements).
 * @returns A validated Mission safe for display.
 */
export function getFallbackMission(
  mode: AccessibilityMode,
  _environment: EnvironmentOption | string,
): Mission {
  switch (mode) {
    case "simple-steps":
      return SIMPLE_STEPS_OBSERVATION;
    case "audio-first":
      return AUDIO_FIRST_OBSERVATION;
    case "quiet":
    default:
      return QUIET_NATURE_OBSERVATION;
  }
}

export function validateFallbackMission(
  candidate: unknown,
  durationMinutes: Mission["durationMinutes"],
): Mission {
  const parsedCandidate = MissionSchema.safeParse(candidate);
  if (!parsedCandidate.success) {
    throw new Error("Built-in fallback mission failed schema validation.");
  }

  const parsedWithRequestedDuration = MissionSchema.safeParse({
    ...parsedCandidate.data,
    durationMinutes,
  });
  if (!parsedWithRequestedDuration.success) {
    throw new Error("Built-in fallback mission failed schema validation.");
  }
  if (!validateSafety(parsedWithRequestedDuration.data).safe) {
    throw new Error("Built-in fallback mission failed safety validation.");
  }

  return parsedWithRequestedDuration.data;
}

export function getValidatedFallbackMission(
  mode: AccessibilityMode,
  environment: EnvironmentOption | string,
  durationMinutes: Mission["durationMinutes"],
): Mission {
  return validateFallbackMission(
    getFallbackMission(mode, environment),
    durationMinutes,
  );
}
