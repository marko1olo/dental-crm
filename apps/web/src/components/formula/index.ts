/**
 * apps/web/src/components/formula/index.ts
 *
 * Unified Dental Formula & StomX Tooth Defects Harmonizer Module.
 * Exports vector odontogram components, 1-click clinical palettes, adapters,
 * and complete StomX catalogs and search functions.
 */

export * from "./types";
export * from "./stomxFormulaAdapter";
export * from "./StomxDefectsPalette";
export * from "./StomxToothFormulaView";

// Re-export StomX catalogs and functions directly for convenient consumption in Web UI
export {
	STOMX_TOOTH_DEFECTS,
	STOMX_POSITION_ANOMALIES,
	STOMX_DEFECTS_TREE,
	STOMX_ADULT_TEETH,
	STOMX_CHILD_TEETH,
	STOMX_ANATOMICAL_SURFACES,
	findStomxDefectByAlias,
	findStomxPositionAnomaly,
	mapStomxDefectToCrmToothState,
	mapCrmToothStateToStomxDefect,
	getStomxDefectsByCategory,
	filterStomxDefectsRequiringTreatment,
	isStomxToothHealthy,
	type StomxDefectColor,
	type StomxDefectType,
	type StomxDefectKey,
	type StomxDefectCategory,
	type StomxPositionAnomalyCode,
	type StomxPositionAnomaly,
	type StomxToothDefectItem,
	type StomxToothDefect,
	type CrmToothState,
	type StomxAnatomicalTooth,
	type StomxAnatomicalSurface,
} from "@dental/shared";
