/**
 * SanPiN 3.3686-21 & GOST ISO 17665 Class B Autoclave & Sterilization Presets
 * Standards for Dental Sterilization, Indicators, and Cycle Parameters
 */

export {
	CLINIC_AUTOCLAVES_PRESETS,
	type AutoclaveApparatusInfo,
	type AutoclaveDeviceClass,
} from "./autoclaveHardwarePresets.js";

export {
	getPackagingRule,
	SANPIN_PACKAGING_RULES,
	type AutoclavePackagingType,
	type PackagingShelfLifeRule,
} from "./autoclavePackagingRules.js";

export {
	AUTOCLAVE_CYCLES,
	getAutoclavePreset,
	type AutoclaveCycleDefinition,
	type AutoclaveCycleId,
	type IndicatorQualityClass,
} from "./autoclaveStandardCycles.js";
