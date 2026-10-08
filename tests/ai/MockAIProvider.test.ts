import { describe, expect, it } from "vitest";
import type { LocalLLMProvider, LocalVisionProvider } from "@/ai/AIProvider";
import {
  MockLLMProvider,
  MockVisionProvider,
  generateMissionPipeline,
} from "@/ai/MockAIProvider";
import type { AccessibilityMode, EnvironmentOption, Mission, UserPreferences } from "@/types";
import type { PersonalizationContext } from "@/types";

const environments: EnvironmentOption[] = [
  "park",
  "garden",
  "campus",
  "neighborhood",
  "not-sure",
];
const modes: AccessibilityMode[] = ["quiet", "audio-first", "simple-steps"];

function preferences(
  environment: EnvironmentOption = "park",
  mode: AccessibilityMode = "quiet",
  durationMinutes: UserPreferences["durationMinutes"] = 10,
): UserPreferences {
  return { environment, mode, durationMinutes };
}

describe("Mock AI providers", () => {
  it.each(environments)("maps the manual environment %s deterministically", async (environment) => {
    const provider = new MockVisionProvider();
    const first = await provider.analyze(undefined, environment);
    const second = await provider.analyze(undefined, environment);
    expect(first).toEqual(second);
    expect(first.environment).toBe(environment === "not-sure" ? "outdoor area" : environment);
    expect(first.features.length).toBeGreaterThan(0);
  });

  it("does not claim to analyze a supplied image", async () => {
    const scene = await new MockVisionProvider().analyze(new Blob(["image"]), "garden");
    expect(scene.general_context).toMatch(/image was not analyzed/i);
  });

  it.each(modes)("generates a valid mission for %s mode", async (mode) => {
    const mission = await new MockLLMProvider().generateMission(
      {
        mode,
        durationMinutes: 10,
        environment: "CAMPUS",
        avoid: [],
        instructionStyle: mode === "quiet" ? "calm" : mode === "audio-first" ? "spoken" : "one-step",
      },
      { environment: "campus", features: ["green space"] },
    );
    expect(mission.steps.length).toBeGreaterThanOrEqual(3);
    expect(mission.steps.length).toBeLessThanOrEqual(5);
    expect(mission.audioVersion).toHaveLength(mission.steps.length);
    expect(mission.durationMinutes).toBe(10);
    expect(mission.steps.join(" ")).not.toMatch(/navigate|cross a road|medical|therapeutic/i);
  });

  it.each([5, 10, 20] as const)("matches requested duration of %s minutes", async (duration) => {
    const mission = await generateMissionPipeline(preferences("garden", "quiet", duration));
    expect(mission.durationMinutes).toBe(duration);
  });
});

describe("mission pipeline validation", () => {
  it("returns generated valid output", async () => {
    const mission = await generateMissionPipeline(preferences("campus", "simple-steps", 20));
    expect(mission.title).toBe("Outdoor Noticing");
    expect(mission.durationMinutes).toBe(20);
    expect(mission.steps).toHaveLength(mission.audioVersion.length);
  });

  it("uses fallback when generated output fails the mission schema", async () => {
    const invalidLLM: LocalLLMProvider = {
      generateMission: async () => ({ title: "", steps: [] }) as unknown as Mission,
    };
    const mission = await generateMissionPipeline(preferences("park", "audio-first", 20), undefined, invalidLLM);
    expect(mission.title).toBe("Listen and Look");
    expect(mission.durationMinutes).toBe(20);
  });

  it("uses fallback when generated output fails safety validation", async () => {
    const unsafeLLM: LocalLLMProvider = {
      generateMission: async () => ({
        title: "Unsafe activity",
        summary: "A short activity.",
        durationMinutes: 10,
        steps: ["Cross the road carefully.", "Notice a shape.", "Notice a colour."],
        audioVersion: ["Cross the road carefully.", "Notice a shape.", "Notice a colour."],
        comfortAdjustment: "Stop whenever you wish.",
        safetyNote: "Stay comfortable.",
      }),
    };
    const mission = await generateMissionPipeline(preferences(), undefined, unsafeLLM);
    expect(mission.title).toBe("Quiet Nature Observation");
    expect(mission.steps.join(" ")).not.toMatch(/cross a road/i);
  });

  it("uses fallback if the scene provider returns invalid context", async () => {
    const invalidVision: LocalVisionProvider = {
      analyze: async () => ({ environment: "", features: [] }),
    };
    const mission = await generateMissionPipeline(preferences(), invalidVision);
    expect(mission.title).toBe("Quiet Nature Observation");
  });

  it("preserves current deterministic output when personalization is absent or neutral", async () => {
    const provider = new MockLLMProvider();
    const constraints = {
      mode: "quiet" as const,
      durationMinutes: 10 as const,
      environment: "NATURAL_SPACE",
      avoid: [],
      instructionStyle: "calm" as const,
    };
    const scene = { environment: "garden", features: ["plants"] };
    const neutral: PersonalizationContext = {
      evidenceCount: 0,
      preferredCharacteristics: [],
      avoidCharacteristics: [],
      difficultyAdjustment: "neutral",
      sensoryAdjustment: "neutral",
      adaptationNotes: [],
    };

    expect(await provider.generateMission(constraints, scene))
      .toEqual(await provider.generateMission(constraints, scene, neutral));
  });

  it("adapts mock steps deterministically without overriding accessibility rules", async () => {
    const provider = new MockLLMProvider();
    const mission = await provider.generateMission(
      {
        mode: "simple-steps",
        durationMinutes: 10,
        environment: "NATURAL_SPACE",
        avoid: ["roads", "navigation"],
        instructionStyle: "one-step",
      },
      { environment: "garden", features: ["plants"] },
      {
        evidenceCount: 2,
        preferredCharacteristics: [],
        avoidCharacteristics: ["complex-steps", "high-sensory-stimulation"],
        difficultyAdjustment: "simpler",
        sensoryAdjustment: "quieter",
        adaptationNotes: ["Use simpler steps."],
      },
    );

    expect(mission.steps).toEqual([
      "Pause comfortably.",
      "Notice one nearby detail.",
      "Finish whenever you feel ready.",
    ]);
    expect(mission.steps.join(" ")).not.toMatch(/navigate|road|listen for a sound/i);
  });

  it("uses positive enjoyable feedback to preserve a familiar, low-pressure style", async () => {
    const mission = await new MockLLMProvider().generateMission(
      {
        mode: "quiet",
        durationMinutes: 10,
        environment: "NATURAL_SPACE",
        avoid: ["roads", "navigation"],
        instructionStyle: "calm",
      },
      { environment: "garden", features: ["plants"] },
      {
        evidenceCount: 2,
        preferredCharacteristics: ["continue-enjoyable-format"],
        avoidCharacteristics: [],
        difficultyAdjustment: "neutral",
        sensoryAdjustment: "neutral",
        adaptationNotes: ["Keep the overall activity approachable."],
      },
    );

    expect(mission.comfortAdjustment)
      .toBe("Keep a familiar, enjoyable activity style; pause or stop whenever you wish.");
  });

  it("passes personalization context through the validated pipeline to the LLM", async () => {
    const personalization: PersonalizationContext = {
      evidenceCount: 1,
      preferredCharacteristics: ["low-pressure-pacing"],
      avoidCharacteristics: [],
      difficultyAdjustment: "maintain",
      sensoryAdjustment: "neutral",
      adaptationNotes: ["Keep the activity low-pressure."],
    };
    let received: PersonalizationContext | undefined;
    const llm: LocalLLMProvider = {
      generateMission: async (constraints, scene, context) => {
        received = context;
        return await new MockLLMProvider().generateMission(constraints, scene, context);
      },
    };

    const mission = await generateMissionPipeline(
      preferences("garden"),
      undefined,
      llm,
      personalization,
    );

    expect(received).toEqual(personalization);
    expect(mission.durationMinutes).toBe(10);
  });
});
