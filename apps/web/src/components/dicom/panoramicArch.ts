/**
 * Panoramic (ОПТГ) reconstruction geometry facade.
 * Decomposed per Mandate 8b into isolated modules <= 120 lines (facade <= 80 lines).
 */

export * from "./panoramicArchModules/panoramicArchTypes";
export * from "./panoramicArchModules/panoramicArchLabels";
export * from "./panoramicArchModules/panoramicArchGeometry";
export * from "./panoramicArchModules/panoramicArchSampling";
export * from "./panoramicArchModules/panoramicArchBuilder";
export * from "./panoramicArchModules/panoramicArchVolume";

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
	type Point2,
	point2DToPoint2,
	point2ToPoint2D,
	catmullRom2D,
	interpolateArchCurve,
	computeCurveNormals,
	totalArcLength,
	resampleByArcLength,
	buildUniformCurve,
	generateDefaultArchCurve,
	offsetCurve,
	AIR_HU,
	type CPRResult,
	type VolumeSamplingData,
	type CrossSectionGeometryParams,
	type CrossSectionFrame,
	trilinear,
	crossSectionFrame,
	computeCrossSection,
} from "./panoramicMprMath";
