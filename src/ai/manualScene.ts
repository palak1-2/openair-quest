import type { EnvironmentOption, SceneContext } from "@/types";

const ENVIRONMENT_SCENES: Record<EnvironmentOption, SceneContext> = {
  park: {
    environment: "park",
    features: ["open green space", "trees", "plants"],
    sensory_character: "natural outdoor setting",
  },
  garden: {
    environment: "garden",
    features: ["plants", "flowers", "greenery"],
    sensory_character: "small, calm outdoor setting",
  },
  campus: {
    environment: "campus",
    features: ["buildings", "green space", "open walkways"],
    sensory_character: "shared outdoor setting",
  },
  neighborhood: {
    environment: "neighborhood",
    features: ["homes", "trees", "shared green space"],
    sensory_character: "residential outdoor setting",
  },
  "not-sure": {
    environment: "outdoor area",
    features: ["nearby shapes", "colours", "natural details"],
    sensory_character: "outdoor setting",
  },
};

export function getManualSceneContext(environment: string): SceneContext {
  const option = environment as EnvironmentOption;
  return { ...(ENVIRONMENT_SCENES[option] ?? ENVIRONMENT_SCENES["not-sure"]) };
}
