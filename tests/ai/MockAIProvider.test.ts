import { describe, expect, it } from "vitest";
import type { LocalLLMProvider, LocalVisionProvider } from "@/ai/AIProvider";
import {
  MockLLMProvider,
  MockVisionProvider,
  generateMissionPipeline,
} from "@/ai/MockAIProvider";
import type { AccessibilityMode, EnvironmentOption, Mission, UserPreferences } from "@/types";

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
});
