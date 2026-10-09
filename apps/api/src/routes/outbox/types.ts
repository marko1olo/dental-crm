import type { FastifyReply } from "fastify";
import { z } from "zod";

export const channelSchema = z.enum([
	"phone",
	"sms",
	"whatsapp",
	"telegram",
	"email",
	"in_person",
	"vk",
	"max",
]);

export const deliverableChannelSchema = z.enum([
	"sms",
	"whatsapp",
	"telegram",
	"email",
]);

export const intentSchema = z.enum([
	"appointment_confirmation",
	"payment_reminder",
	"post_visit_instruction",
	"recall",
	"document_ready",
	"imaging_review",
	"general",
]);

export const scopeSchema = z.enum(["service", "marketing"]);

export const outboxStatusSchema = z.enum([
	"queued",
	"sending",
	"sent",
	"delivered",
	"failed",
	"cancelled",
	"suppressed",
]);

export const templateCreateSchema = z.object({
	title: z.string().trim().min(1).max(160),
	channel: channelSchema,
	intent: intentSchema,
	audienceRole: z.string().trim().min(1).max(64).default("administrator"),
	body: z.string().trim().min(1).max(20_000),
	clinicId: z.string().uuid().nullable().optional(),
	isActive: z.boolean().default(true),
	/** Разрешить медицинские переменные — только для канала с согласием. */
	allowPhi: z.boolean().default(false),
});

export const templateUpdateSchema = templateCreateSchema.partial().extend({
	allowPhi: z.boolean().default(false),
});

export const previewSchema = z.object({
	body: z.string().min(1).max(20_000),
	channel: channelSchema.default("sms"),
	values: z.record(z.union([z.string(), z.number()])).default({}),
	allowPhi: z.boolean().default(false),
});

export const enqueueSchema = z.object({
	patientId: z.string().uuid().nullable().optional(),
	channel: deliverableChannelSchema,
	intent: intentSchema.default("general"),
	scope: scopeSchema.default("service"),
	templateId: z.string().uuid().nullable().optional(),
	/** Значения переменных, если отправка идёт по шаблону. */
	values: z.record(z.union([z.string(), z.number()])).default({}),
	/** Готовый текст, если отправка без шаблона. */
	body: z.string().trim().min(1).max(20_000).optional(),
	subject: z.string().trim().max(300).nullable().optional(),
	recipientAddress: z.string().trim().max(320).nullable().optional(),
	scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
	/**
	 * Ключ защиты от дублей. Если не задан, собирается из пациента, канала и
	 * смысла сообщения — повторное нажатие кнопки не отправит второе сообщение.
	 */
	dedupeKey: z.string().trim().min(4).max(200).optional(),
});

export const settingsSchema = z.object({
	timezone: z.string().trim().min(1).max(64).optional(),
	quietHoursStartMinute: z.number().int().min(0).max(1439).optional(),
	quietHoursEndMinute: z.number().int().min(0).max(1439).optional(),
	deferServiceInQuietHours: z.boolean().optional(),
	blockMarketingInQuietHours: z.boolean().optional(),
	dailyLimitPerPatient: z.number().int().min(1).max(50).optional(),
	maxAttempts: z.number().int().min(1).max(20).optional(),
	retryBaseSeconds: z.number().int().min(5).max(3600).optional(),
	retryMaxSeconds: z.number().int().min(60).max(86_400).optional(),
	channelFallback: z.array(deliverableChannelSchema).min(1).max(8).optional(),
	appointmentReminderEnabled: z.boolean().optional(),
	appointmentReminderLeadHours: z
		.array(z.number().min(0.5).max(720))
		.min(1)
		.max(6)
		.optional(),
	appointmentReminderWindowMinutes: z
		.number()
		.int()
		.min(5)
		.max(1440)
		.optional(),
});

export const consentUpdateSchema = z.object({
	entries: z
		.array(
			z.object({
				channel: channelSchema,
				scope: scopeSchema,
				state: z.enum(["granted", "revoked"]),
				source: z.string().trim().min(1).max(64).default("staff"),
				evidence: z.string().trim().max(500).nullable().optional(),
			}),
		)
		.min(1)
		.max(32),
});

/**
 * Условия отбора получателей рассылки. Закрытый набор признаков: «гибкий
 * конструктор запросов» по медицинской базе рано или поздно выгрузит всю
 * картотеку одним условием.
 */
export const audienceCriteriaSchema = z
	.object({
		status: z.enum(["active", "archived"]).optional(),
		lastVisitBefore: z.string().datetime({ offset: true }).optional(),
		lastVisitAfter: z.string().datetime({ offset: true }).optional(),
		neverVisited: z.boolean().optional(),
		hasFutureAppointment: z.boolean().optional(),
		debtAtLeastRub: z.number().int().min(1).max(10_000_000).optional(),
		birthdayWithinDays: z.number().int().min(0).max(365).optional(),
		ageFrom: z.number().int().min(0).max(120).optional(),
		ageTo: z.number().int().min(0).max(120).optional(),
		patientIds: z.array(z.string().uuid()).max(5000).optional(),
	})
	.strict();

export const campaignCreateSchema = z.object({
	title: z.string().trim().min(1).max(200),
	templateId: z.string().uuid(),
	scope: scopeSchema.default("marketing"),
	criteria: audienceCriteriaSchema.default({}),
	clinicId: z.string().uuid().nullable().optional(),
	scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
});

export const dispatchBodySchema = z.object({
	batchSize: z.unknown().optional(),
});

export const outboxQuerySchema = z.object({
	status: outboxStatusSchema.optional(),
	channel: channelSchema.optional(),
	patientId: z.string().uuid().optional(),
	campaignId: z.string().uuid().optional(),
	from: z.string().datetime({ offset: true }).optional(),
	to: z.string().datetime({ offset: true }).optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
	offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

export type Channel = z.infer<typeof channelSchema>;
export type DeliverableChannel = z.infer<typeof deliverableChannelSchema>;
export type Intent = z.infer<typeof intentSchema>;
export type Scope = z.infer<typeof scopeSchema>;
export type OutboxStatus = z.infer<typeof outboxStatusSchema>;
export type TemplateCreateInput = z.infer<typeof templateCreateSchema>;
export type TemplateUpdateInput = z.infer<typeof templateUpdateSchema>;
export type PreviewInput = z.infer<typeof previewSchema>;
export type EnqueueInput = z.infer<typeof enqueueSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
export type ConsentUpdateInput = z.infer<typeof consentUpdateSchema>;
export type AudienceCriteria = z.infer<typeof audienceCriteriaSchema>;
export type CampaignCreateInput = z.infer<typeof campaignCreateSchema>;
export type OutboxQuery = z.infer<typeof outboxQuerySchema>;

export function parseVariables(raw: string): string[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed)
			? parsed.filter((value): value is string => typeof value === "string")
			: [];
	} catch (err) {
		console.error("[Dente] parseVariables failed:", err);
		return [];
	}
}

export function validationError(reply: FastifyReply, problems: string[]) {
	return reply.code(400).send({
		error: "CommunicationValidationError",
		message: problems.join(" "),
		problems,
	});
}
