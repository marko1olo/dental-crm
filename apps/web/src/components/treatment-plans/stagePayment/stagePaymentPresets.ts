/**
 * stagePaymentPresets.ts — Пресеты и нормативные параметры поэтапной оплаты планов лечения.
 */

import type { StagePaymentKind, StagePaymentPreset } from "./presets/stagePaymentPresetTypes.js";
import { therapyPreset, surgeryPreset } from "./presets/therapyAndSurgeryPresets.js";
import { orthopedicPreset, orthodonticsPreset, periodonticsPreset } from "./presets/orthoAndPerioPresets.js";

export * from "./presets/stagePaymentPresetTypes.js";
export * from "./presets/stageStatusUiMap.js";

export const STAGE_PAYMENT_PRESETS: Record<StagePaymentKind, StagePaymentPreset> = {
	stage_1_sanitation_therapy: therapyPreset,
	stage_2_surgery_implant: surgeryPreset,
	stage_3_orthopedic_prosthetics: orthopedicPreset,
	stage_4_orthodontics_braces: orthodonticsPreset,
	stage_5_periodontics_maintenance: periodonticsPreset,
};

export function getAllStagePaymentKinds(): readonly StagePaymentKind[] {
	return [
		"stage_1_sanitation_therapy",
		"stage_2_surgery_implant",
		"stage_3_orthopedic_prosthetics",
		"stage_4_orthodontics_braces",
		"stage_5_periodontics_maintenance",
	];
}

export function getStagePresetByKind(kind: StagePaymentKind): StagePaymentPreset {
	return STAGE_PAYMENT_PRESETS[kind] ?? STAGE_PAYMENT_PRESETS.stage_1_sanitation_therapy;
}
