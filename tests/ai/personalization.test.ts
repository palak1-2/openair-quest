import { beforeEach, describe, expect, it } from "vitest";
import { derivePersonalizationContext, getNeutralPersonalizationContext } from "@/ai/personalization";
import { generateSelectedMission } from "@/ai/providerFactory";
import type { AccessibilityMode, EnvironmentOption, HistoryItem } from "@/types";

function historyItem(
  feedback: HistoryItem["feedback"],
  overrides: Partial<HistoryItem> = {},
): HistoryItem {
  return {
    id: "history-item",
    mission: {
      title: "Stored mission text must not be reused",
      summary: "Private historic summary.",
      durationMinutes: 10,
      steps: ["Historic instruction one.", "Historic instruction two.", "Historic instruction three."],
      audioVersion: ["Historic instruction one.", "Historic instruction two.", "Historic instruction three."],
      comfortAdjustment: "Historic comfort text.",
      safetyNote: "Historic safety text.",
    },
    mode: "quiet",
    environment: "garden",
    feedback,
    completedAt: "2026-10-01T12:00:00.000Z",
    ...overrides,
  };
}

const preferences = {
  mode: "quiet" as AccessibilityMode,
  environment: "garden" as EnvironmentOption,
};

describe("derivePersonalizationContext", () => {
  it("returns neutral context for empty history", () => {
    expect(derivePersonalizationContext([], preferences)).toEqual(
      getNeutralPersonalizationContext(),
    );
  });

  it("derives difficulty and sensory adaptations from matching feedback", () => {
    const context = derivePersonalizationContext([
      historyItem(["too-difficult", "too-noisy"]),
      historyItem(["too-difficult"], {
        id: "second",
        completedAt: "2026-10-02T12:00:00.000Z",
      }),
    ], preferences);

    expect(context).toMatchObject({
      evidenceCount: 2,
      avoidCharacteristics: ["complex-steps", "high-sensory-stimulation"],
      difficultyAdjustment: "simpler",
      sensoryAdjustment: "quieter",
    });
    expect(context.adaptationNotes).toContain(
      "Use shorter, simpler steps with one clear action at a time.",
    );
  });

  it("uses neutral difficulty guidance for tied conflicting feedback", () => {
    const context = derivePersonalizationContext([
      historyItem(["comfortable"]),
      historyItem(["too-difficult"], { id: "second" }),
    ], preferences);

    expect(context.difficultyAdjustment).toBe("neutral");
    expect(context.preferredCharacteristics).toEqual([]);
    expect(context.avoidCharacteristics).toEqual([]);
    expect(context.adaptationNotes).toEqual([]);
  });

  it("filters history by current accessibility mode and environment", () => {
    const context = derivePersonalizationContext([
      historyItem(["too-difficult"], { mode: "audio-first" }),
      historyItem(["too-noisy"], { environment: "park" }),
      historyItem(["enjoyable"]),
    ], preferences);

    expect(context.evidenceCount).toBe(1);
    expect(context.preferredCharacteristics).toEqual(["continue-enjoyable-format"]);
    expect(context.avoidCharacteristics).toEqual([]);
  });

  it("produces the same context for repeated matching feedback", () => {
    const history = [
      historyItem(["comfortable", "enjoyable"]),
      historyItem(["comfortable", "enjoyable"], { id: "second" }),
    ];
    expect(derivePersonalizationContext(history, preferences))
      .toEqual(derivePersonalizationContext(history, preferences));
  });

  it("does not include stored mission text in the derived context", () => {
    const result = JSON.stringify(derivePersonalizationContext([
      historyItem(["too-difficult"]),
    ], preferences));
    expect(result).not.toContain("Stored mission");
    expect(result).not.toContain("Historic instruction");
    expect(result).not.toContain("Private historic summary");
  });
});

describe("personalization orchestration", () => {
  beforeEach(() => localStorage.clear());

  it("reads local feedback and personalizes future mock generation", async () => {
    localStorage.setItem("openair-quest:history", JSON.stringify([
      historyItem(["comfortable"]),
    ]));

    const result = await generateSelectedMission({
      mode: "quiet",
      durationMinutes: 10,
      environment: "garden",
    }, "mock");

    expect(result.usedFallback).toBe(false);
    expect(result.mission.comfortAdjustment)
      .toBe("Take your time; pause or stop whenever you wish.");
  });
});
