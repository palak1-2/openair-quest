import type { LocalLLMProvider } from "@/ai/AIProvider";
import { extractJSON } from "@/ai/extractJSON";
import { MISSION_REPAIR_PROMPT, MISSION_SYSTEM_PROMPT } from "@/ai/prompts/missionPrompt";
import type { OllamaClient } from "@/ai/ollamaClient";
import { LocalOllamaClient } from "@/ai/ollamaClient";
import { LocalAIProviderError } from "@/ai/providerError";
import { MissionSchema } from "@/schemas/mission";
import type { ConstraintObject, Mission, PersonalizationContext, SceneContext } from "@/types";
import type { DurationMinutes } from "@/types";
import { validateSafety } from "@/validation/safetyValidator";
import type { SafetyRuleId } from "@/validation/safetyValidator";

type RepairFailure =
  | { type: "malformed-json"; candidate?: never; issues: { description: string }[] }
  | { type: "schema"; candidate: unknown; issues: { code: string; path: (string | number)[] }[] }
  | { type: "duration"; candidate: unknown; issues: { description: string }[] }
  | { type: "safety"; candidate: unknown; ruleIds: SafetyRuleId[]; issues: { description: string }[] };

class RepairableCandidateError extends Error {
  readonly failure: RepairFailure;

  constructor(failure: RepairFailure) {
    super(failure.type);
    this.name = "RepairableCandidateError";
    this.failure = failure;
  }
}

const SAFETY_RULE_DESCRIPTIONS: Record<SafetyRuleId, string> = {
  road_crossing: "Do not instruct road crossing.",
  navigation: "Do not give navigation instructions.",
  gps: "Do not use GPS.",
  route: "Do not provide routes.",
  directions: "Do not provide directions.",
  approach_or_interaction_with_people_or_animals: "Do not direct interaction with people or animals.",
  talk_to_people: "Do not instruct talking to people.",
  interaction_near_people_or_animals: "Do not instruct interaction with people or animals.",
  stranger_interaction: "Do not include stranger interaction.",
  medical_advice: "Do not provide medical advice.",
  therapy_claim: "Do not make therapy claims.",
  guaranteed_safety: "Do not guarantee safety.",
  guarantee_claim: "Do not guarantee safety or accessibility.",
  safety_guarantee: "Do not guarantee safety.",
  dangerous_area: "Do not direct users into dangerous areas.",
  restricted_area: "Do not direct users into restricted areas.",
  hazard_free_claim: "Do not claim an area is hazard-free.",
  obstacle_or_hazard_absence_claim: "Do not claim obstacles or hazards are absent.",
  obstacle_or_hazard_free_claim: "Do not claim an area is obstacle- or hazard-free.",
  free_of_obstacles_or_hazards_claim: "Do not claim obstacles or hazards are absent.",
  no_obstacles_or_hazards_claim: "Do not claim there are no obstacles or hazards.",
  area_safety_claim: "Do not claim an area is safe.",
  accessibility_claim: "Do not claim an area is fully accessible.",
  accessibility_certification_claim: "Do not claim accessibility certification.",
  therapeutic_benefit_claim: "Do not claim health or therapeutic benefits.",
  climbing: "Do not instruct climbing.",
  dangerous_jumping: "Do not instruct jumping from, off, or over objects.",
  entering_water: "Do not instruct entering water.",
  restricted_entry: "Do not instruct entering restricted areas.",
  movement_near_road: "Do not direct movement near roads or crossings.",
};

function validateCandidate(raw: string, requestedDuration: DurationMinutes): Mission {
  let candidate: unknown;
  try {
    candidate = extractJSON(raw);
  } catch {
    throw new RepairableCandidateError({
      type: "malformed-json",
      issues: [{ description: "Response did not contain extractable JSON." }],
    });
  }

  const parsed = MissionSchema.safeParse(candidate);
  if (!parsed.success) {
    throw new RepairableCandidateError({
      type: "schema",
      candidate,
      issues: parsed.error.issues.map((issue) => ({
        code: issue.code,
        path: issue.path.filter(
          (segment): segment is string | number =>
            typeof segment === "string" || typeof segment === "number",
        ),
      })),
    });
  }
  if (parsed.data.durationMinutes !== requestedDuration) {
    throw new RepairableCandidateError({
      type: "duration",
      candidate,
      issues: [{ description: "durationMinutes must equal the requested duration." }],
    });
  }

  const safety = validateSafety(parsed.data);
  if (!safety.safe) {
    throw new RepairableCandidateError({
      type: "safety",
      candidate,
      ruleIds: safety.ruleIds,
      issues: safety.ruleIds.map((ruleId) => ({
        description: SAFETY_RULE_DESCRIPTIONS[ruleId],
      })),
    });
  }
  return parsed.data;
}

function toProviderValidationError(error: RepairableCandidateError): LocalAIProviderError {
  return new LocalAIProviderError(
    error.failure.type === "safety"
      ? "The local language model returned an unsafe mission."
      : "The local language model returned an invalid mission.",
  );
}

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
    personalization?: PersonalizationContext,
  ): Promise<Mission> {
    console.info("[OpenAir Quest][AI] LLM request starting.", { model: "gemma3:4b" });
    const prompt = JSON.stringify({
      constraints,
      scene,
      personalization: personalization ?? null,
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
      let mission: Mission;
      try {
        mission = validateCandidate(raw, constraints.durationMinutes);
      } catch (error) {
        if (!(error instanceof RepairableCandidateError)) throw error;
        if (error.failure.type === "safety") {
          console.warn(
            `[OpenAir Quest][AI] LLM response failed safety validation. Rules: ${JSON.stringify(error.failure.ruleIds)}`,
          );
        } else {
          console.warn(`[OpenAir Quest][AI] Candidate validation failed; attempting one repair. Type: ${error.failure.type}`);
        }
        mission = await this.repairMission(
          error.failure,
          constraints,
          scene,
          personalization,
        );
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

  private async repairMission(
    failure: RepairFailure,
    constraints: ConstraintObject,
    scene: SceneContext,
    personalization?: PersonalizationContext,
  ): Promise<Mission> {
    const repairPrompt = JSON.stringify({
      candidate: "candidate" in failure ? failure.candidate : undefined,
      validationFailure: {
        type: failure.type,
        issues: failure.issues,
        ...("ruleIds" in failure ? { ruleIds: failure.ruleIds } : {}),
      },
      requestedDurationMinutes: constraints.durationMinutes,
      constraints,
      scene,
      personalization: personalization ?? null,
    });

    let raw: string;
    try {
      raw = await this.client.generate({
        model: "gemma3:4b",
        system: `${MISSION_SYSTEM_PROMPT}\n\n${MISSION_REPAIR_PROMPT}`,
        prompt: repairPrompt,
        format: getMissionFormat(constraints.durationMinutes),
        stream: false,
        options: { temperature: 0.2 },
      });
    } catch {
      throw new LocalAIProviderError("Local mission generation failed.");
    }

    try {
      return validateCandidate(raw, constraints.durationMinutes);
    } catch (error) {
      if (error instanceof RepairableCandidateError) {
        throw toProviderValidationError(error);
      }
      throw error;
    }
  }
}
