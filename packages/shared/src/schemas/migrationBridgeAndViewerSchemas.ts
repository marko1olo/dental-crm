import { z } from "zod";
import { migrationExtractableEntitySchema, migrationLocalSourceDiscoveryCandidateSchema, migrationLocalSourceHandoffSchema, migrationLocalSourceWorkupStepSchema, migrationReadinessItemSchema, smartImportLegacySourceAutomationLevelSchema, smartImportLegacySourceKindSchema, smartImportPublicLookupTargetSchema, smartImportRequestSchema } from "./smartImportAndIngestionSchemas.js";
import { updateClinicProfileSchema } from "./clinicScaleAndPreviewSchemas.js";

export const migrationReadinessSchema = z.object({
	level: z.enum([
		"ready_for_preview",
		"needs_bridge",
		"needs_export",
		"manual_review",
		"blocked",
	]),
	score: z.number().min(0).max(1),
	blockers: z.array(migrationReadinessItemSchema),
	warnings: z.array(migrationReadinessItemSchema),
	ready: z.array(migrationReadinessItemSchema),
	nextAction: z.string(),
});

export type MigrationReadiness = z.infer<typeof migrationReadinessSchema>;

export const migrationBridgeKitActionSchema = z.object({
	id: z.string(),
	owner: z.enum(["administrator", "doctor", "assistant", "system"]),
	title: z.string(),
	detail: z.string(),
	safety: z.string(),
	doneWhen: z.string(),
});

export type MigrationBridgeKitAction = z.infer<
	typeof migrationBridgeKitActionSchema
>;

export const migrationBridgeKitSchema = z.object({
	kind: z.enum([
		"none",
		"file_upload",
		"local_db_bridge",
		"dicom_export",
		"image_manifest",
		"network_share_bridge",
		"browser_manifest_bridge",
		"manual_manifest",
	]),
	title: z.string(),
	status: z.enum(["ready", "needs_admin", "needs_export", "manual", "blocked"]),
	requiredTools: z.array(z.string()),
	parserTargets: z.array(migrationExtractableEntitySchema),
	adminActions: z.array(migrationBridgeKitActionSchema),
	doctorActions: z.array(migrationBridgeKitActionSchema),
	outputManifest: z.object({
		format: z.string(),
		endpoint: z.string(),
		requiredColumns: z.array(z.string()),
		optionalColumns: z.array(z.string()),
		forbiddenFields: z.array(z.string()),
	}),
	privacyBoundary: z.string(),
	nextAction: z.string(),
});

export type MigrationBridgeKit = z.infer<typeof migrationBridgeKitSchema>;

export const migrationLocalSourceWorkupResponseSchema = z.object({
	version: z.literal("dental-crm-migration-source-workup-v1"),
	generatedAt: z.string(),
	safeDisplayName: z.string(),
	sourceKind: smartImportLegacySourceKindSchema,
	sourceFingerprint: z.string(),
	sourceLabel: z.string(),
	sourceExists: z.boolean(),
	sourceIsDirectory: z.boolean(),
	fileExtension: z.string().nullable(),
	automationLevel: smartImportLegacySourceAutomationLevelSchema,
	extractableEntities: z.array(migrationExtractableEntitySchema),
	requiredArtifacts: z.array(z.string()),
	recommendedRoute: z.string(),
	readiness: migrationReadinessSchema,
	bridgeKit: migrationBridgeKitSchema,
	handoffs: z.array(migrationLocalSourceHandoffSchema),
	steps: z.array(migrationLocalSourceWorkupStepSchema),
	warnings: z.array(z.string()),
	privacyWarnings: z.array(z.string()),
	smartImportLine: z.string(),
	nextAction: z.string(),
});

export type MigrationLocalSourceWorkupResponse = z.infer<
	typeof migrationLocalSourceWorkupResponseSchema
>;

export const migrationLocalSourceProbeRequestSchema = z.object({
	sourceRef: z.string().min(1),
	sourceKind: smartImportLegacySourceKindSchema.optional(),
	safeDisplayName: z.string().trim().max(160).optional(),
	maxDepth: z.number().int().min(0).max(4).default(2),
	maxFolders: z.number().int().positive().max(500).default(120),
	maxFiles: z.number().int().positive().max(3000).default(600),
	maxSampleArtifacts: z.number().int().positive().max(80).default(18),
	readHeaderBytes: z.number().int().positive().max(65536).default(4096),
});

export type MigrationLocalSourceProbeRequest = z.infer<
	typeof migrationLocalSourceProbeRequestSchema
>;

export const migrationProbeArtifactKindSchema = z.enum([
	"database",
	"dump",
	"table",
	"archive",
	"dicom",
	"image",
	"model",
	"folder",
	"unknown",
]);

export type MigrationProbeArtifactKind = z.infer<
	typeof migrationProbeArtifactKindSchema
>;

export const migrationProbeArtifactSchema = z.object({
	id: z.string(),
	safeName: z.string(),
	kind: migrationProbeArtifactKindSchema,
	extension: z.string().nullable(),
	byteSize: z.number().int().nonnegative().nullable(),
	modifiedAt: z.string().nullable(),
	depth: z.number().int().nonnegative(),
	signals: z.array(z.string()),
});

export type MigrationProbeArtifact = z.infer<
	typeof migrationProbeArtifactSchema
>;

export const migrationProbeAdapterSchema = z.object({
	id: z.string(),
	title: z.string(),
	status: z.enum([
		"built_in",
		"needs_local_bridge",
		"needs_export",
		"manual",
		"blocked",
	]),
	confidence: z.number().min(0).max(1),
	input: z.string(),
	output: z.string(),
	privacy: z.string(),
	nextAction: z.string(),
});

export type MigrationProbeAdapter = z.infer<typeof migrationProbeAdapterSchema>;

export const migrationLocalSourceProbeResponseSchema = z.object({
	version: z.literal("dental-crm-migration-source-probe-v1"),
	generatedAt: z.string(),
	safeDisplayName: z.string(),
	sourceKind: smartImportLegacySourceKindSchema,
	sourceFingerprint: z.string(),
	sourceLabel: z.string(),
	sourceExists: z.boolean(),
	sourceIsDirectory: z.boolean(),
	sourceByteSize: z.number().int().nonnegative().nullable(),
	latestModifiedAt: z.string().nullable(),
	scannedFolders: z.number().int().nonnegative(),
	scannedFiles: z.number().int().nonnegative(),
	counts: z.object({
		databases: z.number().int().nonnegative(),
		dumps: z.number().int().nonnegative(),
		tables: z.number().int().nonnegative(),
		archives: z.number().int().nonnegative(),
		dicom: z.number().int().nonnegative(),
		images: z.number().int().nonnegative(),
		models: z.number().int().nonnegative(),
		unknown: z.number().int().nonnegative(),
	}),
	formatSignals: z.array(z.string()),
	detectedVendors: z.array(z.string()),
	artifactSamples: z.array(migrationProbeArtifactSchema),
	adapters: z.array(migrationProbeAdapterSchema),
	handoffs: z.array(migrationLocalSourceHandoffSchema),
	warnings: z.array(z.string()),
	privacyWarnings: z.array(z.string()),
	recommendedRoute: z.string(),
	readiness: migrationReadinessSchema,
	bridgeKit: migrationBridgeKitSchema,
	nextAction: z.string(),
});

export type MigrationLocalSourceProbeResponse = z.infer<
	typeof migrationLocalSourceProbeResponseSchema
>;

export const clinicPublicLookupRequestSchema = z
	.object({
		inn: z.string().trim().max(32).optional(),
		kpp: z.string().trim().max(32).optional(),
		ogrn: z.string().trim().max(32).optional(),
		clinicName: z.string().trim().max(240).optional(),
		legalName: z.string().trim().max(240).optional(),
		address: z.string().trim().max(500).optional(),
		medicalLicenseNumber: z.string().trim().max(120).optional(),
	})
	.refine(
		(value) =>
			[
				value.inn,
				value.kpp,
				value.ogrn,
				value.clinicName,
				value.legalName,
				value.address,
				value.medicalLicenseNumber,
			].some((item) => item && item.trim()),
		"Укажите ИНН, КПП, ОГРН, название, адрес или номер медицинской лицензии клиники.",
	);

export type ClinicPublicLookupRequest = z.infer<
	typeof clinicPublicLookupRequestSchema
>;

export const clinicPublicLookupSuggestionSchema = z.object({
	source: z.enum(["dadata", "manual_public_targets"]),
	confidence: z.number().min(0).max(1),
	fields: updateClinicProfileSchema.partial(),
	warnings: z.array(z.string()),
});

export type ClinicPublicLookupSuggestion = z.infer<
	typeof clinicPublicLookupSuggestionSchema
>;

export const clinicPublicLookupResponseSchema = z.object({
	version: z.literal("dental-crm-clinic-public-lookup-v1"),
	generatedAt: z.string(),
	providerStatus: z.enum([
		"not_configured",
		"ready",
		"error",
		"skipped_no_safe_query",
	]),
	provider: z.string(),
	safeQuery: z.string(),
	suggestions: z.array(clinicPublicLookupSuggestionSchema),
	publicLookupTargets: z.array(smartImportPublicLookupTargetSchema),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type ClinicPublicLookupResponse = z.infer<
	typeof clinicPublicLookupResponseSchema
>;

export const migrationAutopilotRequestSchema = z.object({
	rootPaths: z.array(z.string().min(1)).max(16).optional(),
	maxDepth: z.number().int().min(0).max(8).default(5),
	maxFolders: z.number().int().positive().max(5000).default(1600),
	maxFilesPerFolder: z.number().int().positive().max(500).default(160),
	maxCandidates: z.number().int().positive().max(80).default(18),
	maxProbeCandidates: z.number().int().positive().max(8).default(4),
	includeWorkstationSignals: z.boolean().default(true),
	maxWorkstationSignals: z.number().int().nonnegative().max(80).default(24),
	knownSources: z
		.array(migrationLocalSourceDiscoveryCandidateSchema)
		.max(80)
		.optional(),
	knownScannedFolders: z.number().int().nonnegative().max(5000).optional(),
	smartImport: smartImportRequestSchema.optional(),
	clinic: clinicPublicLookupRequestSchema.optional(),
});

export type MigrationAutopilotRequest = z.infer<
	typeof migrationAutopilotRequestSchema
>;

export const migrationAutopilotSourceSchema = z.object({
	candidate: migrationLocalSourceDiscoveryCandidateSchema,
	probe: migrationLocalSourceProbeResponseSchema.nullable(),
	score: z.number().min(0).max(1),
	priority: z.enum(["critical", "high", "normal", "low"]),
	owner: z.enum(["administrator", "doctor", "assistant", "system"]),
	readiness: migrationReadinessSchema,
	bridgeKit: migrationBridgeKitSchema,
	recommendedAction: z.string(),
	riskFlags: z.array(z.string()),
});

export type MigrationAutopilotSource = z.infer<
	typeof migrationAutopilotSourceSchema
>;

export const migrationAutopilotStepSchema = z.object({
	order: z.number().int().positive(),
	owner: z.enum(["administrator", "doctor", "assistant", "system"]),
	title: z.string(),
	detail: z.string(),
	blocking: z.boolean(),
});

export type MigrationAutopilotStep = z.infer<
	typeof migrationAutopilotStepSchema
>;

export const migrationAutopilotPacketStatusSchema = z.enum([
	"ready_for_preview",
	"needs_admin",
	"needs_bridge",
	"needs_export",
	"manual_review",
	"blocked",
	"empty",
]);

export type MigrationAutopilotPacketStatus = z.infer<
	typeof migrationAutopilotPacketStatusSchema
>;

export const migrationAutopilotPacketLaneSchema = z.object({
	id: z.string(),
	title: z.string(),
	owner: z.enum(["administrator", "doctor", "assistant", "system"]),
	status: migrationAutopilotPacketStatusSchema,
	score: z.number().min(0).max(1),
	detail: z.string(),
	nextAction: z.string(),
});

export type MigrationAutopilotPacketLane = z.infer<
	typeof migrationAutopilotPacketLaneSchema
>;

export const migrationAutopilotHandoffPhaseSchema = z.enum([
	"clinic_requisites",
	"source_access",
	"export_or_bridge",
	"staging_preview",
	"doctor_control",
]);

export type MigrationAutopilotHandoffPhase = z.infer<
	typeof migrationAutopilotHandoffPhaseSchema
>;

export const migrationAutopilotHandoffChecklistItemSchema = z.object({
	id: z.string(),
	phase: migrationAutopilotHandoffPhaseSchema,
	owner: z.enum(["administrator", "doctor", "assistant", "system"]),
	status: migrationAutopilotPacketStatusSchema,
	title: z.string(),
	detail: z.string(),
	requiredArtifact: z.string(),
	sourceFingerprint: z.string().nullable(),
	sourceKind: smartImportLegacySourceKindSchema.nullable(),
	privacy: z.string(),
	doneWhen: z.string(),
	blocking: z.boolean(),
});

export type MigrationAutopilotHandoffChecklistItem = z.infer<
	typeof migrationAutopilotHandoffChecklistItemSchema
>;

export const migrationAutopilotOperatorScriptActionSchema = z.enum([
	"discover_sources",
	"pick_source",
	"open_plan",
	"open_probe",
	"add_to_parser",
	"prepare_export",
	"run_clinic_lookup",
	"build_preview",
	"doctor_review",
	"manual",
]);

export type MigrationAutopilotOperatorScriptAction = z.infer<
	typeof migrationAutopilotOperatorScriptActionSchema
>;

export const migrationAutopilotOperatorScriptStepSchema = z.object({
	id: z.string(),
	owner: z.enum(["administrator", "doctor", "assistant", "system"]),
	title: z.string(),
	buttonLabel: z.string(),
	detail: z.string(),
	action: migrationAutopilotOperatorScriptActionSchema,
	sourceFingerprint: z.string().nullable(),
	sourceKind: smartImportLegacySourceKindSchema.nullable(),
	estimatedMinutes: z.number().int().nonnegative(),
	blocking: z.boolean(),
});

export type MigrationAutopilotOperatorScriptStep = z.infer<
	typeof migrationAutopilotOperatorScriptStepSchema
>;

export const migrationAutopilotOperatorScriptSchema = z.object({
	title: z.string(),
	headline: z.string(),
	totalEstimatedMinutes: z.number().int().nonnegative(),
	steps: z.array(migrationAutopilotOperatorScriptStepSchema),
});

export type MigrationAutopilotOperatorScript = z.infer<
	typeof migrationAutopilotOperatorScriptSchema
>;

export const migrationAutopilotDryRunSummarySchema = z.object({
	previewableSources: z.number().int().nonnegative(),
	adminBlockedSources: z.number().int().nonnegative(),
	doctorReviewRequiredSources: z.number().int().nonnegative(),
	estimatedOperatorMinutes: z.number().int().nonnegative(),
	estimatedClinicDowntimeMinutes: z.number().int().nonnegative(),
	fastestRoute: z.string(),
	nextBestAction: z.string(),
});

export type MigrationAutopilotDryRunSummary = z.infer<
	typeof migrationAutopilotDryRunSummarySchema
>;

export const migrationAutopilotOperatorPacketSchema = z.object({
	overallStatus: migrationAutopilotPacketStatusSchema,
	score: z.number().min(0).max(1),
	dataClasses: z.object({
		clinicRequisites: z.boolean(),
		oldDatabases: z.boolean(),
		imaging: z.boolean(),
		documents: z.boolean(),
		serviceCatalog: z.boolean(),
		payments: z.boolean(),
		workstationHints: z.boolean(),
		browserManifests: z.boolean(),
		smartPreviewSources: z.boolean(),
	}),
	totals: z.object({
		sources: z.number().int().nonnegative(),
		probed: z.number().int().nonnegative(),
		readyForPreview: z.number().int().nonnegative(),
		needsBridge: z.number().int().nonnegative(),
		needsExport: z.number().int().nonnegative(),
		manualReview: z.number().int().nonnegative(),
		blocked: z.number().int().nonnegative(),
		databaseSources: z.number().int().nonnegative(),
		mediaSources: z.number().int().nonnegative(),
		tableSources: z.number().int().nonnegative(),
		workstationHints: z.number().int().nonnegative(),
		browserManifests: z.number().int().nonnegative(),
		smartPreviewSources: z.number().int().nonnegative(),
		publicLookupTargets: z.number().int().nonnegative(),
		clinicSuggestions: z.number().int().nonnegative(),
	}),
	dryRun: migrationAutopilotDryRunSummarySchema,
	lanes: z.array(migrationAutopilotPacketLaneSchema),
	handoffChecklist: z.array(migrationAutopilotHandoffChecklistItemSchema),
	firstActions: z.array(z.string()),
	operatorScript: migrationAutopilotOperatorScriptSchema,
	onlineLookupPolicy: z.object({
		allowed: z.array(z.string()),
		forbidden: z.array(z.string()),
		safeQuery: z.string().nullable(),
		providerStatus: z
			.enum(["not_configured", "ready", "error", "skipped_no_safe_query"])
			.nullable(),
	}),
});

export type MigrationAutopilotOperatorPacket = z.infer<
	typeof migrationAutopilotOperatorPacketSchema
>;

export const migrationAutopilotResponseSchema = z.object({
	version: z.literal("dental-crm-migration-autopilot-v1"),
	generatedAt: z.string(),
	discovery: z.object({
		roots: z.array(z.string()),
		scannedFolders: z.number().int().nonnegative(),
		candidateCount: z.number().int().nonnegative(),
		probedCount: z.number().int().nonnegative(),
	}),
	sources: z.array(migrationAutopilotSourceSchema),
	clinicLookup: clinicPublicLookupResponseSchema.nullable(),
	operatorPacket: migrationAutopilotOperatorPacketSchema,
	steps: z.array(migrationAutopilotStepSchema),
	warnings: z.array(z.string()),
	privacyWarnings: z.array(z.string()),
	nextAction: z.string(),
});

export type MigrationAutopilotResponse = z.infer<
	typeof migrationAutopilotResponseSchema
>;

export const mprProjectionSchema = z.enum([
	"axial",
	"coronal",
	"sagittal",
	"panoramic",
	"3d_reconstruction",
	"oblique",
	"panoramic_reconstruction",
	"three_d_volume",
	"mip",
]);

export type MprProjection = z.infer<typeof mprProjectionSchema>;

export const mprWindowPresetSchema = z.enum([
	"bone",
	"soft_tissue",
	"teeth",
	"implant",
	"custom",
]);

export type MprWindowPreset = z.infer<typeof mprWindowPresetSchema>;

export const imagingViewerStateSchema = z.object({
	zoom: z.number().default(1),
	panX: z.number().default(0),
	panY: z.number().default(0),
	brightness: z.number().default(100),
	contrast: z.number().default(100),
	inverted: z.boolean().default(false),
	rotationDeg: z.number().default(0),
	flipHorizontal: z.boolean().default(false),
	projection: mprProjectionSchema.default("axial"),
	preset: mprWindowPresetSchema.default("bone"),
});

export type ImagingViewerState = z.infer<typeof imagingViewerStateSchema>;
