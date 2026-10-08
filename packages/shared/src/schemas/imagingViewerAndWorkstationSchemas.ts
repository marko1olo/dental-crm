import { z } from "zod";
import { dicomMprProjectionSchema, dicomMprReadinessSchema, dicomMprResourcePolicySchema } from "./clinicScaleAndPreviewSchemas.js";
import { dicomSeriesPreviewGroupSchema, imagingViewerModeSchema, imagingViewerWindowPresetSchema } from "./dicomPreviewAndWindowSchemas.js";
import { httpUrlSchema } from "./documentMetaSchemas.js";
import { imagingSourceKindSchema } from "./aiAndEgiszSchemas.js";
import { hardwareGpuTypeSchema, hardwareTierSchema } from "../hardware/index.js";

export const imagingViewerToolSchema = z.enum([
	"window_level",
	"pan",
	"zoom",
	"rotate",
	"invert",
	"measure_distance",
	"measure_angle",
	"measure_area",
	"measure_volume",
	"note",
	"implant_axis",
	"implant_library",
	"nerve_canal",
	"panoramic_curve",
	"bone_density_probe",
	"surgical_guide",
	"reset",
]);

export type ImagingViewerTool = z.infer<typeof imagingViewerToolSchema>;

export const imagingViewerAnnotationTypeSchema = z.enum([
	"note",
	"distance",
	"angle",
	"roi",
	"area_roi",
	"volume_roi",
	"implant_axis",
	"nerve_canal",
	"panoramic_curve",
	"bone_density_probe",
	"surgical_guide",
	"landmark",
]);

export type ImagingViewerAnnotationType = z.infer<
	typeof imagingViewerAnnotationTypeSchema
>;

export const imagingViewerAnnotationSemanticRoleSchema = z.enum([
	"ridge_width",
	"bone_height",
	"clearance",
	"generic",
]);

export type ImagingViewerAnnotationSemanticRole = z.infer<
	typeof imagingViewerAnnotationSemanticRoleSchema
>;

export const imagingViewerPointSchema = z.object({
	x: z.number(),
	y: z.number(),
	z: z.number().nullable().optional(),
	plane: dicomMprProjectionSchema.nullable().optional(),
});

export type ImagingViewerPoint = z.infer<typeof imagingViewerPointSchema>;

export const imagingViewerImplantPlanSchema = z.object({
	itemId: z.string().min(1).max(120),
	system: z.string().min(1).max(120),
	line: z.string().min(1).max(160),
	diameterMm: z.number().positive().max(20),
	lengthMm: z.number().positive().max(80),
	platform: z.string().min(1).max(120),
	indication: z.string().max(300),
	selectedAt: z.string().nullable().default(null),
});

export type ImagingViewerImplantPlan = z.infer<
	typeof imagingViewerImplantPlanSchema
>;

export const imagingViewerSessionStateSchema = z.object({
	mode: imagingViewerModeSchema,
	activeTool: imagingViewerToolSchema,
	activeQuickActionId: z.string().min(1).max(120).nullable().default(null),
	windowPreset: imagingViewerWindowPresetSchema,
	windowCenter: z.number().nullable(),
	windowWidth: z.number().positive().nullable(),
	brightness: z.number().min(0.1).max(4),
	contrast: z.number().min(0.1).max(4),
	inverted: z.boolean(),
	rotationDeg: z.number().int(),
	flipHorizontal: z.boolean(),
	zoom: z.number().min(0.1).max(10),
	panX: z.number(),
	panY: z.number(),
	sliceIndex: z.number().int().nonnegative().nullable().default(null),
	projection: dicomMprProjectionSchema.nullable(),
	axisDeg: z.number().min(-180).max(180),
	slabMm: z.number().positive().max(100),
	crosshair: z.boolean(),
	linkedPlanes: z.boolean(),
	implantPlan: imagingViewerImplantPlanSchema.nullable().default(null),
});

export type ImagingViewerSessionState = z.infer<
	typeof imagingViewerSessionStateSchema
>;

export const imagingViewerAnnotationSchema = z.object({
	id: z.string().min(1).max(120),
	type: imagingViewerAnnotationTypeSchema,
	label: z.string().min(1).max(160),
	toothCode: z.string().max(20).nullable(),
	points: z.array(imagingViewerPointSchema).max(64),
	measurementValue: z.number().nullable(),
	unit: z.string().max(20).nullable(),
	semanticRole: imagingViewerAnnotationSemanticRoleSchema.nullable().optional(),
	note: z.string().max(1000).nullable(),
	createdByUserId: z.string().uuid().nullable(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type ImagingViewerAnnotation = z.infer<
	typeof imagingViewerAnnotationSchema
>;

export const saveImagingViewerSessionRequestSchema = z.object({
	patientId: z.string().uuid(),
	visitId: z.string().uuid().nullable().optional(),
	state: imagingViewerSessionStateSchema,
	annotations: z.array(imagingViewerAnnotationSchema).max(200).default([]),
	clientSavedAt: z.string().nullable().optional(),
});

export type SaveImagingViewerSessionRequest = z.infer<
	typeof saveImagingViewerSessionRequestSchema
>;

export const imagingViewerSessionSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	studyId: z.string().uuid(),
	patientId: z.string().uuid().nullable(),
	visitId: z.string().uuid().nullable(),
	state: imagingViewerSessionStateSchema,
	annotations: z.array(imagingViewerAnnotationSchema),
	clientSavedAt: z.string().nullable(),
	serverSavedAt: z.string(),
	createdAt: z.string(),
	updatedAt: z.string(),
	warnings: z.array(z.string()),
});

export type ImagingViewerSession = z.infer<typeof imagingViewerSessionSchema>;

export const imagingViewerSessionResponseSchema = z.object({
	session: imagingViewerSessionSchema,
	warnings: z.array(z.string()),
});

export type ImagingViewerSessionResponse = z.infer<
	typeof imagingViewerSessionResponseSchema
>;

export const dicomViewerKindSchema = z.enum([
	"ohif",
	"cornerstone3d",
	"weasis",
	"radiant",
	"external_url",
]);

export type DicomViewerKind = z.infer<typeof dicomViewerKindSchema>;

export const dicomViewerLaunchModeSchema = z.enum([
	"dicomweb_url",
	"local_manifest",
	"external_handoff",
	"blocked",
]);

export type DicomViewerLaunchMode = z.infer<typeof dicomViewerLaunchModeSchema>;

export const dicomViewerDataSourceKindSchema = z.enum([
	"dicomweb",
	"local_files",
	"external_viewer",
	"none",
]);

export type DicomViewerDataSourceKind = z.infer<
	typeof dicomViewerDataSourceKindSchema
>;

export const externalViewerPathSchema = z.string().max(1000);

export const dicomViewerLaunchManifestRequestSchema = z.object({
	viewerKind: dicomViewerKindSchema.default("ohif"),
	series: dicomSeriesPreviewGroupSchema,
	viewerState: imagingViewerSessionStateSchema.nullable().optional(),
	annotations: z.array(imagingViewerAnnotationSchema).max(200).default([]),
	dicomWebBaseUrl: httpUrlSchema.nullable().optional(),
	ohifBaseUrl: httpUrlSchema.nullable().optional(),
	externalViewerPath: externalViewerPathSchema.nullable().optional(),
	allowExternalHandoff: z.boolean().default(true),
});

export type DicomViewerLaunchManifestRequest = z.infer<
	typeof dicomViewerLaunchManifestRequestSchema
>;

export const dicomViewerLaunchManifestResponseSchema = z
	.object({
		viewerKind: dicomViewerKindSchema,
		launchMode: dicomViewerLaunchModeSchema,
		viewerUrl: z.string().nullable(),
		studyInstanceUid: z.string().nullable(),
		seriesInstanceUid: z.string().nullable(),
		dataSource: z.object({
			kind: dicomViewerDataSourceKindSchema,
			qidoRoot: z.string().nullable(),
			wadoRoot: z.string().nullable(),
			stowRoot: z.string().nullable(),
			studyInstanceUid: z.string().nullable(),
			seriesInstanceUid: z.string().nullable(),
			sourceKind: imagingSourceKindSchema,
			sourceName: z.string(),
		}),
		displaySetSelector: z.object({
			preferredLayout: dicomMprReadinessSchema.shape.recommendedLayout,
			projections: z.array(dicomMprProjectionSchema),
			studyInstanceUid: z.string().nullable(),
			seriesInstanceUid: z.string().nullable(),
		}),
		cornerstoneVolumeId: z.string().nullable(),
		resourcePolicy: dicomMprResourcePolicySchema,
		viewerState: imagingViewerSessionStateSchema.nullable(),
		annotations: z.array(imagingViewerAnnotationSchema),
		warnings: z.array(z.string()),
		nextAction: z.string(),
	})
	.superRefine((manifest, ctx) => {
		const reject = (message: string) => {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["viewerUrl"],
				message,
			});
		};

		switch (manifest.launchMode) {
			case "dicomweb_url": {
				if (manifest.viewerUrl === null) {
					reject(
						"режим dicomweb_url запускает внешний просмотр по адресу: viewerUrl не может быть null",
					);
					return;
				}
				if (!httpUrlSchema.safeParse(manifest.viewerUrl).success) {
					reject(
						"в режиме dicomweb_url адрес должен начинаться с http:// или https://",
					);
				}
				return;
			}
			case "external_handoff": {
				if (manifest.viewerUrl === null) return;
				const path = externalViewerPathSchema.safeParse(manifest.viewerUrl);
				if (!path.success) {
					reject("путь к внешнему просмотрщику длиннее допустимого");
				}
				return;
			}
			case "local_manifest":
			case "blocked": {
				if (manifest.viewerUrl !== null) {
					reject(
						`режим ${manifest.launchMode} не открывает внешний просмотр: viewerUrl обязан быть null`,
					);
				}
				return;
			}
		}
	});

export type DicomViewerLaunchManifestResponse = z.infer<
	typeof dicomViewerLaunchManifestResponseSchema
>;

export const dicomViewerToolStateTargetSchema = z.enum([
	"cornerstone3d",
	"ohif",
	"generic_json",
	"external_viewer",
]);

export type DicomViewerToolStateTarget = z.infer<
	typeof dicomViewerToolStateTargetSchema
>;

export const dicomViewerViewportTypeSchema = z.enum([
	"stack",
	"volume",
	"derived",
]);

export type DicomViewerViewportType = z.infer<
	typeof dicomViewerViewportTypeSchema
>;

export const dicomViewerToolModeSchema = z.enum([
	"active",
	"passive",
	"enabled",
	"disabled",
]);

export type DicomViewerToolMode = z.infer<typeof dicomViewerToolModeSchema>;

export const dicomViewerTargetToolSchema = z.enum([
	"WindowLevelTool",
	"PanTool",
	"ZoomTool",
	"StackScrollTool",
	"CrosshairsTool",
	"LengthTool",
	"AngleTool",
	"ArrowAnnotateTool",
	"RectangleROITool",
	"BidirectionalTool",
	"SplineROITool",
	"PlanarFreehandROITool",
	"ProbeTool",
]);

export type DicomViewerTargetTool = z.infer<typeof dicomViewerTargetToolSchema>;

export const dicomViewerToolConfigSchema = z.object({
	crmTool: imagingViewerToolSchema,
	targetTool: dicomViewerTargetToolSchema,
	mode: dicomViewerToolModeSchema,
	shortcut: z.string().max(20).nullable(),
	reason: z.string(),
});

export type DicomViewerToolConfig = z.infer<typeof dicomViewerToolConfigSchema>;

export const dicomViewerViewportStateSchema = z.object({
	viewportId: z.string(),
	viewportType: dicomViewerViewportTypeSchema,
	projection: dicomMprProjectionSchema.nullable(),
	volumeId: z.string().nullable(),
	referencedImageId: z.string().nullable(),
	sliceIndex: z.number().int().nonnegative().nullable().default(null),
	windowPreset: imagingViewerWindowPresetSchema,
	windowCenter: z.number().nullable(),
	windowWidth: z.number().positive().nullable(),
	zoom: z.number().min(0.1).max(10),
	rotationDeg: z.number().int(),
	slabMm: z.number().positive().max(100),
	axisDeg: z.number().min(-180).max(180),
	crosshair: z.boolean(),
	linkedPlanes: z.boolean(),
});

export type DicomViewerViewportState = z.infer<
	typeof dicomViewerViewportStateSchema
>;

export const dicomViewerToolStatePointSchema = z.object({
	world: z.tuple([z.number(), z.number(), z.number()]),
	canvas: z.tuple([z.number(), z.number()]).nullable(),
	plane: dicomMprProjectionSchema.nullable(),
	sourceIndex: z.number().int().nonnegative(),
});

export type DicomViewerToolStatePoint = z.infer<
	typeof dicomViewerToolStatePointSchema
>;

export const dicomViewerToolStateAnnotationSchema = z.object({
	id: z.string(),
	sourceAnnotationId: z.string(),
	targetTool: dicomViewerTargetToolSchema,
	type: imagingViewerAnnotationTypeSchema,
	label: z.string(),
	semanticRole: imagingViewerAnnotationSemanticRoleSchema.nullable().optional(),
	toothCode: z.string().nullable(),
	note: z.string().nullable(),
	viewportId: z.string(),
	frameOfReferenceUid: z.string().nullable(),
	referencedImageId: z.string().nullable(),
	measurement: z.object({
		value: z.number().nullable(),
		unit: z.string().nullable(),
	}),
	points: z.array(dicomViewerToolStatePointSchema).max(64),
	locked: z.boolean(),
	needsReview: z.boolean(),
	warnings: z.array(z.string()),
});

export type DicomViewerToolStateAnnotation = z.infer<
	typeof dicomViewerToolStateAnnotationSchema
>;

export const dicomViewerPlanningTaskKindSchema = z.enum([
	"panoramic_reconstruction",
	"cross_section_curve",
	"distance_measurement",
	"angle_measurement",
	"area_roi",
	"volume_roi",
	"implant_axis",
	"implant_library",
	"nerve_canal",
	"bone_density_probe",
	"surgical_guide",
]);

export type DicomViewerPlanningTaskKind = z.infer<
	typeof dicomViewerPlanningTaskKindSchema
>;

export const dicomViewerPlanningTaskSchema = z.object({
	id: z.string(),
	kind: dicomViewerPlanningTaskKindSchema,
	title: z.string(),
	targetTool: dicomViewerTargetToolSchema,
	projection: dicomMprProjectionSchema.nullable(),
	windowPreset: imagingViewerWindowPresetSchema,
	slabMm: z.number().positive().max(100),
	axisDeg: z.number().min(-180).max(180),
	requiresVolume: z.boolean(),
	status: z.enum(["active", "ready", "blocked"]),
	outputUnit: z.string().max(40).nullable(),
	implantPlan: imagingViewerImplantPlanSchema.nullable().default(null),
	reason: z.string(),
	warnings: z.array(z.string()),
});

export type DicomViewerPlanningTask = z.infer<
	typeof dicomViewerPlanningTaskSchema
>;

export const dicomClientRuntimeSurfaceSchema = z.enum([
	"mobile_web",
	"tablet_web",
	"desktop_web",
	"desktop_app",
	"unknown",
]);

export type DicomClientRuntimeSurface = z.infer<
	typeof dicomClientRuntimeSurfaceSchema
>;

export const dicomDirectoryHandlePersistenceSchema = z.enum([
	"unsupported",
	"session_only",
	"persisted_handle",
]);

export type DicomDirectoryHandlePersistence = z.infer<
	typeof dicomDirectoryHandlePersistenceSchema
>;

export const dicomWorkstationClientFactsSchema = z.object({
	deviceMemoryGb: z.number().positive().nullable(),
	hardwareConcurrency: z.number().int().positive().nullable(),
	webgl2Supported: z.boolean(),
	webglVendor: z.string().max(180).nullable().optional(),
	webglRenderer: z.string().max(240).nullable().optional(),
	maxTextureSize: z.number().int().positive().nullable().optional(),
	max3dTextureSize: z.number().int().positive().nullable().optional(),
	maxRenderbufferSize: z.number().int().positive().nullable().optional(),
	devicePixelRatio: z.number().positive().nullable().optional(),
	offscreenCanvasSupported: z.boolean().optional(),
	webWorkerSupported: z.boolean().optional(),
	indexedDbSupported: z.boolean(),
	storageQuotaMb: z.number().int().nonnegative().nullable(),
	storageUsageMb: z.number().int().nonnegative().nullable(),
	online: z.boolean(),
	runtimeSurfaceHint: dicomClientRuntimeSurfaceSchema.optional(),
	desktopShellBridgeSupported: z.boolean().optional(),
	directoryPickerSupported: z.boolean().optional(),
	directoryHandlePersistence: dicomDirectoryHandlePersistenceSchema.optional(),
	userAgent: z.string().max(300).nullable().optional(),
	platform: z.string().max(120).nullable().optional(),
	hardwareTier: hardwareTierSchema.optional(),
	hardwareScore: z.number().int().min(0).max(100).optional(),
	gpuType: hardwareGpuTypeSchema.optional(),
});

export type DicomWorkstationClientFacts = z.infer<
	typeof dicomWorkstationClientFactsSchema
>;

export const dicomClientNetworkModeSchema = z.enum([
	"online",
	"offline_local",
	"offline_remote_blocked",
]);

export type DicomClientNetworkMode = z.infer<
	typeof dicomClientNetworkModeSchema
>;

export const dicomClientExecutionLaneSchema = z.enum([
	"metadata_only",
	"external_or_local_viewer",
	"browser_preview",
	"browser_mpr",
	"desktop_app_mpr",
]);

export type DicomClientExecutionLane = z.infer<
	typeof dicomClientExecutionLaneSchema
>;

export const dicomClientRuntimeProfileSchema = z.object({
	surface: dicomClientRuntimeSurfaceSchema,
	networkMode: dicomClientNetworkModeSchema,
	executionLane: dicomClientExecutionLaneSchema,
	mobileConstrained: z.boolean(),
	desktopAppPreferred: z.boolean(),
	canUseLocalFiles: z.boolean(),
	canUseRemoteArchive: z.boolean(),
	canUseBrowserMpr: z.boolean(),
	label: z.string(),
	nextAction: z.string(),
	warnings: z.array(z.string()),
});

export type DicomClientRuntimeProfile = z.infer<
	typeof dicomClientRuntimeProfileSchema
>;

export const dicomWorkstationReadinessCheckSchema = z.object({
	id: z.string(),
	label: z.string(),
	status: z.enum(["pass", "warn", "fail"]),
	detail: z.string(),
	nextAction: z.string(),
});
