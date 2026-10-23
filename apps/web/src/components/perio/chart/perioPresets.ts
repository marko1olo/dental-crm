/**
 * apps/web/src/components/perio/chart/perioPresets.ts
 *
 * Фасад клинических пресетов пародонтограммы (Мандат 8b, <= 120 строк).
 */

export * from "./perioPresetTypes";
export * from "./perioExpressPresetsEngine";
export * from "./perioTherapistPresetsEngine";
export * from "./perioSideEffectsEngine";
export * from "./perioConsumables";
export * from "./perioConsumables";

import { applyExpressPerioPreset } from "./perioExpressPresetsEngine";
import {
	buildPeriodontalTreatmentPlanJustification,
	dispatchPresetSideEffects,
	generatePerioProtocolText,
} from "./perioSideEffectsEngine";
import { applyTherapistPathologyPreset } from "./perioTherapistPresetsEngine";

export {
	applyExpressPerioPreset,
	applyTherapistPathologyPreset,
	dispatchPresetSideEffects,
	generatePerioProtocolText,
	buildPeriodontalTreatmentPlanJustification,
};
