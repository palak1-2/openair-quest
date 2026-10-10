import { describe, expect, it, vi } from "vitest";
import type { OllamaClient, OllamaGenerateRequest } from "@/ai/ollamaClient";
import { OllamaVisionProvider } from "@/ai/OllamaVisionProvider";
import { OllamaLLMProvider } from "@/ai/OllamaLLMProvider";
import { LocalAIProviderError } from "@/ai/providerError";
import { generateMissionPipelineWithFallback } from "@/ai/MockAIProvider";
import type { ConstraintObject, Mission, SceneContext, UserPreferences } from "@/types";
import type { LocalLLMProvider } from "@/ai/AIProvider";
import type { PersonalizationContext } from "@/types";
import { MISSION_SYSTEM_PROMPT } from "@/ai/prompts/missionPrompt";
import { MissionSchema } from "@/schemas/mission";
import { validateSafety } from "@/validation/safetyValidator";

const mission: Mission = {
  title: "A Gentle Garden Pause",
  summary: "Notice a few details in the garden.",
  durationMinutes: 10,
  steps: ["Pause comfortably.", "Notice one colour.", "Listen for one sound."],
  audioVersion: ["Pause comfortably.", "Notice one colour.", "Listen for one sound."],
  comfortAdjustment: "Pause or stop whenever you wish.",
  safetyNote: "Stay aware of your surroundings.",
};

class FakeOllamaClient implements OllamaClient {
  readonly generate = vi.fn<(request: OllamaGenerateRequest) => Promise<string>>();
}

describe("OllamaVisionProvider", () => {
  it("sends an image only to the requested local vision model and parses its scene", async () => {
    const client = new FakeOllamaClient();
    client.generate.mockResolvedValue(
      'Here is the JSON: {"environment":"garden","features":["trees","open grassy area"]}',
    );

    const scene = await new OllamaVisionProvider(client).analyze(
      new Blob(["local image"], { type: "image/png" }),
      "garden",
    );

    expect(scene).toEqual({
      scene: {
        environment: "garden",
        features: ["trees", "open grassy area"],
      },
      source: "vision",
    });
    expect(client.generate).toHaveBeenCalledWith(expect.objectContaining({
      model: "qwen2.5vl:3b",
      format: "json",
      images: [btoa("local image")],
    }));
  });

  it("does not call the vision model when there is no image", async () => {
    const client = new FakeOllamaClient();
    const scene = await new OllamaVisionProvider(client).analyze(undefined, "campus");
    expect(scene.scene.environment).toBe("campus");
    expect(scene.source).toBe("manual");
    expect(client.generate).not.toHaveBeenCalled();
  });

  it("rejects malformed vision JSON as a controlled provider error", async () => {
    const client = new FakeOllamaClient();
    client.generate.mockResolvedValue("{ malformed");
    await expect(
      new OllamaVisionProvider(client).analyze(
        new Blob(["image"], { type: "image/png" }),
        "park",
      ),
    ).rejects.toBeInstanceOf(LocalAIProviderError);
  });

  it("rejects invalid scene context", async () => {
    const client = new FakeOllamaClient();
    client.generate.mockResolvedValue('{"environment":"","features":[]}');
    await expect(
      new OllamaVisionProvider(client).analyze(
        new Blob(["image"], { type: "image/png" }),
        "park",
      ),
    ).rejects.toBeInstanceOf(LocalAIProviderError);
  });

  it("rejects claims beyond broad environmental context", async () => {
    const client = new FakeOllamaClient();
    client.generate.mockResolvedValue(
      '{"environment":"safe garden","features":["clear of obstacles"]}',
    );
    await expect(
      new OllamaVisionProvider(client).analyze(
        new Blob(["image"], { type: "image/png" }),
        "park",
      ),
    ).rejects.toBeInstanceOf(LocalAIProviderError);
  });
});

describe("OllamaLLMProvider", () => {
  const constraints: ConstraintObject = {
    mode: "quiet",
    durationMinutes: 10,
    environment: "NATURAL_SPACE",
    avoid: ["roads", "navigation", "approaching strangers", "approaching animals"],
    instructionStyle: "calm",
  };
  const scene = { environment: "garden", features: ["trees"] };

  it("generates and validates a mission through the local model", async () => {
    const client = new FakeOllamaClient();
    client.generate.mockResolvedValue(JSON.stringify(mission));
    const result = await new OllamaLLMProvider(client).generateMission(constraints, scene);
    expect(result).toEqual(mission);
    expect(client.generate).toHaveBeenCalledWith(expect.objectContaining({
      model: "gemma3:4b",
      format: expect.objectContaining({
        properties: expect.objectContaining({
          durationMinutes: { type: "integer", const: 10 },
        }),
      }),
      prompt: expect.stringContaining('"mode":"quiet"'),
    }));
    expect(client.generate).toHaveBeenCalledOnce();
  });

  it("repairs malformed mission JSON with exactly one additional model call", async () => {
    const client = new FakeOllamaClient();
    client.generate.mockResolvedValueOnce("{ nope").mockResolvedValueOnce(JSON.stringify(mission));
    await expect(new OllamaLLMProvider(client).generateMission(constraints, scene)).resolves.toEqual(mission);
    expect(client.generate).toHaveBeenCalledTimes(2);
    const repairRequest = client.generate.mock.calls[1][0];
    expect(JSON.parse(repairRequest.prompt).validationFailure).toEqual({
      type: "malformed-json",
      issues: [{ description: "Response did not contain extractable JSON." }],
    });
  });

  it("repairs schema-invalid output using only schema codes and field paths", async () => {
    const client = new FakeOllamaClient();
    const invalidCandidate = '{"title":"","steps":[]}';
    client.generate.mockResolvedValueOnce(invalidCandidate).mockResolvedValueOnce(JSON.stringify(mission));
    await expect(new OllamaLLMProvider(client).generateMission(constraints, scene)).resolves.toEqual(mission);
    expect(client.generate).toHaveBeenCalledTimes(2);
    const repairPrompt = JSON.parse(client.generate.mock.calls[1][0].prompt);
    expect(repairPrompt.validationFailure.type).toBe("schema");
    expect(repairPrompt.validationFailure.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: expect.any(String), path: expect.any(Array) }),
      ]),
    );
    expect(JSON.stringify(repairPrompt.validationFailure)).not.toContain('""');
  });

  it("repairs safety-invalid output once and preserves request context without unsafe diagnostics", async () => {
    const client = new FakeOllamaClient();
    const unsafeText = "Cross the road to reach the garden.";
    client.generate.mockResolvedValueOnce(JSON.stringify({
      ...mission,
      steps: [unsafeText, "Notice one colour.", "Listen for one sound."],
      audioVersion: [unsafeText, "Notice one colour.", "Listen for one sound."],
    })).mockResolvedValueOnce(JSON.stringify({ ...mission, title: "A Repaired Garden Pause" }));
    const personalization: PersonalizationContext = {
      evidenceCount: 2,
      preferredCharacteristics: ["low-pressure-pacing"],
      avoidCharacteristics: ["high-sensory-stimulation"],
      difficultyAdjustment: "simpler",
      sensoryAdjustment: "quieter",
      adaptationNotes: ["Keep steps simple and low-stimulation."],
    };
    const result = await new OllamaLLMProvider(client).generateMission(
      constraints,
      scene,
      personalization,
    );
    expect(result.title).toBe("A Repaired Garden Pause");
    expect(client.generate).toHaveBeenCalledTimes(2);
    const repairRequest = client.generate.mock.calls[1][0];
    const repairPrompt = JSON.parse(repairRequest.prompt);
    expect(repairPrompt).toMatchObject({
      candidate: expect.objectContaining({ steps: expect.arrayContaining([unsafeText]) }),
      requestedDurationMinutes: 10,
      constraints,
      scene,
      personalization,
    });
    expect(repairPrompt.validationFailure.ruleIds).toContain("road_crossing");
    expect(JSON.stringify(repairPrompt.validationFailure)).not.toContain(unsafeText);
    expect(JSON.stringify(repairPrompt)).not.toContain("stored history");
    expect(JSON.stringify(repairPrompt)).not.toContain("image payload");
    expect(repairPrompt).not.toHaveProperty("history");
    expect(repairPrompt).not.toHaveProperty("image");
    expect(repairRequest.system).toContain(
      "SAFETY > ACCESSIBILITY > USER PREFERENCES > PERSONALIZATION > GENERATIVE FREEDOM",
    );
  });

  it("includes compact personalization in the prompt beneath higher-priority constraints", async () => {
    const client = new FakeOllamaClient();
    client.generate.mockResolvedValue(JSON.stringify(mission));
    const personalization: PersonalizationContext = {
      evidenceCount: 2,
      preferredCharacteristics: ["low-pressure-pacing"],
      avoidCharacteristics: ["high-sensory-stimulation"],
      difficultyAdjustment: "simpler",
      sensoryAdjustment: "quieter",
      adaptationNotes: ["Keep steps simple and low-stimulation."],
    };

    await new OllamaLLMProvider(client).generateMission(constraints, scene, personalization);

    const request = client.generate.mock.calls[0][0];
    expect(JSON.parse(request.prompt)).toMatchObject({ personalization });
    expect(request.prompt).not.toContain("historic mission text");
    expect(MISSION_SYSTEM_PROMPT).toContain(
      "SAFETY RULES > ACCESSIBILITY CONSTRAINTS > USER PREFERENCES > PERSONALIZATION > GENERATIVE FREEDOM",
    );
    expect(MISSION_SYSTEM_PROMPT).toMatch(
      /never allow it\s+to override safety rules, accessibility constraints, or the user's current preferences/i,
    );
  });

  it("logs only safe rule identifiers when safety validation rejects a mission", async () => {
    const client = new FakeOllamaClient();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const sensitiveText = "Cross the road to reach the garden.";
    client.generate.mockResolvedValue(JSON.stringify({
      ...mission,
      steps: [sensitiveText, "Notice one colour.", "Listen for one sound."],
      audioVersion: [sensitiveText, "Notice one colour.", "Listen for one sound."],
    }));

    await expect(
      new OllamaLLMProvider(client).generateMission(constraints, scene),
    ).rejects.toBeInstanceOf(LocalAIProviderError);

    const safetyLog = warn.mock.calls.find(([message]) =>
      String(message).includes("safety validation"),
    );
    expect(safetyLog?.[0]).toBe(
      '[OpenAir Quest][AI] LLM response failed safety validation. Rules: ["road_crossing"]',
    );
    expect(JSON.stringify(safetyLog)).not.toContain(sensitiveText);
    warn.mockRestore();
  });

  it("rejects a mission whose duration differs from the requested duration", async () => {
    const client = new FakeOllamaClient();
    client.generate
      .mockResolvedValueOnce(JSON.stringify({ ...mission, durationMinutes: 5 }))
      .mockResolvedValueOnce(JSON.stringify(mission));
    const result = await new OllamaLLMProvider(client).generateMission(constraints, scene);
    expect(result.durationMinutes).toBe(10);
    expect(client.generate).toHaveBeenCalledTimes(2);
  });

  it("keeps a five-minute request authoritative when the model returns ten", async () => {
    const client = new FakeOllamaClient();
    client.generate
      .mockResolvedValueOnce(JSON.stringify({ ...mission, durationMinutes: 10 }))
      .mockResolvedValueOnce(JSON.stringify({ ...mission, durationMinutes: 5 }));
    const result = await new OllamaLLMProvider(client).generateMission(
      { ...constraints, durationMinutes: 5 },
      scene,
    );
    expect(result.durationMinutes).toBe(5);
    expect(client.generate).toHaveBeenCalledWith(expect.objectContaining({
      format: expect.objectContaining({
        properties: expect.objectContaining({
          durationMinutes: { type: "integer", const: 5 },
        }),
      }),
      prompt: expect.stringContaining('"requestedDurationMinutes":5'),
    }));
    expect(client.generate).toHaveBeenCalledTimes(2);
  });

  it("uses validated fallback when one repair attempt remains invalid", async () => {
    const client = new FakeOllamaClient();
    const unsafe = {
      ...mission,
      steps: ["Cross the road.", "Notice one colour.", "Listen for one sound."],
      audioVersion: ["Cross the road.", "Notice one colour.", "Listen for one sound."],
    };
    client.generate.mockResolvedValueOnce(JSON.stringify(unsafe)).mockResolvedValueOnce(JSON.stringify(unsafe));
    const result = await generateMissionPipelineWithFallback(
      { mode: "quiet", durationMinutes: 10, environment: "garden" },
      { analyze: async () => ({ scene: { environment: "garden", features: ["trees"] }, source: "vision" as const }) },
      new OllamaLLMProvider(client),
    );
    expect(client.generate).toHaveBeenCalledTimes(2);
    expect(result.usedFallback).toBe(true);
    expect(result.scene).toMatchObject({ environment: "garden", features: ["trees"] });
    expect(result.sceneSource).toBe("manual");
    expect(MissionSchema.safeParse(result.mission).success).toBe(true);
    expect(validateSafety(result.mission).safe).toBe(true);
    expect(result.mission.durationMinutes).toBe(10);
  });

  it("does not repair transport failures or timeouts", async () => {
    const client = new FakeOllamaClient();
    client.generate.mockRejectedValue(new Error("request timed out"));
    await expect(
      new OllamaLLMProvider(client).generateMission(constraints, scene),
    ).rejects.toBeInstanceOf(LocalAIProviderError);
    expect(client.generate).toHaveBeenCalledOnce();
  });

  it("never makes more than one repair attempt when responses remain invalid", async () => {
    const client = new FakeOllamaClient();
    client.generate.mockResolvedValue("{ invalid");
    await expect(
      new OllamaLLMProvider(client).generateMission(constraints, scene),
    ).rejects.toBeInstanceOf(LocalAIProviderError);
    expect(client.generate).toHaveBeenCalledTimes(2);
  });
});

describe("local provider pipeline", () => {
  it("passes vision context through deterministic constraints into mission generation", async () => {
    const visionClient = new FakeOllamaClient();
    visionClient.generate.mockResolvedValue(
      '{"environment":"garden","features":["trees"]}',
    );
    const vision = new OllamaVisionProvider(visionClient);
    const missionClient = new FakeOllamaClient();
    missionClient.generate.mockResolvedValue(JSON.stringify(mission));
    const result = await generateMissionPipelineWithFallback(
      {
        mode: "quiet",
        durationMinutes: 10,
        environment: "garden",
        photo: new Blob(["image"], { type: "image/png" }),
      },
      {
        analyze: async (image, environment) => vision.analyze(image, environment),
      },
      new OllamaLLMProvider(missionClient),
    );

    expect(result.usedFallback).toBe(false);
    expect(result.mission.title).toBe(mission.title);
    expect(result.sceneSource).toBe("vision");
    expect(result.scene).toMatchObject({ environment: "garden", features: ["trees"] });
    expect(missionClient.generate).toHaveBeenCalledWith(expect.objectContaining({
      model: "gemma3:4b",
      prompt: expect.stringContaining('"environment":"NATURAL_SPACE"'),
    }));
    const request = missionClient.generate.mock.calls[0][0];
    expect(JSON.parse(request.prompt)).toMatchObject({
      constraints: {
        mode: "quiet",
        durationMinutes: 10,
        avoid: expect.arrayContaining(["roads", "navigation"]),
      },
      scene: { environment: "garden", features: ["trees"] },
    });
    expect(visionClient.generate).toHaveBeenCalledOnce();
  });

  it("generates from manual context without calling the vision model when no image is supplied", async () => {
    const visionClient = new FakeOllamaClient();
    const missionClient = new FakeOllamaClient();
    missionClient.generate.mockResolvedValue(JSON.stringify(mission));
    const result = await generateMissionPipelineWithFallback(
      { mode: "quiet", durationMinutes: 10, environment: "garden" },
      new OllamaVisionProvider(visionClient),
      new OllamaLLMProvider(missionClient),
    );

    expect(result.usedFallback).toBe(false);
    expect(result.sceneSource).toBe("manual");
    expect(visionClient.generate).not.toHaveBeenCalled();
    expect(JSON.parse(missionClient.generate.mock.calls[0][0].prompt).scene)
      .toMatchObject({ environment: "garden" });
  });

  it("uses a built-in fallback when a local provider fails", async () => {
    const result = await generateMissionPipelineWithFallback(
      { mode: "audio-first", durationMinutes: 20, environment: "park" },
      { analyze: async () => ({ scene: { environment: "park", features: ["trees"] }, source: "manual" }) },
      { generateMission: async () => { throw new Error("Ollama offline"); } },
    );
    expect(result.usedFallback).toBe(true);
    expect(result.mission.title).toBe("Park Noticing");
    expect(result.fallbackReason).toBe("generation-failed");
    expect(result.sceneSource).toBe("manual");
    expect(result.scene).toMatchObject({ environment: "park" });
    expect(result.mission.durationMinutes).toBe(20);
  });

  it("continues with the manual environment when photo vision fails", async () => {
    const vision = {
      analyze: vi.fn(async () => {
        throw new LocalAIProviderError("Vision model unavailable.");
      }),
    };
    const receivedScenes: SceneContext[] = [];
    const llm: LocalLLMProvider = {
      generateMission: async (_constraints, scene) => {
        receivedScenes.push(scene);
        return mission;
      },
    };

    const result = await generateMissionPipelineWithFallback(
      {
        mode: "quiet",
        durationMinutes: 10,
        environment: "garden",
        photo: new Blob(["image"], { type: "image/png" }),
      },
      vision,
      llm,
    );

    expect(vision.analyze).toHaveBeenCalledOnce();
    expect(receivedScenes).toHaveLength(1);
    expect(receivedScenes[0]).toMatchObject({
      environment: "garden",
      features: ["plants", "flowers", "greenery"],
    });
    expect(result.usedFallback).toBe(false);
    expect(result.mission).toEqual(mission);
    expect(result.sceneSource).toBe("manual");
  });

  it("uses a built-in fallback if photo vision fails without a valid manual environment", async () => {
    const vision = {
      analyze: vi.fn(async () => {
        throw new LocalAIProviderError("Vision model unavailable.");
      }),
    };
    const llm: LocalLLMProvider = {
      generateMission: vi.fn(async () => mission),
    };
    const preferences = {
      mode: "quiet",
      durationMinutes: 10,
      environment: undefined,
      photo: new Blob(["image"], { type: "image/png" }),
    } as unknown as UserPreferences;

    const result = await generateMissionPipelineWithFallback(preferences, vision, llm);

    expect(vision.analyze).toHaveBeenCalledOnce();
    expect(llm.generateMission).not.toHaveBeenCalled();
    expect(result.usedFallback).toBe(true);
    expect(result.scene).toBeUndefined();
    expect(result.sceneSource).toBeUndefined();
    expect(result.mission.title).toBe("Outdoor Noticing");
    expect(result.mission.durationMinutes).toBe(10);
  });

  it("preserves fallback when the model response has an unsupported duration", async () => {
    const invalidMissionClient = new FakeOllamaClient();
    invalidMissionClient.generate.mockResolvedValue(JSON.stringify({
      ...mission,
      durationMinutes: 7,
    }));
    const result = await generateMissionPipelineWithFallback(
      { mode: "quiet", durationMinutes: 5, environment: "garden" },
      new OllamaVisionProvider(new FakeOllamaClient()),
      new OllamaLLMProvider(invalidMissionClient),
    );
    expect(result.usedFallback).toBe(true);
    expect(result.mission.durationMinutes).toBe(5);
  });
});
