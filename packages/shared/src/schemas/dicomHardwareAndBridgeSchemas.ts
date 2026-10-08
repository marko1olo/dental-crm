import { z } from "zod";
import { dicomClientRuntimeProfileSchema, dicomViewerKindSchema, dicomViewerLaunchManifestResponseSchema, dicomViewerPlanningTaskSchema, dicomViewerToolConfigSchema, dicomViewerToolStateAnnotationSchema, dicomViewerToolStateTargetSchema, dicomViewerViewportStateSchema, dicomWorkstationClientFactsSchema, dicomWorkstationReadinessCheckSchema, externalViewerPathSchema, imagingViewerAnnotationSchema, imagingViewerImplantPlanSchema, imagingViewerSessionStateSchema } from "./imagingViewerAndWorkstationSchemas.js";
import { dicomMprLoadStrategySchema, dicomMprProjectionSchema, dicomMprResourcePolicySchema, dicomMprResourceTierSchema } from "./clinicScaleAndPreviewSchemas.js";
import { dicomFolderSeriesPreviewResponseSchema, dicomSeriesPreviewGroupSchema, dicomWebConnectorCheckResponseSchema } from "./dicomPreviewAndWindowSchemas.js";
import { imagingSourceKindSchema } from "./aiAndEgiszSchemas.js";
import { httpUrlSchema } from "./documentMetaSchemas.js";

export type DicomWorkstationReadinessCheck = z.infer<
	typeof dicomWorkstationReadinessCheckSchema
>;

export const dicomGpuClassSchema = z.enum([
	"none",
	"integrated_low",
	"integrated_ok",
	"discrete_ok",
	"diagnostic",
]);

export type DicomGpuClass = z.infer<typeof dicomGpuClassSchema>;

export const dicomRenderMemoryBudgetClassSchema = z.enum([
	"minimum",
	"constrained",
	"standard",
	"workstation",
	"diagnostic",
]);

export type DicomRenderMemoryBudgetClass = z.infer<
	typeof dicomRenderMemoryBudgetClassSchema
>;

export const dicomDiagnosticPixelPolicySchema = z.enum([
	"metadata_only_no_pixels",
	"browser_preview_not_diagnostic",
	"desktop_app_or_external_review",
]);

export type DicomDiagnosticPixelPolicy = z.infer<
	typeof dicomDiagnosticPixelPolicySchema
>;

export const dicomRenderTextureStrategySchema = z.enum([
	"metadata_only",
	"stack_2d_textures",
	"single_3d_texture",
	"bricked_3d_textures",
	"external_viewer",
]);

export type DicomRenderTextureStrategy = z.infer<
	typeof dicomRenderTextureStrategySchema
>;

export const dicomRenderQualityModeSchema = z.enum([
	"metadata_only",
	"interactive_low",
	"balanced_mpr",
	"diagnostic_full",
	"external",
]);

export type DicomRenderQualityMode = z.infer<
	typeof dicomRenderQualityModeSchema
>;

export const dicomGpuRenderPlanSchema = z.object({
	gpuClass: dicomGpuClassSchema,
	textureStrategy: dicomRenderTextureStrategySchema,
	qualityMode: dicomRenderQualityModeSchema,
	downsampleFactor: z.number().int().positive(),
	targetSliceBatch: z.number().int().positive(),
	maxTextureEdge: z.number().int().positive().nullable(),
	max3dTextureEdge: z.number().int().positive().nullable(),
	estimatedGpuMemoryMb: z.number().int().nonnegative(),
	memoryBudgetClass: dicomRenderMemoryBudgetClassSchema.default("standard"),
	hardwareQualityWeight: z.number().min(0).max(1).default(0.5),
	progressiveSliceWindowCap: z.number().int().positive().default(32),
	diagnosticPixelPolicy: dicomDiagnosticPixelPolicySchema.default(
		"browser_preview_not_diagnostic",
	),
	useWebWorker: z.boolean(),
	useOffscreenCanvas: z.boolean(),
	interactionBudgetMs: z.number().int().positive(),
	firstPaintStrategy: z.string(),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DicomGpuRenderPlan = z.infer<typeof dicomGpuRenderPlanSchema>;

export const dicomRenderCacheTaskKindSchema = z.enum([
	"metadata_index",
	"thumbnail_first",
	"fetch_slice_range",
	"decode_slice_range",
	"upload_texture_range",
	"build_volume_texture",
	"build_texture_brick",
	"derive_mpr_plane",
	"derive_panoramic_curve",
	"persist_cache_index",
	"external_handoff",
]);

export type DicomRenderCacheTaskKind = z.infer<
	typeof dicomRenderCacheTaskKindSchema
>;

export const dicomRenderCacheTargetSchema = z.enum([
	"main_thread",
	"web_worker",
	"offscreen_canvas",
	"gpu",
	"indexeddb",
	"external_viewer",
]);

export type DicomRenderCacheTarget = z.infer<
	typeof dicomRenderCacheTargetSchema
>;

export const dicomRenderCachePrioritySchema = z.enum([
	"blocking",
	"interactive",
	"prefetch",
	"background",
	"deferred",
]);

export type DicomRenderCachePriority = z.infer<
	typeof dicomRenderCachePrioritySchema
>;

export const dicomRenderCacheTaskSchema = z.object({
	id: z.string(),
	kind: dicomRenderCacheTaskKindSchema,
	target: dicomRenderCacheTargetSchema,
	priority: dicomRenderCachePrioritySchema,
	sliceStart: z.number().int().nonnegative().nullable(),
	sliceEnd: z.number().int().nonnegative().nullable(),
	projection: dicomMprProjectionSchema.nullable(),
	estimatedMemoryMb: z.number().int().nonnegative(),
	budgetMs: z.number().int().positive(),
	blocking: z.boolean(),
	label: z.string(),
	nextAction: z.string(),
});

export type DicomRenderCacheTask = z.infer<typeof dicomRenderCacheTaskSchema>;

export const dicomRenderInteractionPhaseSchema = z.object({
	id: z.enum([
		"external_review",
		"first_visible_slice",
		"interactive_navigation",
		"idle_refine",
	]),
	label: z.string(),
	trigger: z.string(),
	targetFrameMs: z.number().int().positive(),
	downsampleFactor: z.number().int().positive(),
	maxResidentSlices: z.number().int().positive(),
	workerCount: z.number().int().nonnegative(),
	nextAction: z.string(),
});

export type DicomRenderInteractionPhase = z.infer<
	typeof dicomRenderInteractionPhaseSchema
>;

export const dicomProgressiveLoadStageKindSchema = z.enum([
	"metadata_only",
	"external_handoff",
	"seed_slices",
	"interleaved_decimation",
	"active_window",
	"adjacent_window",
	"idle_refine",
]);

export type DicomProgressiveLoadStageKind = z.infer<
	typeof dicomProgressiveLoadStageKindSchema
>;

export const dicomProgressiveLoadRequestPatternSchema = z.enum([
	"none",
	"center_first",
	"interleaved",
	"active_window",
	"adjacent_window",
	"idle_full",
]);

export type DicomProgressiveLoadRequestPattern = z.infer<
	typeof dicomProgressiveLoadRequestPatternSchema
>;

export const dicomProgressiveLoadCornerstoneRequestTypeSchema = z.enum([
	"none",
	"thumbnail",
	"interaction",
	"prefetch",
	"compute",
	"external",
]);

export type DicomProgressiveLoadCornerstoneRequestType = z.infer<
	typeof dicomProgressiveLoadCornerstoneRequestTypeSchema
>;

export const dicomProgressiveLoadStageSchema = z.object({
	id: z.string(),
	kind: dicomProgressiveLoadStageKindSchema,
	label: z.string(),
	priority: dicomRenderCachePrioritySchema,
	target: dicomRenderCacheTargetSchema,
	requestPattern: dicomProgressiveLoadRequestPatternSchema,
	cornerstoneRequestType: dicomProgressiveLoadCornerstoneRequestTypeSchema,
	cancelGroupId: z.string().nullable(),
	requiresStageIds: z.array(z.string()),
	sliceStart: z.number().int().nonnegative().nullable(),
	sliceEnd: z.number().int().nonnegative().nullable(),
	sliceOrder: z.array(z.number().int().nonnegative()).max(256),
	decimationFactor: z.number().int().positive(),
	offset: z.number().int().nonnegative(),
	maxResidentSlices: z.number().int().positive(),
	budgetMs: z.number().int().positive(),
	blocking: z.boolean(),
	nextAction: z.string(),
});

export type DicomProgressiveLoadStage = z.infer<
	typeof dicomProgressiveLoadStageSchema
>;

export const dicomRenderCachePlanRequestSchema = z.object({
	series: dicomSeriesPreviewGroupSchema,
	renderPlan: dicomGpuRenderPlanSchema,
	viewerState: imagingViewerSessionStateSchema.nullable().optional(),
});

export type DicomRenderCachePlanRequest = z.infer<
	typeof dicomRenderCachePlanRequestSchema
>;

export const dicomRenderCachePlanResponseSchema = z.object({
	version: z.literal("dental-crm-dicom-render-cache-v1"),
	generatedAt: z.string(),
	textureStrategy: dicomRenderTextureStrategySchema,
	qualityMode: dicomRenderQualityModeSchema,
	memoryBudgetClass: dicomRenderMemoryBudgetClassSchema,
	hardwareQualityWeight: z.number().min(0).max(1),
	progressiveSliceWindowCap: z.number().int().positive(),
	diagnosticPixelPolicy: dicomDiagnosticPixelPolicySchema,
	activeSliceIndex: z.number().int().nonnegative(),
	centerSliceIndex: z.number().int().nonnegative(),
	firstWindowStart: z.number().int().nonnegative(),
	firstWindowEnd: z.number().int().nonnegative(),
	visibleSliceBudget: z.number().int().positive(),
	maxResidentSlices: z.number().int().positive(),
	totalBatches: z.number().int().positive(),
	decodeConcurrency: z.number().int().positive(),
	uploadConcurrency: z.number().int().positive(),
	workerCount: z.number().int().nonnegative(),
	gpuMemoryBudgetMb: z.number().int().nonnegative(),
	cpuMemoryBudgetMb: z.number().int().nonnegative(),
	shouldPersistToIndexedDb: z.boolean(),
	firstPaintBudgetMs: z.number().int().positive(),
	interactionBudgetMs: z.number().int().positive(),
	interactionPhases: z.array(dicomRenderInteractionPhaseSchema),
	progressiveStages: z.array(dicomProgressiveLoadStageSchema),
	tasks: z.array(dicomRenderCacheTaskSchema),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DicomRenderCachePlanResponse = z.infer<
	typeof dicomRenderCachePlanResponseSchema
>;

export const dicomViewerToolStateBundleRequestSchema = z.object({
	target: dicomViewerToolStateTargetSchema.default("cornerstone3d"),
	viewerKind: dicomViewerKindSchema.default("cornerstone3d"),
	series: dicomSeriesPreviewGroupSchema,
	viewerState: imagingViewerSessionStateSchema.nullable().optional(),
	annotations: z.array(imagingViewerAnnotationSchema).max(200).default([]),
	renderPlan: dicomGpuRenderPlanSchema.nullable().optional(),
});

export type DicomViewerToolStateBundleRequest = z.infer<
	typeof dicomViewerToolStateBundleRequestSchema
>;

export const dicomViewerToolStateBundleResponseSchema = z.object({
	version: z.literal("dental-crm-dicom-tool-state-v1"),
	target: dicomViewerToolStateTargetSchema,
	viewerKind: dicomViewerKindSchema,
	generatedAt: z.string(),
	seriesRef: z.object({
		studyInstanceUid: z.string().nullable(),
		seriesInstanceUid: z.string().nullable(),
		sourceKind: imagingSourceKindSchema,
		sourceName: z.string(),
		cornerstoneVolumeId: z.string().nullable(),
		firstFilePath: z.string().nullable(),
	}),
	adapterHints: z.object({
		cornerstone3d: z.object({
			toolGroupId: z.string(),
			renderingEngineId: z.string(),
			volumeId: z.string().nullable(),
			viewportIds: z.array(z.string()),
		}),
		ohif: z.object({
			measurementSourceName: z.string(),
			displaySetInstanceUid: z.string().nullable(),
			hangingProtocolStage: z.string(),
		}),
	}),
	viewports: z.array(dicomViewerViewportStateSchema),
	tools: z.array(dicomViewerToolConfigSchema),
	annotations: z.array(dicomViewerToolStateAnnotationSchema),
	planningTasks: z.array(dicomViewerPlanningTaskSchema),
	activeQuickActionId: z.string().min(1).max(120).nullable().default(null),
	implantPlan: imagingViewerImplantPlanSchema.nullable().default(null),
	resourcePolicy: dicomMprResourcePolicySchema,
	renderPlan: dicomGpuRenderPlanSchema.nullable(),
	exportHints: z.array(z.string()),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DicomViewerToolStateBundleResponse = z.infer<
	typeof dicomViewerToolStateBundleResponseSchema
>;

export const dicomWorkstationReadinessRequestSchema = z.object({
	series: dicomSeriesPreviewGroupSchema,
	client: dicomWorkstationClientFactsSchema,
	connector: dicomWebConnectorCheckResponseSchema.nullable().optional(),
});

export type DicomWorkstationReadinessRequest = z.infer<
	typeof dicomWorkstationReadinessRequestSchema
>;

export const dicomWorkstationReadinessResponseSchema = z.object({
	detectedTier: dicomMprResourceTierSchema,
	requiredTier: dicomMprResourceTierSchema,
	effectiveLoadStrategy: dicomMprLoadStrategySchema,
	runtimeProfile: dicomClientRuntimeProfileSchema,
	readinessScore: z.number().int().min(0).max(100),
	canOpenInBrowser: z.boolean(),
	shouldUseExternalViewer: z.boolean(),
	renderPlan: dicomGpuRenderPlanSchema,
	checks: z.array(dicomWorkstationReadinessCheckSchema),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DicomWorkstationReadinessResponse = z.infer<
	typeof dicomWorkstationReadinessResponseSchema
>;

export const dicomViewerWorkbenchManifestRequestSchema = z.object({
	viewerKind: dicomViewerKindSchema.default("cornerstone3d"),
	target: dicomViewerToolStateTargetSchema.default("cornerstone3d"),
	series: dicomSeriesPreviewGroupSchema,
	client: dicomWorkstationClientFactsSchema,
	connector: dicomWebConnectorCheckResponseSchema.nullable().optional(),
	viewerState: imagingViewerSessionStateSchema.nullable().optional(),
	annotations: z.array(imagingViewerAnnotationSchema).max(200).default([]),
	dicomWebBaseUrl: httpUrlSchema.nullable().optional(),
	ohifBaseUrl: httpUrlSchema.nullable().optional(),
	externalViewerPath: externalViewerPathSchema.nullable().optional(),
	allowExternalHandoff: z.boolean().default(true),
});

export type DicomViewerWorkbenchManifestRequest = z.infer<
	typeof dicomViewerWorkbenchManifestRequestSchema
>;

export const dicomViewerWorkbenchManifestResponseSchema = z.object({
	version: z.literal("dental-crm-dicom-workbench-v1"),
	generatedAt: z.string(),
	readiness: dicomWorkstationReadinessResponseSchema,
	renderCachePlan: dicomRenderCachePlanResponseSchema,
	launchManifest: dicomViewerLaunchManifestResponseSchema,
	toolStateBundle: dicomViewerToolStateBundleResponseSchema,
	doctorBlocking: z.boolean(),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DicomViewerWorkbenchManifestResponse = z.infer<
	typeof dicomViewerWorkbenchManifestResponseSchema
>;

export const dicomWorkbenchPixelPolicySchema = z.literal(
	"metadata_and_tool_state_only_no_pixels",
);

export type DicomWorkbenchPixelPolicy = z.infer<
	typeof dicomWorkbenchPixelPolicySchema
>;

export const dicomWorkbenchBundleSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	seriesKey: z.string(),
	patientId: z.string().uuid().nullable(),
	studyInstanceUid: z.string().nullable(),
	seriesInstanceUid: z.string().nullable(),
	sourceName: z.string(),
	sourceKind: imagingSourceKindSchema,
	pixelPolicy: dicomWorkbenchPixelPolicySchema,
	manifest: dicomViewerWorkbenchManifestResponseSchema,
	clientSavedAt: z.string().nullable(),
	serverSavedAt: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
	warnings: z.array(z.string()),
});

export type DicomWorkbenchBundle = z.infer<typeof dicomWorkbenchBundleSchema>;

export const saveDicomWorkbenchBundleRequestSchema = z.object({
	manifest: dicomViewerWorkbenchManifestResponseSchema,
	clientSavedAt: z.string().nullable().optional(),
	seriesKey: z.string().min(1).max(1000).optional(),
});

export type SaveDicomWorkbenchBundleRequest = z.infer<
	typeof saveDicomWorkbenchBundleRequestSchema
>;

export const dicomWorkbenchBundleResponseSchema = z.object({
	bundle: dicomWorkbenchBundleSchema,
	warnings: z.array(z.string()),
});

export type DicomWorkbenchBundleResponse = z.infer<
	typeof dicomWorkbenchBundleResponseSchema
>;

export const dicomWorkbenchBundleListResponseSchema = z.object({
	bundles: z.array(dicomWorkbenchBundleSchema),
	total: z.number().int().nonnegative(),
	generatedAt: z.string(),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DicomWorkbenchBundleListResponse = z.infer<
	typeof dicomWorkbenchBundleListResponseSchema
>;

export const dicomFolderWorkupPathSchema = z.enum([
	"open_mpr",
	"downsampled_mpr",
	"external_viewer",
	"metadata_only",
]);

export type DicomFolderWorkupPath = z.infer<typeof dicomFolderWorkupPathSchema>;

export const dicomFolderWorkupPlanRequestSchema = z.object({
	folderPath: z.string().min(1),
	recursive: z.boolean().default(true),
	sourceName: z.string().min(1).default("dicom_folder_workup"),
	maxFiles: z.number().int().positive().max(5000).default(800),
	maxFolders: z.number().int().positive().max(3000).default(900),
	maxEntriesPerFolder: z.number().int().positive().max(10000).default(2000),
	maxHeaderBytes: z
		.number()
		.int()
		.positive()
		.max(1024 * 1024)
		.default(256 * 1024),
	client: dicomWorkstationClientFactsSchema,
	viewerState: imagingViewerSessionStateSchema.nullable().optional(),
});

export type DicomFolderWorkupPlanRequest = z.infer<
	typeof dicomFolderWorkupPlanRequestSchema
>;

export const dicomFolderWorkupPlanSeriesSchema = z.object({
	series: dicomSeriesPreviewGroupSchema,
	readiness: dicomWorkstationReadinessResponseSchema,
	renderCachePlan: dicomRenderCachePlanResponseSchema,
	recommendedPath: dicomFolderWorkupPathSchema,
	doctorBlocking: z.boolean(),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DicomFolderWorkupPlanSeries = z.infer<
	typeof dicomFolderWorkupPlanSeriesSchema
>;

export const dicomFolderWorkupPlanResponseSchema = z.object({
	version: z.literal("dental-crm-dicom-folder-workup-v1"),
	generatedAt: z.string(),
	folder: dicomFolderSeriesPreviewResponseSchema,
	selectedSeriesCount: z.number().int().nonnegative(),
	plans: z.array(dicomFolderWorkupPlanSeriesSchema),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DicomFolderWorkupPlanResponse = z.infer<
	typeof dicomFolderWorkupPlanResponseSchema
>;

export const localBridgeKindSchema = z.enum([
	"speech_whisper",
	"speech_vosk",
	"dicom_cbct",
	"ocr_vision",
	"ohif_viewer",
	"migration_staging",
]);

export type LocalBridgeKind = z.infer<typeof localBridgeKindSchema>;

export const localBridgeStatusSchema = z.enum([
	"ready",
	"not_configured",
	"unreachable",
	"blocked",
	"misconfigured",
	"planned",
]);

export type LocalBridgeStatus = z.infer<typeof localBridgeStatusSchema>;

export const localBridgeReadinessItemSchema = z.object({
	kind: localBridgeKindSchema,
	title: z.string(),
	status: localBridgeStatusSchema,
	configured: z.boolean(),
	reachable: z.boolean(),
	urlRedacted: z.string().nullable(),
	setupSettingsCount: z.number().int().nonnegative(),
	latencyMs: z.number().int().nonnegative().nullable(),
	role: z.string(),
	workload: z.string(),
	privacyBoundary: z.string(),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});
