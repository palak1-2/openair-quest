import { describe, expect, it, vi } from "vitest";
import type { OllamaClient, OllamaGenerateRequest } from "@/ai/ollamaClient";
import { OllamaVisionProvider } from "@/ai/OllamaVisionProvider";
import { OllamaLLMProvider } from "@/ai/OllamaLLMProvider";
import { LocalAIProviderError } from "@/ai/providerError";
import { generateMissionPipelineWithFallback } from "@/ai/MockAIProvider";
import type { ConstraintObject, Mission, SceneContext, UserPreferences } from "@/types";
import type { LocalLLMProvider } from "@/ai/AIProvider";

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
      environment: "garden",
      features: ["trees", "open grassy area"],
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
    expect(scene.environment).toBe("campus");
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
  });

  it("rejects malformed mission JSON", async () => {
    const client = new FakeOllamaClient();
    client.generate.mockResolvedValue("{ nope");
    await expect(
      new OllamaLLMProvider(client).generateMission(constraints, scene),
    ).rejects.toBeInstanceOf(LocalAIProviderError);
  });

  it("rejects a mission with invalid schema", async () => {
    const client = new FakeOllamaClient();
    client.generate.mockResolvedValue('{"title":"","steps":[]}');
    await expect(
      new OllamaLLMProvider(client).generateMission(constraints, scene),
    ).rejects.toBeInstanceOf(LocalAIProviderError);
  });

  it("rejects an unsafe mission", async () => {
    const client = new FakeOllamaClient();
    client.generate.mockResolvedValue(JSON.stringify({
      ...mission,
      steps: ["Cross the road.", "Notice one colour.", "Listen for one sound."],
      audioVersion: ["Cross the road.", "Notice one colour.", "Listen for one sound."],
    }));
    await expect(
      new OllamaLLMProvider(client).generateMission(constraints, scene),
    ).rejects.toBeInstanceOf(LocalAIProviderError);
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
    client.generate.mockResolvedValue(JSON.stringify({ ...mission, durationMinutes: 5 }));
    const result = await new OllamaLLMProvider(client).generateMission(constraints, scene);
    expect(result.durationMinutes).toBe(10);
  });

  it("keeps a five-minute request authoritative when the model returns ten", async () => {
    const client = new FakeOllamaClient();
    client.generate.mockResolvedValue(JSON.stringify({ ...mission, durationMinutes: 10 }));
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
    expect(visionClient.generate).not.toHaveBeenCalled();
    expect(JSON.parse(missionClient.generate.mock.calls[0][0].prompt).scene)
      .toMatchObject({ environment: "garden" });
  });

  it("uses a built-in fallback when a local provider fails", async () => {
    const result = await generateMissionPipelineWithFallback(
      { mode: "audio-first", durationMinutes: 20, environment: "park" },
      { analyze: async () => { throw new Error("Ollama offline"); } },
    );
    expect(result.usedFallback).toBe(true);
    expect(result.mission.title).toBe("Listen and Look");
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
    expect(result.mission.title).toBe("Quiet Nature Observation");
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
