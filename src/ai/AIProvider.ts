/**
 * src/ai/AIProvider.ts
 *
 * AI Provider interfaces for OpenAir Quest.
 *
 * The UI and application layer depend on these interfaces,
 * never on a concrete model runtime. This allows providers to be
 * swapped (MockAIProvider → LocalVisionProvider → LocalLLMProvider)
 * without touching the UI.
 *
 * Implemented in Phase 5 (Mock) and Phase 6/7 (real models).
 */
import type { SceneContext, ConstraintObject, Mission, PersonalizationContext } from "@/types";

/**
 * Analyses an optional uploaded image and returns broad environmental context.
 * When no image is provided the provider should return a scene based on
 * the manually selected environment.
 */
export interface LocalVisionProvider {
  analyze(image: Blob | undefined, manualEnvironment: string): Promise<SceneContext>;
}

/**
 * Generates a validated Mission given a constraint object and scene context.
 */
export interface LocalLLMProvider {
  generateMission(
    constraints: ConstraintObject,
    scene: SceneContext,
    personalization?: PersonalizationContext,
  ): Promise<Mission>;
}
