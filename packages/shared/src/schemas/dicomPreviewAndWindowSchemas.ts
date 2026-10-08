import { z } from "zod";
import { imagingSourceKindSchema, imagingStudyKindSchema } from "./aiAndEgiszSchemas.js";
import { dicomMprReadinessSchema, dicomSeriesViewerSchema } from "./clinicScaleAndPreviewSchemas.js";
import { httpUrlSchema } from "./documentMetaSchemas.js";

export const dicomSeriesPreviewRowSchema = z.object({
	rowNumber: z.number().int().positive(),
	patientId: z.string().uuid().nullable(),
	patientName: z.string().nullable(),
	phone: z.string().nullable(),
	kind: imagingStudyKindSchema.nullable(),
	modality: z.string().nullable(),
	studyInstanceUid: z.string().nullable(),
	seriesInstanceUid: z.string().nullable(),
	sopInstanceUid: z.string().nullable(),
	studyDescription: z.string().nullable(),
	seriesDescription: z.string().nullable(),
	instanceNumber: z.number().int().nonnegative().nullable(),
	imageRows: z.number().int().positive().nullable(),
	imageColumns: z.number().int().positive().nullable(),
	bitsAllocated: z.number().int().positive().nullable(),
	samplesPerPixel: z.number().int().positive().nullable(),
	estimatedPixelBytes: z.number().int().nonnegative().nullable(),
	capturedAt: z.string().nullable(),
	filePath: z.string().nullable(),
	sourceKind: imagingSourceKindSchema,
	sourceName: z.string(),
	status: z.enum(["ready", "warning", "blocked"]),
	warnings: z.array(z.string()),
});

export type DicomSeriesPreviewRow = z.infer<typeof dicomSeriesPreviewRowSchema>;

export const dicomSeriesPreviewGroupSchema = z.object({
	id: z.string(),
	patientId: z.string().uuid().nullable(),
	patientName: z.string().nullable(),
	kind: imagingStudyKindSchema.nullable(),
	modality: z.string().nullable(),
	studyInstanceUid: z.string().nullable(),
	seriesInstanceUid: z.string().nullable(),
	studyDescription: z.string().nullable(),
	seriesDescription: z.string().nullable(),
	capturedAt: z.string().nullable(),
	fileCount: z.number().int().nonnegative(),
	imageRows: z.number().int().positive().nullable(),
	imageColumns: z.number().int().positive().nullable(),
	bitsAllocated: z.number().int().positive().nullable(),
	samplesPerPixel: z.number().int().positive().nullable(),
	estimatedPixelBytes: z.number().int().nonnegative().nullable(),
	firstFilePath: z.string().nullable(),
	sourceKind: imagingSourceKindSchema,
	sourceName: z.string(),
	recommendedViewer: dicomSeriesViewerSchema,
	mprReadiness: dicomMprReadinessSchema,
	status: z.enum(["ready", "warning", "blocked"]),
	warnings: z.array(z.string()),
});

export type DicomSeriesPreviewGroup = z.infer<
	typeof dicomSeriesPreviewGroupSchema
>;

export const dicomSeriesPreviewResponseSchema = z.object({
	sourceName: z.string(),
	sourceKind: imagingSourceKindSchema,
	totalRows: z.number().int().nonnegative(),
	totalSeries: z.number().int().nonnegative(),
	readySeries: z.number().int().nonnegative(),
	warningSeries: z.number().int().nonnegative(),
	blockedSeries: z.number().int().nonnegative(),
	rows: z.array(dicomSeriesPreviewRowSchema),
	series: z.array(dicomSeriesPreviewGroupSchema),
	parserNotes: z.array(z.string()),
});

export type DicomSeriesPreviewResponse = z.infer<
	typeof dicomSeriesPreviewResponseSchema
>;

export const dicomFolderSeriesPreviewRequestSchema = z.object({
	folderPath: z.string().min(1),
	recursive: z.boolean().default(true),
	sourceName: z.string().min(1).default("dicom_folder_headers"),
	maxFiles: z.number().int().positive().max(5000).default(800),
	maxFolders: z.number().int().positive().max(3000).default(900),
	maxEntriesPerFolder: z.number().int().positive().max(10000).default(2000),
	maxHeaderBytes: z
		.number()
		.int()
		.positive()
		.max(1024 * 1024)
		.default(256 * 1024),
});

export type DicomFolderSeriesPreviewRequest = z.infer<
	typeof dicomFolderSeriesPreviewRequestSchema
>;

export const dicomFolderSeriesPreviewResponseSchema = z.object({
	folderPath: z.string(),
	recursive: z.boolean(),
	filesFound: z.number().int().nonnegative(),
	filesParsed: z.number().int().nonnegative(),
	metadataRows: z.number().int().nonnegative(),
	rawText: z.string(),
	preview: dicomSeriesPreviewResponseSchema,
	warnings: z.array(z.string()),
});

export type DicomFolderSeriesPreviewResponse = z.infer<
	typeof dicomFolderSeriesPreviewResponseSchema
>;

export const dicomFirstFramePreviewRequestSchema = z.object({
	folderPath: z.string().min(1),
	recursive: z.boolean().default(true),
	maxFiles: z.number().int().positive().max(500).default(80),
	maxFolders: z.number().int().positive().max(3000).default(900),
	maxEntriesPerFolder: z.number().int().positive().max(10000).default(2000),
	maxFileBytes: z
		.number()
		.int()
		.positive()
		.max(256 * 1024 * 1024)
		.default(64 * 1024 * 1024),
	maxPreviewEdge: z.number().int().min(128).max(1024).default(512),
	preferredFileIndex: z.number().int().nonnegative().optional(),
});

export type DicomFirstFramePreviewRequest = z.infer<
	typeof dicomFirstFramePreviewRequestSchema
>;

export const dicomFirstFramePreviewStatusSchema = z.enum([
	"ready",
	"unsupported",
	"not_found",
]);

export type DicomFirstFramePreviewStatus = z.infer<
	typeof dicomFirstFramePreviewStatusSchema
>;

export const dicomFirstFramePreviewResponseSchema = z.object({
	version: z.literal("dental-crm-dicom-first-frame-preview-v1"),
	generatedAt: z.string(),
	folderPath: z.string(),
	status: dicomFirstFramePreviewStatusSchema,
	sourceFileName: z.string().nullable(),
	sourceFileIndex: z.number().int().nonnegative().nullable(),
	requestedFileIndex: z.number().int().nonnegative().nullable(),
	selectableFileCount: z.number().int().nonnegative(),
	transferSyntaxUid: z.string().nullable(),
	photometricInterpretation: z.string().nullable(),
	width: z.number().int().positive().nullable(),
	height: z.number().int().positive().nullable(),
	sourceWidth: z.number().int().positive().nullable(),
	sourceHeight: z.number().int().positive().nullable(),
	bitsAllocated: z.number().int().positive().nullable(),
	bitsStored: z.number().int().positive().nullable(),
	pixelRepresentation: z.number().int().min(0).max(1).nullable(),
	windowCenter: z.number().nullable(),
	windowWidth: z.number().positive().nullable(),
	imageDataUrl: z.string().nullable(),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DicomFirstFramePreviewResponse = z.infer<
	typeof dicomFirstFramePreviewResponseSchema
>;

export const dicomLocalFolderDiscoveryRequestSchema = z.object({
	rootPaths: z.array(z.string().min(1)).max(12).optional(),
	maxDepth: z.number().int().min(0).max(8).default(5),
	maxFolders: z.number().int().positive().max(3000).default(900),
	maxFilesPerFolder: z.number().int().positive().max(500).default(120),
	minDicomFiles: z.number().int().positive().max(20).default(2),
	maxCandidates: z.number().int().positive().max(50).default(12),
});

export type DicomLocalFolderDiscoveryRequest = z.infer<
	typeof dicomLocalFolderDiscoveryRequestSchema
>;

export const dicomLocalFolderDiscoveryCandidateSchema = z.object({
	folderPath: z.string(),
	displayName: z.string(),
	safeDisplayName: z.string(),
	sourceLabel: z.string(),
	sourceKind: z.string(),
	folderFingerprint: z.string(),
	depth: z.number().int().nonnegative(),
	dicomLikeFiles: z.number().int().nonnegative(),
	archivesFound: z.number().int().nonnegative(),
	imageFiles: z.number().int().nonnegative(),
	hasDicomDir: z.boolean(),
	latestModifiedAt: z.string().nullable(),
	firstFilePath: z.string().nullable(),
	confidence: z.number().min(0).max(1),
	reasons: z.array(z.string()),
	warnings: z.array(z.string()),
});

export type DicomLocalFolderDiscoveryCandidate = z.infer<
	typeof dicomLocalFolderDiscoveryCandidateSchema
>;

export const dicomLocalFolderDiscoveryResponseSchema = z.object({
	version: z.literal("dental-crm-dicom-local-discovery-v1"),
	generatedAt: z.string(),
	roots: z.array(z.string()),
	scannedFolders: z.number().int().nonnegative(),
	candidates: z.array(dicomLocalFolderDiscoveryCandidateSchema),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DicomLocalFolderDiscoveryResponse = z.infer<
	typeof dicomLocalFolderDiscoveryResponseSchema
>;

export const dentalModelFileFormatSchema = z.enum([
	"stl",
	"obj",
	"ply",
	"glb",
	"gltf",
	"3mf",
	"zip_archive",
	"unknown",
]);

export type DentalModelFileFormat = z.infer<typeof dentalModelFileFormatSchema>;

export const dentalModelFileRoleSchema = z.enum([
	"upper_arch",
	"lower_arch",
	"skull_surface",
	"maxilla_surface",
	"mandible_surface",
	"ct_bone_surface",
	"bite",
	"crown",
	"bridge",
	"implant_guide",
	"surgical_guide",
	"aligner",
	"scan_body",
	"unknown",
]);

export type DentalModelFileRole = z.infer<typeof dentalModelFileRoleSchema>;

export const dentalModelFileCandidateSchema = z.object({
	filePath: z.string(),
	fileName: z.string(),
	format: dentalModelFileFormatSchema,
	role: dentalModelFileRoleSchema,
	sizeBytes: z.number().int().nonnegative(),
	confidence: z.number().min(0).max(1),
	warnings: z.array(z.string()),
});

export type DentalModelFileCandidate = z.infer<
	typeof dentalModelFileCandidateSchema
>;

export const dentalModelWorkbenchLoadTargetSchema = z.enum([
	"metadata_only",
	"external_model_viewer",
	"local_bridge",
]);

export type DentalModelWorkbenchLoadTarget = z.infer<
	typeof dentalModelWorkbenchLoadTargetSchema
>;

export const dentalModelWorkbenchPairingHintSchema = z.enum([
	"same_folder_ct_series",
	"model_only_folder",
	"unknown",
]);

export type DentalModelWorkbenchPairingHint = z.infer<
	typeof dentalModelWorkbenchPairingHintSchema
>;

export const ctSurfaceModelSourceKindSchema = z.enum([
	"imported_surface_file",
	"external_local_bridge",
	"manual_contour",
	"unknown",
]);

export type CtSurfaceModelSourceKind = z.infer<
	typeof ctSurfaceModelSourceKindSchema
>;

export const ctSurfaceModelReadinessSchema = z.enum([
	"metadata_only",
	"pending_local_bridge",
	"ready_external",
	"blocked",
]);

export type CtSurfaceModelReadiness = z.infer<
	typeof ctSurfaceModelReadinessSchema
>;

export const ctSurfaceModelRegistrationStatusSchema = z.enum([
	"same_folder_inferred",
	"registered",
	"unregistered",
	"unknown",
]);

export type CtSurfaceModelRegistrationStatus = z.infer<
	typeof ctSurfaceModelRegistrationStatusSchema
>;

export const ctSurfaceModelSourceSeriesRefSchema = z.object({
	folderFingerprint: z.string(),
	pairingHint: dentalModelWorkbenchPairingHintSchema,
	studyInstanceUid: z.string().nullable(),
	seriesInstanceUid: z.string().nullable(),
});

export type CtSurfaceModelSourceSeriesRef = z.infer<
	typeof ctSurfaceModelSourceSeriesRefSchema
>;

export const ctSurfaceModelManifestSchema = z.object({
	role: dentalModelFileRoleSchema,
	format: dentalModelFileFormatSchema,
	sourceKind: ctSurfaceModelSourceKindSchema,
	sourceSeriesRef: ctSurfaceModelSourceSeriesRefSchema.nullable(),
	frameOfReferenceUid: z.string().nullable(),
	registrationStatus: ctSurfaceModelRegistrationStatusSchema,
	readiness: ctSurfaceModelReadinessSchema,
	loadTarget: dentalModelWorkbenchLoadTargetSchema,
	sizeMb: z.number().int().nonnegative(),
	checksum: z.string().nullable(),
	meshStats: z
		.object({
			vertices: z.number().int().nonnegative().nullable(),
			triangles: z.number().int().nonnegative().nullable(),
			decimation: z.string().nullable(),
		})
		.nullable(),
	containsMeshGeometry: z.literal(false),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type CtSurfaceModelManifest = z.infer<
	typeof ctSurfaceModelManifestSchema
>;

export const dentalModelWorkbenchItemSchema = z.object({
	fileName: z.string(),
	format: dentalModelFileFormatSchema,
	role: dentalModelFileRoleSchema,
	sizeBytes: z.number().int().nonnegative(),
	sizeMb: z.number().int().nonnegative(),
	loadTarget: dentalModelWorkbenchLoadTargetSchema,
	pairingHint: dentalModelWorkbenchPairingHintSchema,
	ctSurfaceManifest: ctSurfaceModelManifestSchema.nullable(),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DentalModelWorkbenchItem = z.infer<
	typeof dentalModelWorkbenchItemSchema
>;

export const dentalModelWorkbenchManifestSchema = z.object({
	version: z.literal("dental-crm-model-workbench-v1"),
	folderFingerprint: z.string(),
	totalModels: z.number().int().nonnegative(),
	ctSurfaceModels: z.number().int().nonnegative(),
	largestModelMb: z.number().int().nonnegative(),
	recommendedTarget: dentalModelWorkbenchLoadTargetSchema,
	items: z.array(dentalModelWorkbenchItemSchema),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DentalModelWorkbenchManifest = z.infer<
	typeof dentalModelWorkbenchManifestSchema
>;

export const localImagingOrganizerRequestSchema = z.object({
	rootPaths: z.array(z.string().min(1)).max(12).optional(),
	maxDepth: z.number().int().min(0).max(8).default(5),
	maxFolders: z.number().int().positive().max(3000).default(900),
	maxFilesPerFolder: z.number().int().positive().max(800).default(180),
	maxCandidates: z.number().int().positive().max(50).default(12),
	includeDentalModels: z.boolean().default(true),
	includeDicom: z.boolean().default(true),
});

export type LocalImagingOrganizerRequest = z.infer<
	typeof localImagingOrganizerRequestSchema
>;

export const localImagingOrganizerRecommendedActionSchema = z.enum([
	"open_ct_workup",
	"review_3d_models",
	"mixed_case_workup",
	"manual_review",
]);

export type LocalImagingOrganizerRecommendedAction = z.infer<
	typeof localImagingOrganizerRecommendedActionSchema
>;

export const localImagingOrganizerCaseSchema = z.object({
	id: z.string(),
	displayName: z.string(),
	safeDisplayName: z.string(),
	sourceLabel: z.string(),
	sourceKind: z.string(),
	folderFingerprint: z.string(),
	folderPath: z.string(),
	latestModifiedAt: z.string().nullable(),
	dicomLikeFiles: z.number().int().nonnegative(),
	archiveFiles: z.number().int().nonnegative(),
	imageFiles: z.number().int().nonnegative(),
	modelFiles: z.number().int().nonnegative(),
	dicomConfidence: z.number().min(0).max(1),
	modelConfidence: z.number().min(0).max(1),
	combinedConfidence: z.number().min(0).max(1),
	recommendedAction: localImagingOrganizerRecommendedActionSchema,
	modelCandidates: z.array(dentalModelFileCandidateSchema),
	modelWorkbenchManifest: dentalModelWorkbenchManifestSchema,
	reasons: z.array(z.string()),
	warnings: z.array(z.string()),
});

export type LocalImagingOrganizerCase = z.infer<
	typeof localImagingOrganizerCaseSchema
>;

export const localImagingOrganizerResponseSchema = z.object({
	version: z.literal("dental-crm-local-imaging-organizer-v1"),
	generatedAt: z.string(),
	roots: z.array(z.string()),
	scannedFolders: z.number().int().nonnegative(),
	cases: z.array(localImagingOrganizerCaseSchema),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type LocalImagingOrganizerResponse = z.infer<
	typeof localImagingOrganizerResponseSchema
>;

export const dicomWebAuthModeSchema = z.enum([
	"none",
	"bearer",
	"basic",
	"reverse_proxy",
]);

export type DicomWebAuthMode = z.infer<typeof dicomWebAuthModeSchema>;

export const dicomWebConnectorStatusSchema = z.enum([
	"ready",
	"auth_required",
	"unreachable",
	"misconfigured",
]);

export type DicomWebConnectorStatus = z.infer<
	typeof dicomWebConnectorStatusSchema
>;

export const dicomWebConnectorCheckRequestSchema = z.object({
	endpointUrl: httpUrlSchema,
	qidoRsPath: z.string().min(1).default("/studies"),
	wadoRsPath: z.string().min(1).default("/studies"),
	stowRsPath: z.string().min(1).default("/studies"),
	studyInstanceUid: z.string().max(128).nullable().optional(),
	seriesInstanceUid: z.string().max(128).nullable().optional(),
	authMode: dicomWebAuthModeSchema.default("reverse_proxy"),
	timeoutMs: z.number().int().positive().max(30_000).default(5_000),
});

export type DicomWebConnectorCheckRequest = z.infer<
	typeof dicomWebConnectorCheckRequestSchema
>;

export const dicomWebConnectorCheckResponseSchema = z.object({
	endpointOrigin: z.string(),
	qidoUrl: z.string(),
	wadoBaseUrl: z.string(),
	stowBaseUrl: z.string(),
	configuredAuthMode: dicomWebAuthModeSchema,
	status: dicomWebConnectorStatusSchema,
	canSearch: z.boolean(),
	canRetrieve: z.boolean(),
	storeConfigured: z.boolean(),
	qidoHttpStatus: z.number().int().nullable(),
	latencyMs: z.number().int().nonnegative(),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type DicomWebConnectorCheckResponse = z.infer<
	typeof dicomWebConnectorCheckResponseSchema
>;

export const imagingViewerModeSchema = z.enum([
	"two_d",
	"stack",
	"mpr",
	"photo",
]);

export type ImagingViewerMode = z.infer<typeof imagingViewerModeSchema>;

export const imagingViewerWindowPresetSchema = z.enum([
	"bone",
	"soft_tissue",
	"implant",
	"endo",
	"caries",
	"perio",
	"photo",
	"teeth",
	"custom",
]);

export type ImagingViewerWindowPreset = z.infer<
	typeof imagingViewerWindowPresetSchema
>;
