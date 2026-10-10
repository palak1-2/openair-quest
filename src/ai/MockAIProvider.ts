import type { LocalLLMProvider, LocalVisionProvider, VisionAnalysis } from "@/ai/AIProvider";
import { buildConstraints } from "@/accessibility/accessibilityEngine";
import { normaliseEnvironment } from "@/accessibility/constraints";
import { getValidatedFallbackMission } from "@/fallback/fallbackMissions";
import { ConstraintSchema } from "@/schemas/constraints";
import { MissionSchema } from "@/schemas/mission";
import { SceneSchema } from "@/schemas/scene";
import type {
  AccessibilityMode,
  ConstraintObject,
  EnvironmentOption,
  Mission,
  PersonalizationContext,
  SceneContext,
  UserPreferences,
} from "@/types";
import { getManualSceneContext } from "@/ai/manualScene";
import { validateSafety } from "@/validation/safetyValidator";

const MANUAL_ENVIRONMENTS: EnvironmentOption[] = [
  "park",
  "garden",
  "campus",
  "neighborhood",
  "not-sure",
];

function hasManualEnvironment(environment: unknown): environment is EnvironmentOption {
  return typeof environment === "string" &&
    MANUAL_ENVIRONMENTS.some((option) => option === environment);
}

export class MockVisionProvider implements LocalVisionProvider {
  async analyze(image: Blob | undefined, manualEnvironment: string): Promise<VisionAnalysis> {
    const environment = getManualSceneContext(manualEnvironment);
    const scene = image
      ? {
          ...environment,
          general_context: "Deterministic mock context from the selected environment; the image was not analyzed.",
        }
      : environment;
    return { scene, source: "manual" };
  }
}

function buildSteps(
  mode: AccessibilityMode,
  scene: SceneContext,
  personalization?: PersonalizationContext,
): string[] {
  const environment = scene.environment.toLowerCase();
  const place = environment.includes("campus") || environment.includes("university") ||
      environment.includes("school") || environment.includes("college")
    ? {
        name: "Campus",
        opening: "Pause where you are on campus.",
        focus: "Notice a nearby building's shape.",
        detail: "Find a change in colour or light around you.",
      }
    : environment.includes("garden")
      ? {
          name: "Garden",
          opening: "Pause where you are in the garden.",
          focus: "Notice a leaf, flower, or plant nearby.",
          detail: "Look for a small difference in shape or colour.",
        }
      : environment.includes("neighborhood") || environment.includes("neighbourhood")
        ? {
            name: "Neighborhood",
            opening: "Pause where you are in your neighborhood.",
            focus: "Notice a repeating shape in your surroundings.",
            detail: "Find a colour in a nearby building, plant, or path.",
          }
        : environment.includes("park")
          ? {
              name: "Park",
              opening: "Pause where you are in the park.",
              focus: "Notice the shape of a tree or plant nearby.",
              detail: "Find a patch of colour in the open space around you.",
            }
          : {
              name: "Outdoor",
              opening: "Pause in a comfortable place outside.",
              focus: "Notice one shape in your surroundings.",
              detail: "Find one nearby detail with a colour you enjoy.",
            };

  if (personalization?.difficultyAdjustment === "simpler") {
    return [
      mode === "simple-steps" ? "Pause comfortably." : place.opening,
      mode === "simple-steps" ? place.focus.replace(/^Notice a /, "Look at a ") : place.focus,
      "Finish whenever you feel ready.",
    ];
  }

  const quietObservation = personalization?.sensoryAdjustment === "quieter";
  const observation = mode === "simple-steps"
    ? place.focus.replace(/^Notice a /, "Look at a ")
    : place.focus;
  const soundStep = mode === "audio-first"
    ? quietObservation ? "Notice one nearby detail at your own pace." : "Listen for one sound nearby."
    : mode === "quiet"
      ? quietObservation ? "Notice one gentle detail nearby." : "Listen for a quiet sound."
      : place.detail;
  return [
    place.opening,
    observation,
    place.detail,
    soundStep,
    "Finish whenever you feel ready.",
  ];
}

export class MockLLMProvider implements LocalLLMProvider {
  async generateMission(
    constraints: ConstraintObject,
    scene: SceneContext,
    personalization?: PersonalizationContext,
  ): Promise<Mission> {
    const steps = buildSteps(constraints.mode, scene, personalization);
    const environmentName = scene.environment === "outdoor area"
      ? "your outdoor surroundings"
      : `the ${scene.environment}`;
    const isCampus = /campus|university|college|school/i.test(scene.environment);
    const title = isCampus
      ? "Campus Details"
      : /garden/i.test(scene.environment)
        ? "Garden Noticing"
        : /neighbou?rhood/i.test(scene.environment)
          ? "Neighborhood Patterns"
          : /park/i.test(scene.environment)
            ? "Park Noticing"
            : "Outdoor Noticing";

    return {
      title,
      summary: `A gentle ${constraints.durationMinutes}-minute activity for noticing details in ${environmentName}.`,
      durationMinutes: constraints.durationMinutes,
      steps,
      audioVersion: steps.map((step) => step),
      comfortAdjustment: personalization?.preferredCharacteristics.includes("low-pressure-pacing")
        ? "Take your time; pause or stop whenever you wish."
        : personalization?.preferredCharacteristics.includes("continue-enjoyable-format")
          ? "Keep a familiar, enjoyable activity style; pause or stop whenever you wish."
          : "Pause or stop whenever you wish; there is no pressure to continue.",
      safetyNote: "Stay in a place where you feel comfortable and aware of your surroundings.",
    };
  }
}

export const mockVisionProvider = new MockVisionProvider();
export const mockLLMProvider = new MockLLMProvider();

export interface MissionPipelineResult {
  mission: Mission;
  usedFallback: boolean;
  usedManualEnvironmentRecovery?: boolean;
  fallbackReason?: MissionFallbackReason;
  scene?: SceneContext;
  sceneSource?: "vision" | "manual";
}

export type MissionFallbackReason =
  | "provider-unavailable"
  | "generation-failed"
  | "scene-invalid"
  | "constraints-invalid"
  | "mission-invalid"
  | "duration-mismatch"
  | "mission-unsafe";

export type MissionGenerationStage = "understanding" | "adapting" | "preparing";

export async function generateMissionPipelineWithFallback(
  preferences: UserPreferences,
  vision: LocalVisionProvider = mockVisionProvider,
  llm: LocalLLMProvider = mockLLMProvider,
  personalization?: PersonalizationContext,
  onStage?: (stage: MissionGenerationStage) => void,
): Promise<MissionPipelineResult> {
  console.info("[OpenAir Quest][AI] Pipeline started.", {
    visionProvider: vision.constructor.name,
    llmProvider: llm.constructor.name,
    imageSelected: preferences.photo !== undefined,
  });
  let usedManualEnvironmentRecovery = false;
  let sceneSource: "vision" | "manual" | undefined;
  let validatedScene: SceneContext | undefined;
  let generationAttempted = false;
  const fallbackResult = (reason: MissionFallbackReason): MissionPipelineResult => {
    const fallbackScene = validatedScene ??
      (hasManualEnvironment(preferences.environment)
        ? getManualSceneContext(preferences.environment)
        : undefined);
    return {
      mission: getValidatedFallbackMission(
        preferences.mode,
        preferences.environment,
        preferences.durationMinutes,
        fallbackScene,
      ),
      usedFallback: true,
      usedManualEnvironmentRecovery: usedManualEnvironmentRecovery ||
        (preferences.photo !== undefined && fallbackScene !== undefined && sceneSource !== "vision"),
      fallbackReason: reason,
      scene: fallbackScene,
      sceneSource: validatedScene ? sceneSource : fallbackScene ? "manual" : undefined,
    };
  };
  const reportStage = (stage: MissionGenerationStage) => {
    try {
      onStage?.(stage);
    } catch (error: unknown) {
      console.warn("[OpenAir Quest][AI] Progress listener failed.", error);
    }
  };
  try {
    reportStage("understanding");
    console.info("[OpenAir Quest][AI] Vision stage started.", {
      imageSelected: preferences.photo !== undefined,
    });
    let scene: SceneContext;
    try {
      const analysis = await vision.analyze(preferences.photo, preferences.environment);
      scene = analysis.scene;
      sceneSource = preferences.photo ? analysis.source : "manual";
      console.info("[OpenAir Quest][AI] Vision stage completed.");
    } catch (error: unknown) {
      if (!hasManualEnvironment(preferences.environment)) {
        throw error;
      }
      console.warn("[OpenAir Quest][AI] Vision failed; continuing with manual environment context.");
      usedManualEnvironmentRecovery = preferences.photo !== undefined;
      scene = getManualSceneContext(preferences.environment);
      sceneSource = "manual";
    }

    let parsedScene = SceneSchema.safeParse(scene);
    if (!parsedScene.success) {
      if (preferences.photo && hasManualEnvironment(preferences.environment)) {
        console.warn("[OpenAir Quest][AI] Vision returned invalid scene data; continuing with manual environment context.");
        usedManualEnvironmentRecovery = preferences.photo !== undefined;
        scene = getManualSceneContext(preferences.environment);
        sceneSource = "manual";
        parsedScene = SceneSchema.safeParse(scene);
      }
      if (!parsedScene.success) {
        console.warn("[OpenAir Quest][AI] Invalid scene schema; using built-in fallback.");
        return fallbackResult("scene-invalid");
      }
    }
    const sceneContext = parsedScene.data;
    validatedScene = sceneContext;

    reportStage("adapting");
    const environment = normaliseEnvironment(sceneContext.environment);
    const constraints = buildConstraints(
      preferences.mode,
      preferences.durationMinutes,
      environment,
    );
    const validatedConstraints = ConstraintSchema.safeParse(constraints);
    if (!validatedConstraints.success) {
      console.warn("[OpenAir Quest][AI] Invalid accessibility constraints; using built-in fallback.");
      return fallbackResult("constraints-invalid");
    }

    reportStage("preparing");
    console.info("[OpenAir Quest][AI] LLM stage started.");
    generationAttempted = true;
    const generated = await llm.generateMission(
      validatedConstraints.data,
      sceneContext,
      personalization,
    );
    console.info("[OpenAir Quest][AI] LLM stage completed.");
    const validatedMission = MissionSchema.safeParse(generated);
    if (!validatedMission.success) {
      console.warn("[OpenAir Quest][AI] Invalid mission schema; using built-in fallback.");
      return fallbackResult("mission-invalid");
    }
    if (validatedMission.data.durationMinutes !== validatedConstraints.data.durationMinutes) {
      console.warn("[OpenAir Quest][AI] Mission duration mismatch; using built-in fallback.");
      return fallbackResult("duration-mismatch");
    }
    if (!validateSafety(validatedMission.data).safe) {
      console.warn("[OpenAir Quest][AI] Mission safety validation failed; using built-in fallback.");
      return fallbackResult("mission-unsafe");
    }

    return {
      mission: validatedMission.data,
      usedFallback: false,
      usedManualEnvironmentRecovery,
      scene: sceneContext,
      sceneSource,
    };
  } catch (error: unknown) {
    console.error("[OpenAir Quest][AI] Provider pipeline failed; using built-in fallback.", {
      error,
      message: error instanceof Error ? error.message : undefined,
    });
    return fallbackResult(generationAttempted ? "generation-failed" : "provider-unavailable");
  }
}

export async function generateMissionPipeline(
  preferences: UserPreferences,
  vision: LocalVisionProvider = mockVisionProvider,
  llm: LocalLLMProvider = mockLLMProvider,
  personalization?: PersonalizationContext,
): Promise<Mission> {
  const { mission } = await generateMissionPipelineWithFallback(
    preferences,
    vision,
    llm,
    personalization,
  );
  return mission;
}
