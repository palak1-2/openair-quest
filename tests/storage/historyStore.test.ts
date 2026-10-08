import { beforeEach, describe, expect, it } from "vitest";
import { addFeedback, addHistoryItem, clearHistory, getHistory } from "@/storage/historyStore";
import type { HistoryItem } from "@/types";

const item: HistoryItem = {
  id: "local-test-id",
  mission: {
    title: "Outdoor Noticing",
    summary: "Notice a few details outside.",
    durationMinutes: 5,
    steps: ["Pause.", "Notice a shape.", "Notice a colour."],
    audioVersion: ["Pause.", "Notice a shape.", "Notice a colour."],
    comfortAdjustment: "Stop whenever you wish.",
    safetyNote: "Stay comfortable.",
  },
  mode: "quiet",
  environment: "park",
  completedAt: "2026-10-07T08:00:00.000Z",
};

describe("historyStore", () => {
  beforeEach(() => localStorage.clear());

  it("adds and retrieves history items across reload-style reads", () => {
    addHistoryItem(item);
    expect(getHistory()).toEqual([item]);
    expect(getHistory()).toEqual([item]);
  });

  it("updates feedback without changing the mission or completion timestamp", () => {
    addHistoryItem(item);
    addFeedback(item.id, ["comfortable", "enjoyable"]);
    expect(getHistory()).toEqual([
      { ...item, feedback: ["comfortable", "enjoyable"] },
    ]);
    expect(getHistory()[0].mission).toEqual(item.mission);
    expect(getHistory()[0].completedAt).toBe(item.completedAt);
  });

  it("clears persisted history", () => {
    addHistoryItem(item);
    clearHistory();
    expect(getHistory()).toEqual([]);
  });
});
