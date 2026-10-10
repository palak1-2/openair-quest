import type { LocalLLMProvider, LocalVisionProvider } from "@/ai/AIProvider";
import { OllamaLLMProvider } from "@/ai/OllamaLLMProvider";
import { OllamaVisionProvider } from "@/ai/OllamaVisionProvider";
import { LocalOllamaClient } from "@/ai/ollamaClient";
import {
  generateMissionPipelineWithFallback,
  mockLLMProvider,
  mockVisionProvider,
} from "@/ai/MockAIProvider";
import type { MissionGenerationStage } from "@/ai/MockAIProvider";
import { getValidatedFallbackMission } from "@/fallback/fallbackMissions";
import { getHistory } from "@/storage/historyStore";
import { derivePersonalizationContext } from "@/ai/personalization";
import type { Mission, SceneContext, UserPreferences } from "@/types";

export type AIMode = "mock" | "local";
export type ActivityRuntime = "local-ai" | "mock" | "validated-fallback";

interface SelectedMissionResult {
  mission: Mission;
  usedFallback: boolean;
  runtimeProvider: ActivityRuntime;
  usedLocalFallback: boolean;
  usedManualEnvironmentRecovery: boolean;
  scene?: SceneContext;
  sceneSource?: "vision" | "manual";
}

export interface AIProviders {
  mode: AIMode;
  vision: LocalVisionProvider;
  llm: LocalLLMProvider;
}

export function getConfiguredAIMode(): AIMode {
  return import.meta.env.VITE_AI_MODE === "local" ? "local" : "mock";
}

export function createAIProviders(mode: AIMode = getConfiguredAIMode()): AIProviders {
  console.info("[OpenAir Quest][AI] Creating AI providers.", { mode });
  if (mode === "local") {
    const client = new LocalOllamaClient({
      endpoint: import.meta.env.VITE_OLLAMA_ENDPOINT,
    });
    return {
      mode,
      vision: new OllamaVisionProvider(client),
      llm: new OllamaLLMProvider(client),
    };
  }
  return {
    mode,
    vision: mockVisionProvider,
    llm: mockLLMProvider,
  };
}

export async function generateSelectedMission(
  preferences: UserPreferences,
  mode: AIMode = getConfiguredAIMode(),
  onStage?: (stage: MissionGenerationStage) => void,
): Promise<SelectedMissionResult> {
  console.info("[OpenAir Quest][AI] Mission generation requested.", {
    mode,
    imageSelected: preferences.photo !== undefined,
  });
  try {
    const providers = createAIProviders(mode);
    const personalization = derivePersonalizationContext(getHistory(), preferences);
    const result = await generateMissionPipelineWithFallback(
      preferences,
      providers.vision,
      providers.llm,
      personalization,
      onStage,
    );
    if (result.usedFallback) {
      console.warn("[OpenAir Quest][AI] Pipeline selected a built-in fallback.", { mode });
    } else {
      console.info("[OpenAir Quest][AI] Pipeline produced a validated mission.", { mode });
    }
    return {
      ...result,
      runtimeProvider: result.usedFallback
        ? "validated-fallback"
        : mode === "local"
          ? "local-ai"
          : "mock",
      usedLocalFallback: mode === "local" && result.usedFallback,
      usedManualEnvironmentRecovery: result.usedManualEnvironmentRecovery ?? false,
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : undefined;
    console.error("[OpenAir Quest][AI] Provider setup failed; using built-in fallback.", {
      error,
      message,
      mode,
    });
    return {
      mission: getValidatedFallbackMission(
        preferences.mode,
        preferences.environment,
        preferences.durationMinutes,
      ),
      runtimeProvider: "validated-fallback" as const,
      usedFallback: true,
      usedLocalFallback: mode === "local",
      usedManualEnvironmentRecovery: false,
    };
  }
}
