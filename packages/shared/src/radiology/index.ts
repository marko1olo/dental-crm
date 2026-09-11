/**
 * ═══════════════════════════════════════════════════════════════════════════
 * CLINICAL RADIOLOGY & DENTAL RVG IMAGING ENGINE
 * Central Module Re-Exports: TWAIN 2.4, Hot-Folder Ingestion & Image Filters
 * ═══════════════════════════════════════════════════════════════════════════
 */

export * from "./rvgTwainEngine.js";
export * from "./hotFolderWatcher.js";
export * from "./radiologyFilterEngine.js";
export * from "./hotFolderSyncEngine.js";
export * from "./panoramicCprMath.js";
export * from "./cbctSafetyEngine.js";
export * from "./mischBoneDensity.js";
export * from "./cbctScanMeshEngine.js";
export * from "./cbctCropBox.js";
export * from "./surgicalGuideGeom.js";
export * from "./surgicalGuideValidate.js";
export * from "./surgicalGuideExport.js";
export * from "./guideValidate.js";
export {
	dot3,
	sub3,
	distPointToSegment3,
	distSegmentToSegment3,
	distSegmentToPolyline3,
	type Vec3,
} from "./implantSafetyClearance.js";
export * from "./implantSafetyClearance.js";
export * from "./boneQualityClassification.js";
export * from "./nerveCanalSpline.js";

// Wave 120: CBCT Bone Quality & CPR Math Adapter
export {
	type BoneQualityProfile,
	type MischGuidance,
	getMischBoneClinicalGuidance,
	MISCH_CLINICAL_GUIDANCE,
} from "./boneQuality.js";

export {
	buildUniformCurve,
	type CPRResult,
	type CrossSectionGeometryParams,
	type CrossSectionFrame,
	MAX_CROSS_SECTION_TILT_DEG,
	crossSectionFrame,
	computeCrossSection,
	AIR_HU,
} from "./cprMath.js";

export * as cprMathEngine from "./cprMath.js";
export * as boneQualityEngine from "./boneQuality.js";

// Wave 124: CBCT Auto Arch Detection Engine
export {
	smoothPolyline,
	detectArchControlPoints,
	type ArchDetectOptions,
} from "./archDetectEngine.js";

export * as archDetectEngine from "./archDetectEngine.js";
export * from "./archDetectEngine.js";

// Wave 123: CBCT Line Profile HU & ROI Densitometry Engine
export {
	type RoiStats,
	type ImplantBedDensitometry,
	roiStats,
	lineProfileHU,
	angleDeg,
	calculateImplantBedDensitometry,
} from "./measureStats.js";

export * as measureStatsEngine from "./measureStats.js";

// Wave 125: Tooth Setup & Prosthetically-Driven Implant Planning Engine
export {
	type PrincipalAxis,
	type CrownSuggestion,
	principalAxis,
	anglesFromWorldAxis,
	orientAxisByBone,
	suggestImplantFromMesh,
} from "./toothSetupEngine.js";

export * as toothSetupEngine from "./toothSetupEngine.js";
export * from "./toothSetupEngine.js";
