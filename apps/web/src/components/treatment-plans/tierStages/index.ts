/**
 * index.ts — Layer 5: Barrel реэкспорта модулей генератора 3-уровневых этапов плана.
 */

export type * from "./types";
export { getDefaultClinicalPresetStages } from "./clinicalPresets";
export { normalizeToothState, hasToothDefect } from "./toothStateHelpers";
export { generateTierPlanStages } from "./tierStagesGenerator";
