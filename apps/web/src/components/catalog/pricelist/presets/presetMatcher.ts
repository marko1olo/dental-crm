/**
 * DENTE Dental CRM — Service Catalog & Nomenclature Presets
 *
 * Layer 2: Preset Matcher Facade
 * Mandate 8b Architecture: 100% Modular Decomposition (< 120 lines per file)
 */

export {
	normalizeCode804n,
	findPresetsByIcd10,
	findPresetsByToothContext,
	getRecommendedPresetsForSpecialty,
} from "./presetMatcherCore";

export {
	findPresetsByComplaint,
	matchPresets,
} from "./presetComplaintMatcher";
