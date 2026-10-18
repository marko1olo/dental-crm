/**
 * apps/web/src/components/odontogram/chart/toothChartTypes.ts
 *
 * DENTE Dental CRM — Interactive Odontogram Chart Types & Facade.
 * Compliant with Mandate 8b (<= 120 lines).
 */

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

export type { ToothState } from "./types/toothStateUnion";

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
