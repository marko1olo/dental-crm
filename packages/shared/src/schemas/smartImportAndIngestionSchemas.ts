import { z } from "zod";
import { importCommitResponseSchema, importPreviewResponseSchema, importSourceKindSchema } from "./clinicalRuleParserEngine.js";
import { aiJobKindSchema, aiRecognitionTargetSchema, dentalSpecialtySchema, imagingSourceKindSchema, imagingStudyKindSchema, staffRoleSchema } from "./aiAndEgiszSchemas.js";
import { taxDeductionApplicationDeliveryChannelSchema, taxDeductionApplicationFormSchema } from "./installmentAndLabOrderSchemas.js";
import { documentIssueSignatureModeSchema } from "./paymentRefundAndGeneratedDocSchemas.js";
import { postVisitCareTopicSchema } from "./labOrderAndSterilizationSchemas.js";
import { pricelistSourceKindSchema } from "./clinicSettingsSchemas.js";
import { denteTelegramOutboxDeliveryStatusSchema, denteTelegramSubjectTypeSchema, denteTelegramTemplateKindSchema } from "./communicationAndTasksSchemas.js";
import { imagingImportCommitResponseSchema, imagingImportPreviewResponseSchema, updateClinicProfileSchema } from "./clinicScaleAndPreviewSchemas.js";
import { appointmentStatusSchema } from "../schedule/index.js";
import { paymentMethodSchema } from "../fiscal/index.js";
import { documentKindSchema, legacyTaxDeductionCertificateMinYear } from "../documents/index.js";
import { procedureSpecificConsentProcedureSchema } from "../legal/legalContractsAndConsents.js";

export const importIntakeResponseSchema = z.object({
	sourceName: z.string(),
	sourceKind: importSourceKindSchema,
	normalizedText: z.string(),
	preview: importPreviewResponseSchema,
	recognitionNotes: z.array(z.string()),
});

export type ImportIntakeResponse = z.infer<typeof importIntakeResponseSchema>;

export const documentIngestionKindSchema = z.enum([
	"txt",
	"csv",
	"tsv",
	"json",
	"xml",
	"html",
	"rtf",
	"zip",
	"pdf",
	"docx",
	"xlsx",
	"pptx",
	"odt",
	"ods",
	"odp",
	"image",
	"legacy_database",
	"legacy_dump",
	"unknown",
]);

export type DocumentIngestionKind = z.infer<typeof documentIngestionKindSchema>;

export const documentIngestionTargetSchema = z.enum([
	"smart_import",
	"patients",
	"imaging",
	"pricelist",
	"plain_text",
]);

export type DocumentIngestionTarget = z.infer<
	typeof documentIngestionTargetSchema
>;

export const documentIngestionRequestSchema = z
	.object({
		fileName: z.string().min(1).max(260),
		mimeType: z.string().max(160).nullable().optional(),
		fileBase64: z.string().max(8_000_000).optional(),
		rawText: z.string().max(300_000).optional(),
		target: documentIngestionTargetSchema.default("smart_import"),
	})
	.refine(
		(input) => Boolean(input.fileBase64?.trim() || input.rawText?.trim()),
		{
			message: "Нужно передать файл или текст документа",
		},
	);

export type DocumentIngestionRequest = z.infer<
	typeof documentIngestionRequestSchema
>;

export const documentIngestionRouteSchema = z.object({
	target: documentIngestionTargetSchema,
	title: z.string(),
	endpoint: z.string(),
	enabled: z.boolean(),
	reason: z.string(),
});

export type DocumentIngestionRoute = z.infer<
	typeof documentIngestionRouteSchema
>;

export const documentIngestionQualitySchema = z.object({
	extractionQuality: z.enum(["ready", "review", "ocr_required", "unsupported"]),
	confidence: z.number().min(0).max(1),
	suggestedTarget: documentIngestionTargetSchema,
	signals: z.array(z.string()),
	nextAction: z.string(),
});

export type DocumentIngestionQuality = z.infer<
	typeof documentIngestionQualitySchema
>;

export const documentIngestionExtractedFileSchema = z.object({
	fileName: z.string(),
	detectedKind: documentIngestionKindSchema,
	rowCount: z.number().int().nonnegative(),
	tableCount: z.number().int().nonnegative(),
	textPreview: z.string(),
	warnings: z.array(z.string()),
});

export type DocumentIngestionExtractedFile = z.infer<
	typeof documentIngestionExtractedFileSchema
>;

export const documentIngestionResponseSchema = z.object({
	fileName: z.string(),
	mimeType: z.string().nullable(),
	detectedKind: documentIngestionKindSchema,
	byteSize: z.number().int().nonnegative(),
	extractedText: z.string(),
	textPreview: z.string(),
	rowCount: z.number().int().nonnegative(),
	tableCount: z.number().int().nonnegative(),
	extractedFiles: z.array(documentIngestionExtractedFileSchema),
	routes: z.array(documentIngestionRouteSchema),
	quality: documentIngestionQualitySchema,
	warnings: z.array(z.string()),
	parserNotes: z.array(z.string()),
});

export type DocumentIngestionResponse = z.infer<
	typeof documentIngestionResponseSchema
>;

export const smartImportModeSchema = z.enum([
	"auto",
	"patients",
	"imaging",
	"mixed",
]);

export type SmartImportMode = z.infer<typeof smartImportModeSchema>;

export const uiLanguageSchema = z.enum(["ru", "en"]);

export type UiLanguage = z.infer<typeof uiLanguageSchema>;

export const onboardingStepSchema = z.enum([
	"intro",
	"role",
	"clinic",
	"legal",
	"team",
	"sources",
	"telegram",
	"done",
]);

export type OnboardingStep = z.infer<typeof onboardingStepSchema>;

export const uiPreferencesSchema = z.object({
	version: z.literal(1).default(1),
	uiLanguage: uiLanguageSchema.default("ru"),
	selectedWorkspaceRole: staffRoleSchema.default("doctor"),
	selectedSpecialty: dentalSpecialtySchema.default("therapist"),
	selectedProtocolId: z.string().max(200).nullable().default(null),
	selectedPatientId: z.string().uuid().nullable().default(null),
	scheduleDoctorFilterId: z.string().uuid().nullable().default(null),
	scheduleAssistantFilterId: z.string().uuid().nullable().default(null),
	scheduleChairFilterId: z.string().uuid().nullable().default(null),
	scheduleDefaultDoctorUserId: z.string().uuid().nullable().default(null),
	scheduleDefaultAssistantUserId: z.string().uuid().nullable().default(null),
	scheduleDefaultChairId: z.string().uuid().nullable().default(null),
	scheduleStatusFilter: z
		.union([appointmentStatusSchema, z.literal("all")])
		.default("all"),
	scheduleDateFilter: z.string().max(10).default(""),
	paymentMethod: paymentMethodSchema.default("card"),
	taxDocumentYear: z
		.number()
		.int()
		.min(legacyTaxDeductionCertificateMinYear)
		.max(2100)
		.default(new Date().getFullYear()),
	selectedDocumentKind: documentKindSchema.default(
		"patient_intake_questionnaire",
	),
	taxApplicationForm: taxDeductionApplicationFormSchema.default("knd_1151156"),
	taxApplicationDeliveryChannel:
		taxDeductionApplicationDeliveryChannelSchema.default("paper"),
	paymentReceiptTaxSupportRequested: z.boolean().default(false),
	documentIssueSignatureMode:
		documentIssueSignatureModeSchema.default("paper_signed"),
	documentIssueStaffFullName: z.string().trim().max(160).default(""),
	documentIssueStaffRole: z
		.string()
		.trim()
		.max(120)
		.default("Врач/администратор"),
	procedureConsentProcedureType:
		procedureSpecificConsentProcedureSchema.default("implantation_bone_graft"),
	postVisitCareTopic: postVisitCareTopicSchema.default("filling_restoration"),
	pricelistSourceKind: pricelistSourceKindSchema.default("spreadsheet_copy"),
	usePricelistAi: z.boolean().default(false),
	recognitionKind: aiJobKindSchema.default("voice_transcription"),
	recognitionTarget: aiRecognitionTargetSchema.default("visit_note"),
	importSourceKind: importSourceKindSchema.default("csv_text"),
	documentIngestionTarget:
		documentIngestionTargetSchema.default("smart_import"),
	imagingImportSourceKind: imagingSourceKindSchema.default("folder_watch"),
	smartImportMode: smartImportModeSchema.default("auto"),
	imagingKindFilter: z
		.union([imagingStudyKindSchema, z.literal("all")])
		.default("all"),
	dicomWebEndpointUrl: z
		.string()
		.max(500)
		.default("http://127.0.0.1:8042/dicom-web"),
	ohifBaseUrl: z.string().max(500).default("http://127.0.0.1:3000"),
	telegramBotConfigId: z.string().trim().max(160).default(""),
	telegramLinkSubjectType: denteTelegramSubjectTypeSchema.default("patient"),
	telegramLinkStaffId: z.string().uuid().nullable().default(null),
	telegramOutboxStatusFilter: z
		.union([
			denteTelegramOutboxDeliveryStatusSchema,
			z.literal("all"),
			z.literal("due"),
		])
		.default("all"),
	telegramOutboxTemplateFilter: z
		.union([denteTelegramTemplateKindSchema, z.literal("all")])
		.default("all"),
	onboardingDismissed: z.boolean().default(false),
	onboardingDismissedAt: z.string().nullable().default(null),
	onboardingStep: onboardingStepSchema.default("intro"),
	onboardingDraftMode: z.boolean().default(false),
	odontogramUseSurfaces: z.boolean().default(false),
	odontogramViewMode: z
		.enum(["anatomical_svg", "compact_clinical", "classic_gost"])
		.default("anatomical_svg"),
	savedAt: z.string().default(""),
});

export type OdontogramViewMode =
	| "anatomical_svg"
	| "compact_clinical"
	| "classic_gost";

export const odontogramViewModeSchema = z.enum([
	"anatomical_svg",
	"compact_clinical",
	"classic_gost",
]);

export type UiPreferences = z.infer<typeof uiPreferencesSchema>;

export const uiPreferencesInputSchema = uiPreferencesSchema
	.omit({ version: true, savedAt: true })
	.extend({
		version: z.literal(1).optional(),
		savedAt: z.string().optional(),
	});

export type UiPreferencesInput = z.infer<typeof uiPreferencesInputSchema>;

export const smartImportRequestSchema = z.object({
	sourceName: z.string().trim().min(1).max(160).default("smart_import"),
	rawText: z.string().trim().min(1).max(120000),
	mode: smartImportModeSchema.default("auto"),
});

export type SmartImportRequest = z.infer<typeof smartImportRequestSchema>;

export const smartImportLineKindSchema = z.enum([
	"patient",
	"imaging",
	"clinic",
	"legacy_source",
	"ignored",
]);

export type SmartImportLineKind = z.infer<typeof smartImportLineKindSchema>;

export const smartImportLineClassificationSchema = z.object({
	lineNumber: z.number().int().positive(),
	kind: smartImportLineKindSchema,
	confidence: z.number().min(0).max(1),
	reason: z.string(),
	text: z.string(),
});

export type SmartImportLineClassification = z.infer<
	typeof smartImportLineClassificationSchema
>;

export const smartImportClinicProfileSuggestionSchema = z.object({
	fields: updateClinicProfileSchema.partial(),
	confidence: z.number().min(0).max(1),
	sourceLineNumbers: z.array(z.number().int().positive()),
	warnings: z.array(z.string()),
});

export type SmartImportClinicProfileSuggestion = z.infer<
	typeof smartImportClinicProfileSuggestionSchema
>;

export const smartImportPublicLookupTargetSchema = z.object({
	kind: z.enum([
		"maps",
		"company_registry",
		"website_search",
		"medical_license_registry",
	]),
	title: z.string(),
	query: z.string(),
	url: z.string().url(),
	privacy: z.string(),
	nextAction: z.string(),
});

export type SmartImportPublicLookupTarget = z.infer<
	typeof smartImportPublicLookupTargetSchema
>;

export const smartImportLegacySourceKindSchema = z.enum([
	"mis_database",
	"firebird_database",
	"access_database",
	"sqlite_database",
	"sql_dump",
	"spreadsheet_export",
	"csv_export",
	"archive_export",
	"pacs_dicom",
	"dicom_folder",
	"xray_image_archive",
	"vendor_imaging_system",
	"network_share",
	"unknown_legacy_source",
]);

export type SmartImportLegacySourceKind = z.infer<
	typeof smartImportLegacySourceKindSchema
>;

export const smartImportLegacySourceAutomationLevelSchema = z.enum([
	"ready_for_preview",
	"needs_file_upload",
	"needs_local_bridge",
	"manual_review",
]);

export type SmartImportLegacySourceAutomationLevel = z.infer<
	typeof smartImportLegacySourceAutomationLevelSchema
>;

export const smartImportLegacySourceSchema = z.object({
	kind: smartImportLegacySourceKindSchema,
	title: z.string(),
	confidence: z.number().min(0).max(1),
	sourceRef: z.string().nullable(),
	safeSourceAlias: z.string().nullable(),
	evidence: z.array(z.string()),
	requiredArtifacts: z.array(z.string()),
	recommendedRoute: z.string(),
	automationLevel: smartImportLegacySourceAutomationLevelSchema,
	privacy: z.string(),
	nextAction: z.string(),
});

export type SmartImportLegacySource = z.infer<
	typeof smartImportLegacySourceSchema
>;

export const smartImportMigrationPlanStepSchema = z.object({
	id: z.string(),
	title: z.string(),
	status: z.enum(["ready", "review", "manual", "blocked"]),
	detail: z.string(),
	nextAction: z.string(),
});

export type SmartImportMigrationPlanStep = z.infer<
	typeof smartImportMigrationPlanStepSchema
>;

export const smartImportMigrationPlanSchema = z.object({
	coverage: z.object({
		patients: z.boolean(),
		imaging: z.boolean(),
		clinicProfile: z.boolean(),
		publicLookup: z.boolean(),
		legacySources: z.boolean(),
	}),
	steps: z.array(smartImportMigrationPlanStepSchema),
	privacyWarnings: z.array(z.string()),
	nextAction: z.string(),
});

export type SmartImportMigrationPlan = z.infer<
	typeof smartImportMigrationPlanSchema
>;

export const smartImportPreviewResponseSchema = z.object({
	sourceName: z.string(),
	totalLines: z.number().int().nonnegative(),
	patientRawText: z.string(),
	imagingRawText: z.string(),
	clinicRawText: z.string(),
	legacySourceRawText: z.string(),
	patientPreview: importPreviewResponseSchema,
	imagingPreview: imagingImportPreviewResponseSchema,
	clinicSuggestion: smartImportClinicProfileSuggestionSchema.nullable(),
	publicLookupTargets: z.array(smartImportPublicLookupTargetSchema),
	legacySources: z.array(smartImportLegacySourceSchema),
	migrationPlan: smartImportMigrationPlanSchema,
	lineClassifications: z.array(smartImportLineClassificationSchema),
	parserNotes: z.array(z.string()),
});

export type SmartImportPreviewResponse = z.infer<
	typeof smartImportPreviewResponseSchema
>;

export const smartImportCommitResponseSchema = z.object({
	preview: smartImportPreviewResponseSchema,
	patientCommit: importCommitResponseSchema.nullable(),
	imagingCommit: imagingImportCommitResponseSchema.nullable(),
});

export type SmartImportCommitResponse = z.infer<
	typeof smartImportCommitResponseSchema
>;

export const migrationLocalSourceDiscoveryRequestSchema = z.object({
	rootPaths: z.array(z.string().min(1)).max(16).optional(),
	maxDepth: z.number().int().min(0).max(8).default(5),
	maxFolders: z.number().int().positive().max(5000).default(1600),
	maxFilesPerFolder: z.number().int().positive().max(500).default(160),
	maxCandidates: z.number().int().positive().max(80).default(18),
	includeWorkstationSignals: z.boolean().default(true),
	maxWorkstationSignals: z.number().int().nonnegative().max(80).default(24),
});

export type MigrationLocalSourceDiscoveryRequest = z.infer<
	typeof migrationLocalSourceDiscoveryRequestSchema
>;

export const migrationLocalSourceDiscoveryCandidateSchema = z.object({
	sourceRef: z.string(),
	safeDisplayName: z.string(),
	sourceKind: smartImportLegacySourceKindSchema,
	sourceLabel: z.string(),
	sourceFingerprint: z.string(),
	depth: z.number().int().nonnegative(),
	confidence: z.number().min(0).max(1),
	matchedFiles: z.number().int().nonnegative(),
	databaseFiles: z.number().int().nonnegative(),
	dumpFiles: z.number().int().nonnegative(),
	tableFiles: z.number().int().nonnegative(),
	archiveFiles: z.number().int().nonnegative(),
	dicomLikeFiles: z.number().int().nonnegative(),
	imageFiles: z.number().int().nonnegative(),
	hasDicomDir: z.boolean(),
	latestModifiedAt: z.string().nullable(),
	reasons: z.array(z.string()),
	warnings: z.array(z.string()),
	smartImportLine: z.string(),
});

export type MigrationLocalSourceDiscoveryCandidate = z.infer<
	typeof migrationLocalSourceDiscoveryCandidateSchema
>;

export const migrationLocalSourceDiscoveryResponseSchema = z.object({
	version: z.literal("dental-crm-migration-local-discovery-v1"),
	generatedAt: z.string(),
	roots: z.array(z.string()),
	scannedFolders: z.number().int().nonnegative(),
	candidates: z.array(migrationLocalSourceDiscoveryCandidateSchema),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type MigrationLocalSourceDiscoveryResponse = z.infer<
	typeof migrationLocalSourceDiscoveryResponseSchema
>;

export const migrationLocalSourceWorkupRequestSchema = z.object({
	sourceRef: z.string().min(1),
	sourceKind: smartImportLegacySourceKindSchema.optional(),
	safeDisplayName: z.string().trim().max(160).optional(),
});

export type MigrationLocalSourceWorkupRequest = z.infer<
	typeof migrationLocalSourceWorkupRequestSchema
>;

export const migrationExtractableEntitySchema = z.enum([
	"clinic_profile",
	"patients",
	"appointments",
	"visits",
	"payments",
	"documents",
	"service_catalog",
	"imaging",
	"dicom_series",
	"unknown",
]);

export type MigrationExtractableEntity = z.infer<
	typeof migrationExtractableEntitySchema
>;

export const migrationLocalSourceWorkupStepSchema = z.object({
	id: z.string(),
	title: z.string(),
	status: z.enum(["ready", "needs_bridge", "manual", "blocked"]),
	detail: z.string(),
	actionLabel: z.string(),
});

export type MigrationLocalSourceWorkupStep = z.infer<
	typeof migrationLocalSourceWorkupStepSchema
>;

export const migrationLocalSourceHandoffSchema = z.object({
	title: z.string(),
	method: z.enum(["GET", "POST"]),
	endpoint: z.string(),
	payloadHint: z.string(),
	privacy: z.string(),
});

export type MigrationLocalSourceHandoff = z.infer<
	typeof migrationLocalSourceHandoffSchema
>;

export const migrationReadinessItemSchema = z.object({
	id: z.string(),
	title: z.string(),
	status: z.enum(["ready", "warning", "blocked"]),
	owner: z.enum(["administrator", "doctor", "assistant", "system"]),
	detail: z.string(),
	nextAction: z.string(),
});

export type MigrationReadinessItem = z.infer<
	typeof migrationReadinessItemSchema
>;
