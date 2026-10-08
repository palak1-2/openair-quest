/**
 * src/schemas/mission.ts
 *
 * Re-exports MissionSchema from validation layer for use by other modules.
 * The canonical definition lives in src/validation/missionValidator.ts.
 */
export { MissionSchema } from "@/validation/missionValidator";
export type { ValidatedMission } from "@/validation/missionValidator";
