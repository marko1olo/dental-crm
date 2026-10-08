import { z } from "zod";
import { communicationChannelSchema, communicationDirectionSchema, communicationIntentSchema, communicationPrioritySchema, communicationStatusSchema, communicationTaskOutcomeSchema, communicationTaskWorkflowCodeSchema, staffRoleSchema } from "./aiAndEgiszSchemas.js";

export const communicationTaskSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	patientId: z.string().uuid(),
	appointmentId: z.string().uuid().nullable(),
	visitId: z.string().uuid().nullable(),
	documentId: z.string().uuid().nullable(),
	assignedRole: staffRoleSchema,
	channel: communicationChannelSchema,
	intent: communicationIntentSchema,
	status: communicationStatusSchema,
	priority: communicationPrioritySchema,
	dueAt: z
		.union([z.string(), z.date()])
		.transform((v) => (v instanceof Date ? v.toISOString() : v)),
	title: z.string(),
	body: z.string(),
	workflowCode: communicationTaskWorkflowCodeSchema.nullable().optional(),
	lastOutcome: communicationTaskOutcomeSchema.nullable().optional(),
	lastEventAt: z
		.union([z.string(), z.date()])
		.nullable()
		.optional()
		.transform((v) => (v instanceof Date ? v.toISOString() : v ?? null)),
	createdAt: z
		.union([z.string(), z.date()])
		.transform((v) => (v instanceof Date ? v.toISOString() : v)),
});

export type CommunicationTask = z.infer<typeof communicationTaskSchema>;

export const communicationEventSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	taskId: z.string().uuid().nullable(),
	patientId: z.string().uuid(),
	actorUserId: z.string().uuid().nullable(),
	channel: communicationChannelSchema,
	direction: communicationDirectionSchema,
	status: communicationStatusSchema,
	message: z.string(),
	createdAt: z.string(),
});

export type CommunicationEvent = z.infer<typeof communicationEventSchema>;

export const denteTelegramBotModeSchema = z.enum([
	"disabled",
	"shared_dente_bot",
	"clinic_owned_bot",
]);

export type DenteTelegramBotMode = z.infer<typeof denteTelegramBotModeSchema>;

export const denteTelegramPrivacyModeSchema = z.enum([
	"no_phi_by_default",
	"limited_admin_only",
	"consented_phi_templates",
]);

export type DenteTelegramPrivacyMode = z.infer<
	typeof denteTelegramPrivacyModeSchema
>;

export const denteTelegramFeatureSchema = z.enum([
	"appointment_reminders",
	"appointment_confirmation",
	"patient_linking",
	"pre_visit_intake",
	"document_ready_notice",
	"tax_document_request",
	"payment_reminders",
	"post_visit_instructions",
	"recalls",
	"review_requests",
	"staff_daily_digest",
	"staff_task_alerts",
	"callback_requests",
	"voice_note_intake",
	"secure_portal_links",
]);

export type DenteTelegramFeature = z.infer<typeof denteTelegramFeatureSchema>;

export const denteTelegramVisualCardKeySchema = z.enum([
	"mainMenu",
	"appointment",
	"documents",
	"tax",
	"billing",
	"care",
	"review",
	"staff",
]);

export type DenteTelegramVisualCardKey = z.infer<
	typeof denteTelegramVisualCardKeySchema
>;

export const denteTelegramVisualCardUrlsSchema = z
	.object({
		mainMenu: z.string().trim().max(500).nullable().default(null),
		appointment: z.string().trim().max(500).nullable().default(null),
		documents: z.string().trim().max(500).nullable().default(null),
		tax: z.string().trim().max(500).nullable().default(null),
		billing: z.string().trim().max(500).nullable().default(null),
		care: z.string().trim().max(500).nullable().default(null),
		review: z.string().trim().max(500).nullable().default(null),
		staff: z.string().trim().max(500).nullable().default(null),
	})
	.default({});

export type DenteTelegramVisualCardUrls = z.infer<
	typeof denteTelegramVisualCardUrlsSchema
>;

export const denteTelegramPostVisitCheckupDelayHoursByTopicSchema = z
	.object({
		extraction: z.number().int().min(1).max(720).default(24),
		implantation: z.number().int().min(1).max(720).default(24),
		surgery_aftercare: z.number().int().min(1).max(720).default(24),
		fixation_aftercare: z.number().int().min(1).max(720).default(48),
		filling_restoration: z.number().int().min(1).max(720).default(48),
		endo: z.number().int().min(1).max(720).default(48),
		surgery: z.number().int().min(1).max(720).default(24),
		local_anesthesia: z.number().int().min(1).max(720).default(24),
		hygiene: z.number().int().min(1).max(720).default(72),
		prosthetics: z.number().int().min(1).max(720).default(48),
		orthodontics: z.number().int().min(1).max(720).default(72),
		periodontology: z.number().int().min(1).max(720).default(72),
		other: z.number().int().min(1).max(720).default(48),
	})
	.default({});

export type DenteTelegramPostVisitCheckupDelayHoursByTopic = z.infer<
	typeof denteTelegramPostVisitCheckupDelayHoursByTopicSchema
>;

export const telegramBotUsernameSchema = z
	.string()
	.trim()
	.max(33)
	.regex(
		/^@?[A-Za-z][A-Za-z0-9_]{1,28}[Bb][Oo][Tt]$/,
		"Имя Telegram-бота должно содержать 5-32 символа: буквы, цифры, подчёркивания и окончание bot",
	);

export const denteTelegramBotSettingsSchema = z.object({
	version: z.literal(1).default(1),
	organizationId: z.string().uuid(),
	mode: denteTelegramBotModeSchema,
	botUsername: telegramBotUsernameSchema.nullable(),
	ownBotUsername: telegramBotUsernameSchema.nullable(),
	webhookBaseUrl: z.string().trim().max(500).nullable(),
	patientPortalBaseUrl: z.string().trim().max(500).nullable(),
	welcomeImageUrl: z.string().trim().max(500).nullable(),
	visualCardUrls: denteTelegramVisualCardUrlsSchema,
	clinicReviewUrl: z.string().trim().max(500).nullable(),
	clinicMapsUrl: z.string().trim().max(500).nullable(),
	enabledFeatures: z.array(denteTelegramFeatureSchema),
	patientLinkTokenTtlMinutes: z.number().int().min(5).max(1440),
	appointmentReminderLeadTimesHours: z
		.array(z.number().int().min(1).max(168))
		.min(1)
		.max(6)
		.default([24]),
	reviewRequestDelayHours: z.number().int().min(1).max(720).default(2),
	postVisitCheckupDelayHoursByTopic:
		denteTelegramPostVisitCheckupDelayHoursByTopicSchema,
	allowVoiceIntake: z.boolean(),
	staffEscalationChannel: z.string().trim().max(128).nullable(),
	privacyMode: denteTelegramPrivacyModeSchema,
	updatedAt: z.string(),
});

export type DenteTelegramBotSettings = z.infer<
	typeof denteTelegramBotSettingsSchema
>;

export const updateDenteTelegramBotSettingsSchema =
	denteTelegramBotSettingsSchema
		.omit({ version: true, organizationId: true, updatedAt: true })
		.partial()
		.extend({
			version: z.literal(1).optional(),
			organizationId: z.string().uuid().optional(),
			updatedAt: z.string().optional(),
		});

export type UpdateDenteTelegramBotSettingsInput = z.infer<
	typeof updateDenteTelegramBotSettingsSchema
>;

export const denteTelegramSubjectTypeSchema = z.enum(["patient", "staff"]);

export type DenteTelegramSubjectType = z.infer<
	typeof denteTelegramSubjectTypeSchema
>;

export const denteTelegramLinkCodeStatusSchema = z.enum([
	"pending",
	"used",
	"expired",
	"revoked",
]);

export type DenteTelegramLinkCodeStatus = z.infer<
	typeof denteTelegramLinkCodeStatusSchema
>;

export const denteTelegramChatLinkStatusSchema = z.enum(["active", "revoked"]);

export type DenteTelegramChatLinkStatus = z.infer<
	typeof denteTelegramChatLinkStatusSchema
>;

export const denteTelegramLinkCodeSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	clinicId: z.string().uuid().nullable(),
	botConfigId: z.string().trim().min(1).max(160).default("default"),
	subjectType: denteTelegramSubjectTypeSchema,
	subjectId: z.string().uuid(),
	codeFingerprint: z.string().min(24).max(128),
	codeLast4: z.string().min(4).max(16),
	status: denteTelegramLinkCodeStatusSchema,
	expiresAt: z.string(),
	usedAt: z.string().nullable(),
	createdAt: z.string(),
	createdByUserId: z.string().uuid().nullable(),
});

export type DenteTelegramLinkCode = z.infer<typeof denteTelegramLinkCodeSchema>;

export const denteTelegramLinkCodePublicSchema =
	denteTelegramLinkCodeSchema.omit({ codeFingerprint: true });

export type DenteTelegramLinkCodePublic = z.infer<
	typeof denteTelegramLinkCodePublicSchema
>;

export const denteTelegramLinkCodeListResponseSchema = z.object({
	totalCount: z.number().int().nonnegative(),
	filteredCount: z.number().int().nonnegative(),
	limit: z.number().int().positive(),
	cursor: z.string().nullable(),
	nextCursor: z.string().nullable(),
	pendingCount: z.number().int().nonnegative(),
	usedCount: z.number().int().nonnegative(),
	expiredCount: z.number().int().nonnegative(),
	revokedCount: z.number().int().nonnegative(),
	linkCodes: z.array(denteTelegramLinkCodePublicSchema),
});

export type DenteTelegramLinkCodeListResponse = z.infer<
	typeof denteTelegramLinkCodeListResponseSchema
>;

export const createDenteTelegramLinkCodeSchema = z.object({
	organizationId: z.string().uuid().optional(),
	subjectType: denteTelegramSubjectTypeSchema,
	subjectId: z.string().uuid(),
	clinicId: z.string().uuid().nullable().optional(),
	botConfigId: z.string().trim().min(1).max(160).optional(),
	ttlMinutes: z.number().int().min(5).max(1440).optional(),
	createdByUserId: z.string().uuid().nullable().optional(),
});

export type CreateDenteTelegramLinkCodeInput = z.infer<
	typeof createDenteTelegramLinkCodeSchema
>;

export const denteTelegramLinkCodeCreatedSchema =
	denteTelegramLinkCodePublicSchema.extend({
		code: z.string().min(8).max(64),
		deepLink: z.string().url().nullable(),
		qrSvg: z.string().min(1).max(80_000).nullable(),
		shareText: z.string().min(1).max(500),
	});

export type DenteTelegramLinkCodeCreated = z.infer<
	typeof denteTelegramLinkCodeCreatedSchema
>;

export const denteTelegramChatLinkSchema = z.object({
	id: z.string().uuid(),
	organizationId: z.string().uuid(),
	clinicId: z.string().uuid().nullable(),
	botConfigId: z.string().trim().min(1).max(160).default("default"),
	subjectType: denteTelegramSubjectTypeSchema,
	subjectId: z.string().uuid(),
	chatFingerprint: z.string().min(12).max(128),
	chatTransportRef: z.string().min(10).max(500).nullable().optional(),
	chatIdLast4: z.string().min(1).max(16).nullable().optional(),
	status: denteTelegramChatLinkStatusSchema,
	linkedAt: z.string(),
	revokedAt: z.string().nullable(),
	lastUpdateAt: z.string(),
});

export type DenteTelegramChatLink = z.infer<typeof denteTelegramChatLinkSchema>;

export const denteTelegramChatLinkPublicSchema =
	denteTelegramChatLinkSchema.omit({ chatTransportRef: true });

export type DenteTelegramChatLinkPublic = z.infer<
	typeof denteTelegramChatLinkPublicSchema
>;

export const denteTelegramChatLinkListResponseSchema = z.object({
	totalCount: z.number().int().nonnegative(),
	filteredCount: z.number().int().nonnegative(),
	limit: z.number().int().positive(),
	cursor: z.string().nullable(),
	nextCursor: z.string().nullable(),
	activeCount: z.number().int().nonnegative(),
	revokedCount: z.number().int().nonnegative(),
	chatLinks: z.array(denteTelegramChatLinkPublicSchema),
});

export type DenteTelegramChatLinkListResponse = z.infer<
	typeof denteTelegramChatLinkListResponseSchema
>;

export const denteTelegramTemplateKindSchema = z.enum([
	"appointment_reminder",
	"appointment_confirmation",
	"payment_reminder_notice",
	"document_ready_notice",
	"tax_document_request_status",
	"callback_request_received",
	"post_visit_instruction_link",
	"post_visit_checkup",
	"recall_notice",
	"review_request",
	"staff_daily_digest",
]);

export type DenteTelegramTemplateKind = z.infer<
	typeof denteTelegramTemplateKindSchema
>;

export const denteTelegramAppointmentCallbackActionSchema = z.enum([
	"confirm",
	"reschedule",
	"call_request",
]);

export type DenteTelegramAppointmentCallbackAction = z.infer<
	typeof denteTelegramAppointmentCallbackActionSchema
>;

export const denteTelegramAppointmentCallbackResultSchema = z.object({
	ok: z.boolean(),
	action: z.enum([
		"telegram_appointment_confirmed",
		"telegram_appointment_reschedule_requested",
		"telegram_callback_requested",
		"telegram_callback_rejected",
	]),
	appointmentId: z.string().uuid().nullable(),
	taskId: z.string().uuid().nullable(),
	eventId: z.string().uuid().nullable(),
	replyText: z.string(),
	warnings: z.array(z.string()),
});

export type DenteTelegramAppointmentCallbackResult = z.infer<
	typeof denteTelegramAppointmentCallbackResultSchema
>;

export const denteTelegramMessageClassificationSchema = z.enum([
	"no_phi",
	"limited_admin",
	"phi_requires_consent",
]);

export type DenteTelegramMessageClassification = z.infer<
	typeof denteTelegramMessageClassificationSchema
>;

export const denteTelegramMessagePreviewRequestSchema = z.object({
	templateKind: denteTelegramTemplateKindSchema,
	patientId: z.string().uuid().optional(),
	staffId: z.string().uuid().optional(),
	appointmentId: z.string().uuid().optional(),
	documentId: z.string().uuid().optional(),
	taskId: z.string().uuid().optional(),
	includePhi: z.boolean().default(false),
});

export type DenteTelegramMessagePreviewRequest = z.infer<
	typeof denteTelegramMessagePreviewRequestSchema
>;

export const denteTelegramMessagePreviewSchema = z.object({
	templateKind: denteTelegramTemplateKindSchema,
	classification: denteTelegramMessageClassificationSchema,
	allowedByDefault: z.boolean(),
	text: z.string(),
	replyMarkup: z.record(z.unknown()).nullable(),
	photoUrl: z.string().url().nullable().default(null),
	variablesUsed: z.array(z.string()),
	warnings: z.array(z.string()),
	blockedReason: z.string().nullable(),
});

export type DenteTelegramMessagePreview = z.infer<
	typeof denteTelegramMessagePreviewSchema
>;

export const denteTelegramOutboxDeliveryStatusSchema = z.enum([
	"ready",
	"needs_chat_link",
	"blocked_by_policy",
	"transport_not_ready",
	"disabled",
]);

export type DenteTelegramOutboxDeliveryStatus = z.infer<
	typeof denteTelegramOutboxDeliveryStatusSchema
>;

export const denteTelegramOutboxItemSchema = z.object({
	id: z.string(),
	organizationId: z.string().uuid(),
	taskId: z.string().uuid().nullable(),
	patientId: z.string().uuid().nullable(),
	appointmentId: z.string().uuid().nullable(),
	subjectType: denteTelegramSubjectTypeSchema,
	subjectId: z.string().uuid(),
	chatLinkId: z.string().uuid().nullable(),
	templateKind: denteTelegramTemplateKindSchema,
	deliveryStatus: denteTelegramOutboxDeliveryStatusSchema,
	scheduledAt: z.string(),
	title: z.string(),
	previewText: z.string(),
	replyMarkup: z.record(z.unknown()).nullable(),
	photoUrl: z.string().url().nullable().default(null),
	warnings: z.array(z.string()),
	blockedReason: z.string().nullable(),
	source: z.enum([
		"communication_task",
		"staff_digest",
		"document_ready",
		"payment_reminder",
		"review_request",
		"post_visit_instruction",
		"post_visit_checkup",
		"recall",
		"appointment_reminder",
		"tax_document_request",
	]),
});

export type DenteTelegramOutboxItem = z.infer<
	typeof denteTelegramOutboxItemSchema
>;

export const denteTelegramOutboxResponseSchema = z.object({
	generatedAt: z.string(),
	mode: denteTelegramBotModeSchema,
	transportReady: z.boolean(),
	totalCount: z.number().int().nonnegative(),
	filteredCount: z.number().int().nonnegative(),
	limit: z.number().int().positive(),
	cursor: z.string().nullable(),
	nextCursor: z.string().nullable(),
	readyCount: z.number().int().nonnegative(),
	dueCount: z.number().int().nonnegative(),
	notDueCount: z.number().int().nonnegative(),
	blockedCount: z.number().int().nonnegative(),
	items: z.array(denteTelegramOutboxItemSchema),
	warnings: z.array(z.string()),
});

export type DenteTelegramOutboxResponse = z.infer<
	typeof denteTelegramOutboxResponseSchema
>;

export const denteTelegramOutboxSendRequestSchema = z.object({
	dryRun: z.boolean().default(false),
	clientMutationId: z.string().min(1).max(120).nullable().optional(),
});

export type DenteTelegramOutboxSendRequest = z.infer<
	typeof denteTelegramOutboxSendRequestSchema
>;

export const denteTelegramOutboxSendStatusSchema = z.enum([
	"sent",
	"dry_run",
	"blocked",
	"failed",
]);

export type DenteTelegramOutboxSendStatus = z.infer<
	typeof denteTelegramOutboxSendStatusSchema
>;

export const denteTelegramOutboxSendResponseSchema = z.object({
	status: denteTelegramOutboxSendStatusSchema,
	outboxItem: denteTelegramOutboxItemSchema.nullable(),
	taskId: z.string().uuid().nullable(),
	eventId: z.string().uuid().nullable(),
	telegramMessageId: z.number().int().nonnegative().nullable(),
	clientMutationId: z.string().nullable(),
	warnings: z.array(z.string()),
	retryAfterSeconds: z.number().int().nonnegative().nullable().default(null),
	blockedReason: z.string().nullable(),
});

export type DenteTelegramOutboxSendResponse = z.infer<
	typeof denteTelegramOutboxSendResponseSchema
>;

export const denteTelegramOutboxSendDueResponseSchema = z.object({
	ok: z.boolean(),
	dryRun: z.boolean(),
	requestedLimit: z.number().int().positive(),
	dueCount: z.number().int().nonnegative(),
	notDueCount: z.number().int().nonnegative(),
	attemptedCount: z.number().int().nonnegative(),
	sentCount: z.number().int().nonnegative(),
	dryRunCount: z.number().int().nonnegative(),
	blockedCount: z.number().int().nonnegative(),
	failedCount: z.number().int().nonnegative(),
	results: z.array(
		z.object({
			itemId: z.string(),
			statusCode: z.number().int(),
			result: z.union([
				denteTelegramOutboxSendResponseSchema,
				z.object({
					error: z.string(),
					message: z.string(),
				}),
			]),
		}),
	),
});

export type DenteTelegramOutboxSendDueResponse = z.infer<
	typeof denteTelegramOutboxSendDueResponseSchema
>;
