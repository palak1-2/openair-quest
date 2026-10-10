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
  environment: string,
  personalization?: PersonalizationContext,
): string[] {
  if (personalization?.difficultyAdjustment === "simpler") {
    if (mode === "audio-first") {
      return [
        "Pause in a comfortable place.",
        "Notice one nearby detail at your own pace.",
        "Finish whenever you feel ready.",
      ];
    }
    return [
      "Pause comfortably.",
      "Notice one nearby detail.",
      "Finish whenever you feel ready.",
    ];
  }

  const environmentLabel: Record<string, string> = {
    NATURAL_SPACE: "natural space",
    URBAN_SPACE: "urban space",
    CAMPUS: "campus",
    NEIGHBOURHOOD: "neighborhood",
    UNKNOWN: "your surroundings",
  };
  const place = environmentLabel[environment] ?? "your surroundings";
  const placePhrase = place === "your surroundings" ? place : `the ${place}`;
  const quietObservation = personalization?.sensoryAdjustment === "quieter";
  if (mode === "audio-first") {
    return [
      `Pause in a comfortable place in ${placePhrase}.`,
      quietObservation ? "Notice one nearby detail at your own pace." : "Listen for one sound nearby.",
      "Notice one shape around you.",
      "Notice one colour you enjoy.",
      "Finish whenever you feel ready.",
    ];
  }
  if (mode === "simple-steps") {
    return [
      "Pause in a comfortable place.",
      "Look at one nearby detail.",
      "Notice its shape.",
      "Notice its colour.",
      "Finish whenever you feel ready.",
    ];
  }
  return [
    `Pause in a comfortable place in ${placePhrase}.`,
    "Notice one plant or natural detail nearby.",
    "Find one gentle colour in your surroundings.",
    quietObservation ? "Notice one gentle detail nearby." : "Listen for a quiet sound.",
    "Finish whenever you feel ready.",
  ];
}

export class MockLLMProvider implements LocalLLMProvider {
  async generateMission(
    constraints: ConstraintObject,
    scene: SceneContext,
    personalization?: PersonalizationContext,
  ): Promise<Mission> {
    const steps = buildSteps(constraints.mode, constraints.environment, personalization);
    const environmentName = scene.environment === "outdoor area"
      ? "your outdoor surroundings"
      : `the ${scene.environment}`;

    return {
      title: constraints.mode === "audio-first" ? "Listen and Notice" : "Outdoor Noticing",
      summary: `A gentle ${constraints.durationMinutes}-minute activity for noticing simple details in ${environmentName}.`,
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
  scene?: SceneContext;
  sceneSource?: "vision" | "manual";
}

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
  let sceneSource: "vision" | "manual" = "manual";
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
      if (!preferences.photo || !hasManualEnvironment(preferences.environment)) {
        throw error;
      }
      console.warn("[OpenAir Quest][AI] Vision failed; continuing with manual environment context.");
      usedManualEnvironmentRecovery = true;
      scene = getManualSceneContext(preferences.environment);
      sceneSource = "manual";
    }

    let validatedScene = SceneSchema.safeParse(scene);
    if (!validatedScene.success) {
      if (preferences.photo && hasManualEnvironment(preferences.environment)) {
        console.warn("[OpenAir Quest][AI] Vision returned invalid scene data; continuing with manual environment context.");
        usedManualEnvironmentRecovery = true;
        scene = getManualSceneContext(preferences.environment);
        sceneSource = "manual";
        validatedScene = SceneSchema.safeParse(scene);
      }
      if (!validatedScene.success) {
        console.warn("[OpenAir Quest][AI] Invalid scene schema; using built-in fallback.");
        return {
          mission: getValidatedFallbackMission(
            preferences.mode,
            preferences.environment,
            preferences.durationMinutes,
          ),
          usedFallback: true,
        };
      }
    }

    reportStage("adapting");
    const environment = normaliseEnvironment(validatedScene.data.environment);
    const constraints = buildConstraints(
      preferences.mode,
      preferences.durationMinutes,
      environment,
    );
    const validatedConstraints = ConstraintSchema.safeParse(constraints);
    if (!validatedConstraints.success) {
      console.warn("[OpenAir Quest][AI] Invalid accessibility constraints; using built-in fallback.");
      return {
        mission: getValidatedFallbackMission(
          preferences.mode,
          preferences.environment,
          preferences.durationMinutes,
        ),
        usedFallback: true,
      };
    }

    reportStage("preparing");
    console.info("[OpenAir Quest][AI] LLM stage started.");
    const generated = await llm.generateMission(
      validatedConstraints.data,
      validatedScene.data,
      personalization,
    );
    console.info("[OpenAir Quest][AI] LLM stage completed.");
    const validatedMission = MissionSchema.safeParse(generated);
    if (!validatedMission.success) {
      console.warn("[OpenAir Quest][AI] Invalid mission schema; using built-in fallback.");
      return {
        mission: getValidatedFallbackMission(
          preferences.mode,
          preferences.environment,
          preferences.durationMinutes,
        ),
        usedFallback: true,
      };
    }
    if (validatedMission.data.durationMinutes !== validatedConstraints.data.durationMinutes) {
      console.warn("[OpenAir Quest][AI] Mission duration mismatch; using built-in fallback.");
      return {
        mission: getValidatedFallbackMission(
          preferences.mode,
          preferences.environment,
          preferences.durationMinutes,
        ),
        usedFallback: true,
      };
    }
    if (!validateSafety(validatedMission.data).safe) {
      console.warn("[OpenAir Quest][AI] Mission safety validation failed; using built-in fallback.");
      return {
        mission: getValidatedFallbackMission(
          preferences.mode,
          preferences.environment,
          preferences.durationMinutes,
        ),
        usedFallback: true,
      };
    }

    return {
      mission: validatedMission.data,
      usedFallback: false,
      usedManualEnvironmentRecovery,
      scene: validatedScene.data,
      sceneSource,
    };
  } catch (error: unknown) {
    console.error("[OpenAir Quest][AI] Provider pipeline failed; using built-in fallback.", {
      error,
      message: error instanceof Error ? error.message : undefined,
    });
    return {
      mission: getValidatedFallbackMission(
        preferences.mode,
        preferences.environment,
        preferences.durationMinutes,
      ),
      usedFallback: true,
    };
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
