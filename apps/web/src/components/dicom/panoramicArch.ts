/**
 * Panoramic (ОПТГ) reconstruction geometry & MPR multi-planar math.
 * Canonical pure-math implementation resides in `../../utils/math/panoramicArch`
 * and `./panoramicMprMath`.
 * Re-exported here for backwards compatibility across DICOM & Visiograph views.
 */
export * from "../../utils/math/panoramicArch";
export {
	type Point3D,
	type AnatomicalJawLandmark,
	type AnatomicalJawPoint,
	type ArchCurvePoint,
	type CrossSectionSlicePlane,
	type CrossSectionOptions,
	type MprCrosshairSync,
	type ExtendedMischClass,
	type BoneDensityRecommendation,
	vec3Length,
	vec3Normalize,
	vec3Dot,
	vec3Cross,
	vec3Distance,
	vec3Lerp,
	createAnatomicalJawControlPoints,
	generateCatmullRomArch,
	generateCrossSectionSlicePlanes,
	synchronizeMprCoordinates,
	MISCH_THRESHOLDS,
	classifyMischBoneDensity,
} from "./panoramicMprMath";
