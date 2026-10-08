import type { LocalLLMProvider } from "@/ai/AIProvider";
import { extractJSON } from "@/ai/extractJSON";
import { MISSION_SYSTEM_PROMPT } from "@/ai/prompts/missionPrompt";
import type { OllamaClient } from "@/ai/ollamaClient";
import { LocalOllamaClient } from "@/ai/ollamaClient";
import { LocalAIProviderError } from "@/ai/providerError";
import { MissionSchema } from "@/schemas/mission";
import type { ConstraintObject, Mission, SceneContext } from "@/types";
import type { DurationMinutes } from "@/types";
import { validateSafety } from "@/validation/safetyValidator";

function getMissionFormat(durationMinutes: DurationMinutes): Record<string, unknown> {
  return {
    type: "object",
    properties: {
      title: { type: "string" },
      summary: { type: "string" },
      durationMinutes: { type: "integer", const: durationMinutes },
      steps: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
      audioVersion: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
      comfortAdjustment: { type: "string" },
      safetyNote: { type: "string" },
    },
    required: [
      "title",
      "summary",
      "durationMinutes",
      "steps",
      "audioVersion",
      "comfortAdjustment",
      "safetyNote",
    ],
    additionalProperties: false,
  };
}

export class OllamaLLMProvider implements LocalLLMProvider {
  private readonly client: OllamaClient;

  constructor(client: OllamaClient = new LocalOllamaClient()) {
    this.client = client;
  }

  async generateMission(
    constraints: ConstraintObject,
    scene: SceneContext,
  ): Promise<Mission> {
    console.info("[OpenAir Quest][AI] LLM request starting.", { model: "gemma3:4b" });
    const prompt = JSON.stringify({
      constraints,
      scene,
      requestedDurationMinutes: constraints.durationMinutes,
      instructions: `Generate one mission following the system rules. Return only Mission JSON. Set durationMinutes to exactly ${constraints.durationMinutes}; do not use another duration.`,
    });

    try {
      const raw = await this.client.generate({
        model: "gemma3:4b",
        system: MISSION_SYSTEM_PROMPT,
        prompt,
        format: getMissionFormat(constraints.durationMinutes),
        stream: false,
        options: { temperature: 0.2 },
      });
      const parsed = MissionSchema.safeParse(extractJSON(raw));
      if (!parsed.success) {
        console.warn("[OpenAir Quest][AI] LLM response failed mission schema validation.");
        throw new LocalAIProviderError("The local language model returned an invalid mission.");
      }
      let mission = parsed.data;
      if (mission.durationMinutes !== constraints.durationMinutes) {
        console.warn("[OpenAir Quest][AI] Normalizing model duration to requested duration.", {
          requestedDurationMinutes: constraints.durationMinutes,
          returnedDurationMinutes: mission.durationMinutes,
        });
        mission = MissionSchema.parse({
            ...parsed.data,
            durationMinutes: constraints.durationMinutes,
          });
      }
      const safetyResult = validateSafety(mission);
      if (!safetyResult.safe) {
        console.warn(
          `[OpenAir Quest][AI] LLM response failed safety validation. Rules: ${JSON.stringify(safetyResult.ruleIds)}`,
        );
        throw new LocalAIProviderError("The local language model returned an unsafe mission.");
      }
      console.info("[OpenAir Quest][AI] LLM request completed.");
      return mission;
    } catch (error) {
      console.error("[OpenAir Quest][AI] LLM request failed.", {
        error,
        message: error instanceof Error ? error.message : undefined,
      });
      if (error instanceof LocalAIProviderError) throw error;
      throw new LocalAIProviderError("Local mission generation failed.");
    }
  }
}
