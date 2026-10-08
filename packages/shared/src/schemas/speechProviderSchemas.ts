import { z } from "zod";
import { clinicModeSchema, dentalSpecialtySchema, integrationPresetSchema, speechGatewayProviderSchema, speechKeyPoolSchema, speechProviderConnectorSchema, speechProviderKindSchema, speechProviderSelectionModeSchema, speechTranscriptionQualitySchema, speechTranscriptionSourceSchema, speechTranscriptionStatusSchema, staffRoleSchema } from "./aiAndEgiszSchemas.js";
import { clockTimeSchema, clockTimeToMinutes, isDateLikeString, weekdayIndexSchema } from "../datetime/index.js";

export const speechProviderHealthLevelSchema = z.enum([
	"ready",
	"degraded",
	"setup_required",
	"planned",
	"offline",
]);

export type SpeechProviderHealthLevel = z.infer<
	typeof speechProviderHealthLevelSchema
>;

export const speechProviderKeyHealthSchema = z.object({
	fingerprint: z.string(),
	source: z.string(),
	ordinal: z.number().int().positive(),
	available: z.boolean(),
	coolingDownUntil: z.string().nullable(),
	failures: z.number().int().nonnegative(),
	successes: z.number().int().nonnegative(),
	lastUsedAt: z.string().nullable(),
	lastStatusCode: z.number().int().nullable(),
	lastError: z.string().nullable(),
});

export type SpeechProviderKeyHealth = z.infer<
	typeof speechProviderKeyHealthSchema
>;

export const speechProviderHealthSchema = z.object({
	providerId: speechProviderKindSchema,
	providerLabel: z.string(),
	connector: speechProviderConnectorSchema,
	configured: z.boolean(),
	canTranscribeChunks: z.boolean(),
	keyPool: speechKeyPoolSchema,
	keyHealth: z.array(speechProviderKeyHealthSchema),
	healthLevel: speechProviderHealthLevelSchema,
	fallbackRank: z.number().int().nonnegative().nullable(),
	safeToUseInVisit: z.boolean(),
	warnings: z.array(z.string()),
	nextStep: z.string(),
});

export type SpeechProviderHealth = z.infer<typeof speechProviderHealthSchema>;

export const speechRecordingStrategyRequestSchema = z.object({
	expectedDurationMs: z
		.number()
		.int()
		.positive()
		.max(14_400_000)
		.nullable()
		.optional(),
	networkState: z.enum(["online", "offline", "unknown"]).default("unknown"),
	privacyMode: z.enum(["cloud_allowed", "local_only"]).default("cloud_allowed"),
	specialty: dentalSpecialtySchema.default("universal"),
	source: speechTranscriptionSourceSchema.default("visit"),
});

export type SpeechRecordingStrategyRequest = z.infer<
	typeof speechRecordingStrategyRequestSchema
>;

export const speechRecordingStrategySchema = z.object({
	recommendedPath: z.enum([
		"server_chunked",
		"browser_live",
		"offline_queue",
		"local_transcript_only",
		"async_long_recording",
	]),
	providerId: speechGatewayProviderSchema,
	providerLabel: z.string(),
	serverUploadAllowed: z.boolean(),
	localQueueRequired: z.boolean(),
	deterministicParserRequired: z.boolean(),
	neuralPolishAllowed: z.boolean(),
	chunkMs: z.number().int().positive(),
	minChunkMs: z.number().int().positive(),
	maxChunkMs: z.number().int().positive(),
	estimatedChunkCount: z.number().int().nonnegative().nullable(),
	maxChunkBytes: z.number().int().positive(),
	reason: z.string(),
	steps: z.array(z.string()),
	warnings: z.array(z.string()),
});

export type SpeechRecordingStrategy = z.infer<
	typeof speechRecordingStrategySchema
>;

export const speechSttPromptPolicySchema = z.object({
	enabled: z.boolean(),
	version: z.string(),
	appliesTo: z.array(speechProviderKindSchema),
	maxChars: z.number().int().positive(),
	termCount: z.number().int().nonnegative(),
	promptPreview: z.string(),
	warnings: z.array(z.string()),
});

export type SpeechSttPromptPolicy = z.infer<typeof speechSttPromptPolicySchema>;

export const speechGatewayStatusSchema = z.object({
	providerId: speechGatewayProviderSchema,
	requestedProviderId: speechGatewayProviderSchema,
	providerLabel: z.string(),
	providerSelectionMode: speechProviderSelectionModeSchema,
	serverTranscriptionEnabled: z.boolean(),
	serverTranscriptionCurrentlyAvailable: z.boolean(),
	keyConfigured: z.boolean(),
	keyPool: speechKeyPoolSchema,
	configuredProviderIds: z.array(speechProviderKindSchema),
	fallbackProviderIds: z.array(speechProviderKindSchema),
	maxChunkBytes: z.number().int().positive(),
	recommendedChunkMs: z.number().int().positive(),
	chunkingPolicy: z.object({
		strategy: z.enum(["time_and_silence", "time_only"]),
		minChunkMs: z.number().int().positive(),
		maxChunkMs: z.number().int().positive(),
		silenceMs: z.number().int().positive(),
		rmsThreshold: z.number().positive(),
		monitorIntervalMs: z.number().int().positive(),
		overlapMs: z.number().int().nonnegative(),
		dedupeWindowChars: z.number().int().positive(),
	}),
	polishPolicy: z.object({
		deterministicEnabled: z.boolean(),
		neuralEnabled: z.boolean(),
		providerLabel: z.string(),
		modelName: z.string().nullable(),
		maxTranscriptChars: z.number().int().positive(),
		warnings: z.array(z.string()),
	}),
	promptPolicy: speechSttPromptPolicySchema,
	audioRetention: z.enum(["discard_after_transcription", "disabled"]),
	nextSetupStep: z.string(),
	warnings: z.array(z.string()),
});

export type SpeechGatewayStatus = z.infer<typeof speechGatewayStatusSchema>;

export const speechGatewayHealthReportSchema = z.object({
	generatedAt: z.string(),
	activeProviderId: speechGatewayProviderSchema,
	activeProviderLabel: z.string(),
	serverTranscriptionEnabled: z.boolean(),
	fallbackProviderIds: z.array(speechProviderKindSchema),
	totalConfiguredKeys: z.number().int().nonnegative(),
	totalAvailableKeys: z.number().int().nonnegative(),
	totalCoolingDownKeys: z.number().int().nonnegative(),
	timeoutMs: z.number().int().positive(),
	retryLimit: z.number().int().nonnegative(),
	promptEnabled: z.boolean(),
	deterministicParserEnabled: z.boolean(),
	providers: z.array(speechProviderHealthSchema),
	warnings: z.array(z.string()),
	nextAction: z.string(),
});

export type SpeechGatewayHealthReport = z.infer<
	typeof speechGatewayHealthReportSchema
>;

export const speechTranscriptionChunkSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	recordingId: z.string(),
	chunkIndex: z.number().int().nonnegative(),
	source: speechTranscriptionSourceSchema,
	patientId: z.string().uuid().nullable(),
	visitId: z.string().uuid().nullable(),
	providerId: speechGatewayProviderSchema,
	providerLabel: z.string(),
	mimeType: z.string(),
	byteLength: z.number().int().nonnegative(),
	durationMs: z.number().int().positive().nullable(),
	language: z.string(),
	transcript: z.string(),
	confidence: z.number().min(0).max(1).nullable(),
	status: speechTranscriptionStatusSchema,
	quality: speechTranscriptionQualitySchema.default({
		level: "review",
		confidence: null,
		wordCount: 0,
		charCount: 0,
		durationMs: null,
		bytesPerSecond: null,
		providerWarnings: [
			"У старого фрагмента распознавания нет метаданных качества.",
		],
		signals: ["legacy_chunk"],
		nextAction:
			"Проверьте старый фрагмент распознавания перед переносом в карту.",
	}),
	warnings: z.array(z.string()),
	clientRecordedAt: z.string().nullable(),
	createdAt: z.string(),
});

export type SpeechTranscriptionChunk = z.infer<
	typeof speechTranscriptionChunkSchema
>;

export const speechTranscriptionResponseSchema = z.object({
	chunk: speechTranscriptionChunkSchema,
	gateway: speechGatewayStatusSchema,
});

export type SpeechTranscriptionResponse = z.infer<
	typeof speechTranscriptionResponseSchema
>;

export const speechRecordingAssemblySchema = z.object({
	recordingId: z.string(),
	chunkCount: z.number().int().nonnegative(),
	receivedChunkIndexes: z.array(z.number().int().nonnegative()),
	missingChunkIndexes: z.array(z.number().int().nonnegative()),
	providerLabels: z.array(z.string()),
	statuses: z.array(speechTranscriptionStatusSchema),
	qualityCounts: z.object({
		clear: z.number().int().nonnegative(),
		review: z.number().int().nonnegative(),
		empty: z.number().int().nonnegative(),
		failed: z.number().int().nonnegative(),
	}),
	transcript: z.string(),
	warnings: z.array(z.string()),
	firstChunkAt: z.string().nullable(),
	lastChunkAt: z.string().nullable(),
	assembledAt: z.string(),
});

export type SpeechRecordingAssembly = z.infer<
	typeof speechRecordingAssemblySchema
>;

export const speechRecordingRecoveryStateSchema = z.enum([
	"complete",
	"quality_review",
	"missing_chunks",
	"failed_chunks",
	"transcript_empty",
]);

export type SpeechRecordingRecoveryState = z.infer<
	typeof speechRecordingRecoveryStateSchema
>;

export const speechRecordingRecoveryItemSchema = z.object({
	recordingId: z.string(),
	source: speechTranscriptionSourceSchema,
	patientId: z.string().uuid().nullable(),
	visitId: z.string().uuid().nullable(),
	chunkCount: z.number().int().nonnegative(),
	receivedChunkIndexes: z.array(z.number().int().nonnegative()),
	missingChunkIndexes: z.array(z.number().int().nonnegative()),
	statusCounts: z.object({
		transcribed: z.number().int().nonnegative(),
		fallback_text: z.number().int().nonnegative(),
		needs_provider_key: z.number().int().nonnegative(),
		failed: z.number().int().nonnegative(),
	}),
	qualityCounts: z.object({
		clear: z.number().int().nonnegative(),
		review: z.number().int().nonnegative(),
		empty: z.number().int().nonnegative(),
		failed: z.number().int().nonnegative(),
	}),
	providerLabels: z.array(z.string()),
	transcriptPreview: z.string(),
	transcriptCharCount: z.number().int().nonnegative(),
	totalDurationMs: z.number().int().nonnegative().nullable(),
	totalBytes: z.number().int().nonnegative(),
	firstChunkAt: z.string().nullable(),
	lastChunkAt: z.string().nullable(),
	recoveryState: speechRecordingRecoveryStateSchema,
	nextAction: z.string(),
	warnings: z.array(z.string()),
});

export type SpeechRecordingRecoveryItem = z.infer<
	typeof speechRecordingRecoveryItemSchema
>;

export const speechRecordingRecoveryListSchema = z.object({
	recordings: z.array(speechRecordingRecoveryItemSchema),
	totalRecordings: z.number().int().nonnegative(),
	generatedAt: z.string(),
});

export type SpeechRecordingRecoveryList = z.infer<
	typeof speechRecordingRecoveryListSchema
>;

export const clinicScheduleDefaultsSchema = z
	.object({
		workdayStart: clockTimeSchema,
		workdayEnd: clockTimeSchema,
		workingDays: z.array(weekdayIndexSchema).min(1).max(7),
		appointmentBufferMinutes: z.number().int().min(0).max(180),
	})
	.superRefine((value, context) => {
		if (
			clockTimeToMinutes(value.workdayEnd) <=
			clockTimeToMinutes(value.workdayStart)
		) {
			context.addIssue({
				code: "custom",
				path: ["workdayEnd"],
				message: "Окончание рабочего дня должно быть позже начала",
			});
		}
	});

export type ClinicScheduleDefaults = z.infer<
	typeof clinicScheduleDefaultsSchema
>;

export const staffWorkingDaySchema = z
	.object({
		weekday: weekdayIndexSchema,
		enabled: z.boolean(),
		start: clockTimeSchema,
		end: clockTimeSchema,
	})
	.superRefine((value, context) => {
		if (
			value.enabled &&
			clockTimeToMinutes(value.end) <= clockTimeToMinutes(value.start)
		) {
			context.addIssue({
				code: "custom",
				path: ["end"],
				message: "Окончание рабочего дня сотрудника должно быть позже начала",
			});
		}
	});

export type StaffWorkingDay = z.infer<typeof staffWorkingDaySchema>;

export const staffWorkingHoursSchema = z.array(staffWorkingDaySchema).max(7);

export type StaffWorkingHours = z.infer<typeof staffWorkingHoursSchema>;

export function isValidTimeZone(value: string): boolean {
	try {
		new Intl.DateTimeFormat("ru-RU", { timeZone: value }).format(
			new Date("2026-01-01T00:00:00.000Z"),
		);
		return true;
	} catch {
		return false;
	}
}

export const timeZoneSchema = z
	.string()
	.trim()
	.min(1)
	.max(80)
	.refine(
		isValidTimeZone,
		"Укажите реальный часовой пояс, например Europe/Samara или Europe/Moscow.",
	);

export type TimeZoneId = z.infer<typeof timeZoneSchema>;

export const dateLikeStringErrorMessage =
	"Укажите дату в формате ГГГГ-ММ-ДД или ДД.ММ.ГГГГ.";

export const documentDateLikeStringSchema = z
	.string()
	.trim()
	.min(1)
	.max(80)
	.refine(isDateLikeString, dateLikeStringErrorMessage);

export const nullableDocumentDateLikeStringSchema = z
	.string()
	.trim()
	.max(80)
	.refine(
		(value) => !value || isDateLikeString(value),
		dateLikeStringErrorMessage,
	)
	.nullable()
	.optional();

export const clinicProfileSchema = z.object({
	organizationId: z.string().uuid(),
	clinicName: z.string(),
	legalName: z.string().nullable(),
	inn: z.string().nullable(),
	kpp: z.string().nullable().optional(),
	ogrn: z.string().nullable().optional(),
	address: z.string().nullable(),
	phone: z.string().nullable(),
	email: z.string().email().nullable().optional(),
	website: z.string().nullable().optional(),
	medicalLicenseNumber: z.string().nullable().optional(),
	medicalLicenseIssuedAt: nullableDocumentDateLikeStringSchema,
	medicalLicenseIssuer: z.string().nullable().optional(),
	bankDetails: z.string().nullable().optional(),
	signatoryName: z.string().nullable().optional(),
	signatoryTitle: z.string().nullable().optional(),
	mode: clinicModeSchema,
	timezone: timeZoneSchema,
	defaultVisitMinutes: z.number().int().positive(),
	scheduleDefaults: clinicScheduleDefaultsSchema,
	networkEnabled: z.boolean(),
	egiszEnabled: z.boolean(),
	specializations: z.array(z.string()).optional(),
	workingHours: z.any().nullable().optional(),
	currency: z.string().optional(),
	themeColor: z.string().nullable().optional(),
	logoUrl: z.string().nullable().optional(),
	stampUrl: z.string().nullable().optional(),
	hasAssistants: z.boolean().optional(),
	hasMultipleChairs: z.boolean().optional(),
	hasDentalLab: z.boolean().optional(),
	hasInsuranceCoPay: z.boolean().optional(),
	hasInstallments: z.boolean().optional(),
	updatedAt: z.string(),
});

export type ClinicProfile = z.infer<typeof clinicProfileSchema>;

export const staffMemberSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	fullName: z.string(),
	role: staffRoleSchema,
	specialties: z.array(dentalSpecialtySchema),
	phone: z.string().nullable(),
	email: z.string().email().nullable(),
	active: z.boolean(),
	canSignMedicalRecords: z.boolean(),
	canManageMoney: z.boolean(),
	canManageImports: z.boolean(),
	color: z.string(),
	workingHours: staffWorkingHoursSchema.nullable().optional(),
	createdAt: z.string(),
	updatedAt: z.string(),
});

export type StaffMember = z.infer<typeof staffMemberSchema>;

export const chairSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	name: z.string(),
	room: z.string().nullable(),
	specialization: dentalSpecialtySchema.nullable(),
	active: z.boolean(),
	hasXraySensor: z.boolean(),
	hasMicroscope: z.boolean(),
	hasSurgeryKit: z.boolean(),
	notes: z.string().nullable(),
	workingHours: staffWorkingHoursSchema.nullable().optional(),
});

export type Chair = z.infer<typeof chairSchema>;

export const workspaceScopeSchema = z.enum([
	"personal",
	"clinic",
	"branch",
	"network",
]);

export type WorkspaceScope = z.infer<typeof workspaceScopeSchema>;

export const workspaceSectionSchema = z.enum([
	"shift",
	"schedule",
	"patients",
	"imaging",
	"visit",
	"documents",
	"finance",
	"communications",
	"settings",
]);

export type WorkspaceSection = z.infer<typeof workspaceSectionSchema>;

export const clinicWorkspaceProfileSchema = z.object({
	id: z.string(),
	mode: clinicModeSchema,
	title: z.string(),
	description: z.string(),
	scope: workspaceScopeSchema,
	primaryRoles: z.array(staffRoleSchema),
	defaultSection: workspaceSectionSchema,
	visibleSections: z.array(workspaceSectionSchema),
	compactNavigation: z.boolean(),
	requiredCapabilities: z.array(z.string()),
	automations: z.array(z.string()),
	safeguards: z.array(z.string()),
});

export type ClinicWorkspaceProfile = z.infer<
	typeof clinicWorkspaceProfileSchema
>;

export const roleAccessPolicySchema = z.object({
	role: staffRoleSchema,
	title: z.string(),
	scope: workspaceScopeSchema,
	defaultSection: workspaceSectionSchema,
	canRead: z.array(workspaceSectionSchema),
	canWrite: z.array(workspaceSectionSchema),
	restricted: z.array(workspaceSectionSchema),
	requiresApprovalFor: z.array(z.string()),
	auditEvents: z.array(z.string()),
});

export type RoleAccessPolicy = z.infer<typeof roleAccessPolicySchema>;

export const clinicSettingsSchema = z.object({
	profile: clinicProfileSchema,
	staff: z.array(staffMemberSchema),
	chairs: z.array(chairSchema),
	integrationPresets: z.array(integrationPresetSchema),
	workspaceProfiles: z.array(clinicWorkspaceProfileSchema),
	roleAccessPolicies: z.array(roleAccessPolicySchema),
	modeHints: z.array(z.string()),
	soloDoctorMode: z.boolean().optional(),
});

export type ClinicSettings = z.infer<typeof clinicSettingsSchema>;
