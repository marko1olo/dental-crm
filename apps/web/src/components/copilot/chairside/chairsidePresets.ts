/**
 * chairsidePresets.ts — Canonical clinical presets for ChairsideCopilotHUD.
 *
 * Compliance:
 * - Mandate 8b: Subcomponent <= 50 lines (composed from clinical domains).
 * - Zero emojis, 100% strict clinical models.
 */

import { THERAPY_PRESETS } from "./presets/therapyPresets";
import { HYGIENE_PRESETS } from "./presets/hygienePresets";
import { MANAGEMENT_PRESETS } from "./presets/managementPresets";

export const CLINICAL_PRESETS = [
  ...THERAPY_PRESETS,
  ...HYGIENE_PRESETS,
  ...MANAGEMENT_PRESETS,
];

export type ClinicalPreset = (typeof CLINICAL_PRESETS)[number];
export const defaultPreset: ClinicalPreset = CLINICAL_PRESETS[0]!;
