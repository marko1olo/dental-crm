/**
 * DENTE Dental CRM — Anatomical Materials & Surfaces Facade
 * Compliant with Mandate 8b (<= 120 lines).
 */

import {
	isMaxillaryArch,
	isPatientLeftSide,
	isSurfaceActive,
	normalizeAnatomicalSurfaces,
	normalizeSurfaceKey,
} from "@dental/shared";

export {
	isMaxillaryArch,
	isPatientLeftSide,
	normalizeSurfaceKey,
	isSurfaceActive,
	normalizeAnatomicalSurfaces,
};

export { ICDAS_CLASSIFICATIONS } from "./anatomicalMaterials/icdasClassifications";
export {
	RESTORATIVE_MATERIALS,
	ANATOMICAL_SURFACE_LABELS_RU,
	ANATOMICAL_SURFACE_NAMES_RU,
} from "./anatomicalMaterials/restorativeMaterialsData";
export { getSurfaceShading } from "./anatomicalMaterials/surfaceShadingService";
export { CANAL_OBTURATIONS } from "./anatomicalMaterials/canalObturationsData";
export {
	getPeriodontalBoneLevelPath,
	getGingivalRecessionPath,
	getFurcationMarkerSvg,
} from "./anatomicalMaterials/periodontalMarkerCalculations";
