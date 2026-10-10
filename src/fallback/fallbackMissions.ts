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
import type { Mission, EnvironmentOption, AccessibilityMode, SceneContext } from "@/types";
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
  environment: EnvironmentOption | string,
  scene?: SceneContext,
): Mission {
  const place = typeof scene?.environment === "string"
    ? scene.environment.toLowerCase()
    : typeof environment === "string"
      ? environment.toLowerCase()
      : "";
  const context = /campus|university|college|school/.test(place)
    ? {
        title: "Campus Details",
        summary: "A gentle activity for noticing shapes and colours in the campus surroundings.",
        first: "Notice one detail in a nearby building's shape.",
        second: "Find a change in colour or light around the campus.",
        third: "Notice a plant or open space within view.",
      }
    : /garden/.test(place)
      ? {
          title: "Garden Noticing",
          summary: "A gentle activity for noticing plants, shapes, and colours in a garden.",
          first: "Notice a leaf, flower, or plant nearby.",
          second: "Look for a small difference in shape or colour.",
          third: "Notice one detail in the garden around you.",
        }
      : /neighbou?rhood/.test(place)
        ? {
            title: "Neighborhood Patterns",
            summary: "A gentle activity for noticing patterns in your neighborhood surroundings.",
            first: "Notice a repeating shape in the nearby surroundings.",
            second: "Find a colour on a nearby building, plant, or path.",
            third: "Notice one detail in the neighborhood around you.",
          }
        : /park/.test(place)
          ? {
              title: "Park Noticing",
              summary: "A gentle activity for noticing natural details in a park.",
              first: "Notice the shape of a tree or plant nearby.",
              second: "Find a patch of colour in the open space around you.",
              third: "Notice one detail in the park around you.",
            }
          : {
              title: "Outdoor Noticing",
              summary: "A gentle activity for noticing simple details in your outdoor surroundings.",
              first: "Notice one shape in your surroundings.",
              second: "Find one nearby detail with a colour you enjoy.",
              third: "Notice one natural or built detail within view.",
            };

  const firstStep = mode === "simple-steps"
    ? context.first.replace(/^Notice /, "Look at ")
    : context.first;
  const secondStep = mode === "audio-first"
    ? "Pause and notice one sound nearby."
    : context.second;
  const steps = [
    "Pause in a comfortable place.",
    firstStep,
    secondStep,
    context.third,
    "Finish whenever you feel ready.",
  ];

  switch (mode) {
    case "simple-steps":
    case "audio-first":
    case "quiet":
      return {
        title: context.title,
        summary: context.summary,
        durationMinutes: 5,
        steps,
        audioVersion: steps,
        comfortAdjustment: "Stop whenever you want. There is no pressure to continue.",
        safetyNote: "Stay in a comfortable area. Stop if you feel unsure.",
      };
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
  scene?: SceneContext,
): Mission {
  return validateFallbackMission(
    getFallbackMission(mode, environment, scene),
    durationMinutes,
  );
}
