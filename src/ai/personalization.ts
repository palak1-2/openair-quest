import type {
  AccessibilityMode,
  EnvironmentOption,
  FeedbackType,
  HistoryItem,
  PersonalizationContext,
} from "@/types";

const MAX_RELEVANT_HISTORY = 10;

interface CurrentPreferences {
  mode: AccessibilityMode;
  environment: EnvironmentOption;
}

const FEEDBACK_VALUES: FeedbackType[] = [
  "comfortable",
  "too-difficult",
  "too-noisy",
  "enjoyable",
];

export function getNeutralPersonalizationContext(): PersonalizationContext {
  return {
    evidenceCount: 0,
    preferredCharacteristics: [],
    avoidCharacteristics: [],
    difficultyAdjustment: "neutral",
    sensoryAdjustment: "neutral",
    adaptationNotes: [],
  };
}

export function derivePersonalizationContext(
  history: readonly HistoryItem[],
  preferences: CurrentPreferences,
): PersonalizationContext {
  const recentRelevant = history
    .filter((item) =>
      item.mode === preferences.mode &&
      item.environment === preferences.environment &&
      Array.isArray(item.feedback) &&
      item.feedback.some((feedback) => FEEDBACK_VALUES.includes(feedback))
    )
    .map((item, index) => ({ item, index, timestamp: Date.parse(item.completedAt) }))
    .sort((a, b) => {
      const aTime = Number.isNaN(a.timestamp) ? Number.NEGATIVE_INFINITY : a.timestamp;
      const bTime = Number.isNaN(b.timestamp) ? Number.NEGATIVE_INFINITY : b.timestamp;
      return bTime - aTime || a.index - b.index;
    })
    .slice(0, MAX_RELEVANT_HISTORY);

  if (recentRelevant.length === 0) return getNeutralPersonalizationContext();

  const counts: Record<FeedbackType, number> = {
    comfortable: 0,
    "too-difficult": 0,
    "too-noisy": 0,
    enjoyable: 0,
  };

  for (const { item } of recentRelevant) {
    for (const feedback of new Set(item.feedback)) {
      if (FEEDBACK_VALUES.includes(feedback)) counts[feedback] += 1;
    }
  }

  const preferredCharacteristics: PersonalizationContext["preferredCharacteristics"] = [];
  const avoidCharacteristics: PersonalizationContext["avoidCharacteristics"] = [];
  const adaptationNotes: string[] = [];
  let difficultyAdjustment: PersonalizationContext["difficultyAdjustment"] = "neutral";
  let sensoryAdjustment: PersonalizationContext["sensoryAdjustment"] = "neutral";

  if (counts["too-difficult"] > counts.comfortable) {
    difficultyAdjustment = "simpler";
    avoidCharacteristics.push("complex-steps");
    adaptationNotes.push("Use shorter, simpler steps with one clear action at a time.");
  } else if (counts.comfortable > counts["too-difficult"]) {
    difficultyAdjustment = "maintain";
    preferredCharacteristics.push("low-pressure-pacing");
    adaptationNotes.push("Keep the activity low-pressure and allow the user to pause or stop.");
  }

  if (counts["too-noisy"] > 0) {
    sensoryAdjustment = "quieter";
    avoidCharacteristics.push("high-sensory-stimulation");
    adaptationNotes.push("Prefer calm, low-stimulation observations and avoid sound-seeking tasks.");
  }

  const negativeFeedback = counts["too-difficult"] + counts["too-noisy"];
  if (counts.enjoyable > negativeFeedback) {
    preferredCharacteristics.push("continue-enjoyable-format");
    adaptationNotes.push("Keep the overall activity approachable; feedback does not identify specific mission details.");
  }

  return {
    evidenceCount: recentRelevant.length,
    preferredCharacteristics,
    avoidCharacteristics,
    difficultyAdjustment,
    sensoryAdjustment,
    adaptationNotes,
  };
}
