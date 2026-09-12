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
export * from "./guideValidationEngine.js";
export * as guideValidationEngine from "./guideValidationEngine.js";
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

// Wave 129: CBCT Measure Stats & HU Profile Engine
export {
	type DistanceMeasurement,
	type AngleMeasurement,
	type PolygonAreaMeasurement,
	type HUProfileSample,
	type HUStats,
	type MeasureStatsReportInput,
	calculateDistance3D,
	calculateAngle3D,
	calculatePolygonArea3D,
	sampleVolumeHU,
	sampleProfileHU,
	computeHUStats,
	measureDistance,
	measureAngle,
	measurePolygonArea,
	formatMeasureStatsA4Report,
} from "./measureStatsEngine.js";

export * as measureStatsEngine from "./measureStatsEngine.js";
export * from "./measureStatsEngine.js";

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

// Wave 126: CBCT <-> Intraoral Scan Registration & ICP Engine
export {
	IDENTITY4,
	mul4,
	applyMat4,
	rigidMatrix,
	centroid,
	jacobiEigenSymmetric,
	type JacobiEigenResult,
	kabschTransform,
	kabschTransformWithRms,
	type KabschResultWithRms,
	type IcpOptions,
	type IcpResult,
	nearestPoint,
	nearestRms,
	icpAlign,
	rayTriangleHit,
	pickTriangleSoup,
	type RegistrationProtocolInput,
	formatRegistrationA4Protocol,
} from "./cbctRegistrationEngine.js";

export * as cbctRegistrationEngine from "./cbctRegistrationEngine.js";

// Wave 128: CBCT Mesh Slice & Surgical Guide STL Export Engine
export * from "./guideExportEngine.js";
export * as guideExportEngine from "./guideExportEngine.js";

// Wave 130: CBCT 3D Implant Geometry & Mesh Generator Engine
export {
	type ImplantDimensions,
	type Implant3DPlacement,
	type ImplantMeshBuffers,
	type SafetyZoneCheckResult,
	type ImplantSafetyOptions,
	type ImplantPlanningReportInput,
	type ArchFrame,
	type PlaneFrame,
	type ImplantBody,
	type SleeveSpec,
	generateImplantMesh,
	transformImplantMesh,
	checkImplantSafetyDistances,
	formatImplantPlanningReportA4,
	calculateImplantRadius,
	radiusProfile,
	archFrameAt,
	nearestArchFrame,
	implantAxis,
	implantWorldAxis,
	projectToPlane,
	cylinderPlaneStrip,
	implantPlaneStrip,
	sleeveBody,
	drillSegment,
} from "./implantGeometryEngine.js";
export * as implantGeometryEngine from "./implantGeometryEngine.js";

// Wave 131: CBCT Surgical Plan Persistence & Case IO Engine
export {
	PLAN_IO_VERSION,
	MAX_PLAN_IMPLANTS,
	MAX_CANAL_SPLINE_POINTS,
	MAX_ARCH_CONTROL_POINTS,
	MAX_FIXATION_PINS,
	MAX_CANALS_COUNT,
	isValidPermanentFdiToothNumber,
	vec3TupleSchema,
	vec2TupleSchema,
	fixationPinTupleSchema,
	implantPlanItemSchema,
	nerveCanalPlanSchema,
	projectionModeSchema,
	archCurvePlanSchema,
	surgicalGuidePlanSchema,
	safetyLimitsSchema,
	planCaseSchema,
	type ImplantPlanItem,
	type NerveCanalPlan,
	type ArchCurvePlan,
	type SurgicalGuidePlan,
	type SafetyLimits,
	type PlanCase,
	type ActiveRadiologyContext,
	type PlanCaseValidationResult,
	serializePlanCase,
	parseAndSanitizePlanCase,
	formatSurgicalPlanForm043A4Protocol,
} from "./cbctPlanIOEngine.js";
export * as cbctPlanIOEngine from "./cbctPlanIOEngine.js";

// Wave 132: Sirona Galileos & Morita OneVolume Native CBCT Import Engine
export {
	MAX_NATIVE_AXIS,
	MAX_NATIVE_DEPTH,
	MAX_NATIVE_VOXELS,
	ONEVOLUME_SENTINEL,
	ONEVOLUME_VERSION_MARKER,
	AIR_SENTINEL_HU,
	nativeVolumeModalitySchema,
	nativeVolumeMetadataSchema,
	parsedNativeVolumeSchema,
	type NativeVolumeModality,
	type NativeVolumeMetadata,
	type ParsedNativeVolume,
	matchGalileosFiles,
	matchOneVolumeFilename,
	parseGalileosHeader,
	assembleGalileosVolume,
	parseOneVolumeBinary,
	formatNativeVolumeA4Protocol,
	decompressGzipSync,
} from "./nativeVolumeImportEngine.js";
export * as nativeVolumeImportEngine from "./nativeVolumeImportEngine.js";
export * from "./nativeVolumeImportEngine.js";

// Wave 133: 3D Optical Scan Rigid Registration & Prosthetic Tooth Setup Engine
export {
	identity4,
	classifyRegistrationQuality,
	pickMeshRay,
	suggestImplantFromCrown,
	formatScanRegistrationA4Protocol,
	type RegistrationQuality,
	type KabschResultWithQuality,
	type MeshRayHit,
	type CrownImplantSuggestion,
	type ScanRegistrationProtocolInput,
} from "./scanRegistrationEngine.js";
export * as scanRegistrationEngine from "./scanRegistrationEngine.js";

// Wave 134: CPR Panoramic Reformation & Dental Arch Curve Engine
export {
	point2Schema,
	vec3Schema,
	projectionModeSchema as cprProjectionModeSchema,
	archToothLandmarkSchema,
	volumeSamplingInputSchema,
	panoramicReformationParamsSchema,
	paraxialCrossSectionParamsSchema,
	type ProjectionMode,
	type ArchToothLandmark,
	type VolumeSamplingInput,
	type PanoramicReformationParams,
	type PanoramicReformationResult,
	type ParaxialCrossSectionParams,
	type ParaxialCrossSectionResult,
	type PanoramicCprReportParams,
	generateDefaultArchWithLandmarks,
	trilinearInterpolation,
	createVolumeSamplingData,
	buildPanoramicReformation,
	generatePanoramic,
	computeParaxialCrossSection,
	formatPanoramicCprReportA4,
} from "./cprPanoramicEngine.js";
export * as cprPanoramicEngine from "./cprPanoramicEngine.js";

// Wave 135: CBCT 2D/3D Annotation Layer & 3D Volume Preset Engine
export {
	annotationToolTypeSchema,
	type AnnotationToolType,
	volume3DQualitySchema,
	type Volume3DQuality,
	volume3DColormapSchema,
	type Volume3DColormap,
	sliceViewTypeSchema,
	type SliceViewType,
	annotationStatsSchema,
	type AnnotationStats,
	annotationMeasureSchema,
	type AnnotationMeasure,
	volumeTransferFunctionPresetSchema,
	type VolumeTransferFunctionPreset,
	CS_TOOL_KEYS,
	ANNOTATION_TOOL_NAMES_RU,
	VOLUME_3D_QUALITY_PRESETS,
	VOLUME_3D_COLORMAPS,
	VOLUME_3D_COLORMAP_DEFINITIONS,
	CLINICAL_3D_VOLUME_PRESETS,
	type ColorMapStop,
	getPresetColorMapStops,
	type CalculateAnnotationStatsParams,
	calculateAnnotationStats,
	type FilterAnnotationOptions,
	filterVisibleAnnotations,
	type CreateAnnotationParams,
	createAnnotationMeasure,
	type AnnotationReportInput,
	formatAnnotationReportForm043A4,
} from "./cbctAnnotationEngine.js";
export * as cbctAnnotationEngine from "./cbctAnnotationEngine.js";


