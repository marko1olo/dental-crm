/**
 * apps/web/src/components/odontogram/chart/toothChartTypes.ts
 *
 * DENTE Dental CRM — Interactive Odontogram Chart Types & Facade.
 * SSOT compliant (Mandate: <= 250 lines facade).
 * Decomposed into:
 * - ./types/toothPathologyTypes.ts
 * - ./types/toothSurfaceTypes.ts
 * - ./types/toothRendererTypes.ts
 */

import type { CrmToothState } from "@dental/shared";
import {
	getNextFocusedTooth,
	getToothStateFromHotkey,
} from "../ClassicGostOdontogram";
import {
	BOTTOM_TEETH,
	MIXED_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	TOP_TEETH,
	splitArchAtMidline,
} from "@dental/shared";

export { getNextFocusedTooth, getToothStateFromHotkey };
export {
	TOP_TEETH,
	BOTTOM_TEETH,
	PEDIATRIC_TOP_TEETH,
	PEDIATRIC_BOTTOM_TEETH,
	MIXED_TOP_TEETH,
	MIXED_BOTTOM_TEETH,
	splitArchAtMidline,
};

export type ToothState =
	| CrmToothState
	| "Healthy"
	| "Caries"
	| "Pulpitis"
	| "Periodontitis"
	| "Filled"
	| "Crown"
	| "Planned_Crown"
	| "Implant"
	| "Planned_Implant"
	| "Missing"
	| "Retained"
	| "Root"
	| "Temporary_Crown"
	| "Veneer"
	| "Inlay"
	| "Primary"
	| "Resection"
	| "Gingivitis"
	| "Periodontitis_Mild"
	| "Periodontitis_Moderate"
	| "Periodontitis_Severe"
	| "Mobility_1"
	| "Mobility_2"
	| "Mobility_3"
	| "Mobility_I"
	| "Mobility_II"
	| "Mobility_III"
	| "Mobility_IV"
	| "Furcation_1"
	| "Furcation_2"
	| "Furcation_3"
	| "Furcation_I"
	| "Furcation_II"
	| "Furcation_III"
	| "Root_Canal_Treated"
	| "Bridge"
	| "Bridge_Abutment"
	| "Extracted"
	| "Impacted"
	| "Calculus"
	| "Bleeding"
	| "Recession"
	| "Pocket";

// Surface types & helpers
export {
	areSurfacesEqual,
	DENTAL_SURFACES,
	type DentalSurfaceKey,
	SURFACE_NAMES_RU,
	SURFACE_SHORT_RU,
	SURFACE_TO_RUSSIAN_MAP,
	RUSSIAN_TO_SURFACE_MAP,
	parseSurfacesString,
	formatSurfacesString,
	isSurfaceApplicableToTooth,
	validateSurfacesForTooth,
	getApplicableSurfacesForTooth,
	type AnatomicalToothSurface,
	ANATOMICAL_SURFACES,
} from "./types/toothSurfaceTypes";

// Pathology types, labels & protocols
export {
	TOOTH_STATE_LABELS,
	getToothStateLabelRu,
	FAST_TOOTH_PRESETS,
	type FastToothPreset,
	applyFastCariesK021Protocol,
	applyFastProHygieneProtocol,
	applyFastPulpitisProtocol,
	applyFastExtractionProtocol,
} from "./types/toothPathologyTypes";

// Renderer props, geometry tokens & quadrants
export {
	type ToothData,
	type ToothChartProps,
	areToothChartPropsEqual,
	type OdontogramQuadrantId,
	type QuadrantDefinition,
	ADULT_QUADRANTS,
	PEDIATRIC_QUADRANTS,
	getQuadrantForTooth,
	getAdjacentQuadrant,
	isQuadrantTop,
	getQuadrantTitle,
	getQuadrantTeeth,
	ALL_ADULT_TEETH_NUMBERS,
	ADULT_MOLARS,
	ADULT_FIRST_MOLARS,
	ADULT_WISDOM_TEETH,
	ADULT_PREMOLARS,
	ADULT_FRONTAL,
	ADULT_FRONT_TEETH,
	createDefaultAdultTeethData,
	PEDIATRIC_MOLARS,
	scaleCssPx,
	MIN_ARCH_SCALE,
	getFurcationMarkerSvg,
	getGingivalRecessionPath,
	getPeriodontalBoneLevelPath,
	ROOT_RESORPTION_STAGES,
	type CanalObturationMaterial,
	type FurcationGrade,
	type PeriodontalBoneLossPattern,
	type PostCoreType,
	type RestorativeMaterialKey,
	type DentitionMode,
	type RootResorptionStage,
} from "./types/toothRendererTypes";
