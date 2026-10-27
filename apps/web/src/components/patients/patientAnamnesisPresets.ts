/**
 * patientAnamnesisPresets.ts — Фасад клинических пресетов и профилей здоровья по умолчанию.
 */

export {
	DEFAULT_ANAMNESIS_PROFILE,
	ANAMNESIS_PRESETS,
	type AnamnesisPresetType,
	type PresetApplicationResult,
} from "./anamnesisPresets/anamnesisPresetTypes";

export { applyAnamnesisPreset } from "./anamnesisPresets/anamnesisPresetApplier";
