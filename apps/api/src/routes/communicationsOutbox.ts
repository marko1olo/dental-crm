/**
 * Маршруты работы с сообщениями пациентам: справочник шаблонов, очередь
 * отправки, согласия, настройки рассылки и состояние шлюзов.
 *
 * ЗАЧЕМ ЭТОТ ФАЙЛ ПОЯВИЛСЯ
 * routes/communications.ts состоял из одного обработчика — «закрыть задачу
 * связи». Всё остальное отсутствовало: справочник шаблонов не читался и не
 * редактировался (таблица communication_templates существовала с нулевой
 * ревизии и никем не использовалась), очереди отправки не было, журнала
 * рассылок не было, согласий не было, состояние шлюзов посмотреть было негде.
 * Администратор не мог ни отправить сообщение, ни узнать, почему оно не ушло.
 */

import { and, desc, eq, gte, inArray, lte, type SQL, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyReply } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { communicationCampaigns } from "../db/communicationsSchema.js";
import {
	communicationOutbox,
	communicationSettings,
	communicationTemplates,
	patientCommunicationConsents,
	patients,
} from "../db/schema.js";
import { readSmtpCredentialsFromEnv } from "../emailTransport.js";
import { enforcePermissionWhenStaffKnown } from "../security/permissions.js";
import { scheduleAppointmentReminders } from "../services/communications/appointmentReminders.js";
import {
	campaignProgress,
	cancelCampaign,
	createCampaign,
	launchCampaign,
	parseAudienceCriteria,
	previewCampaign,
} from "../services/communications/campaigns.js";
import {
	type CommunicationChannelCode,
	MACHINE_DELIVERABLE_CHANNELS,
	resolveChannelCredentials,
} from "../services/communications/channelRouter.js";
import {
	DEFAULT_COMMUNICATION_SETTINGS,
	dispatchDueMessages,
	enqueueMessage,
	resolveCommunicationSettings,
} from "../services/communications/dispatcher.js";
import { describeAutomaticSending } from "../services/communications/dispatchWorker.js";
import {
	checkChannelFit,
	communicationTemplateVariables,
	renderTemplate,
	validateTemplateBody,
} from "../services/communications/templateRenderer.js";
import { fetchSmsBalance, readSmsCredentialsFromEnv } from "../smsTransport.js";

const channelSchema = z.enum([
	"phone",
	"sms",
	"whatsapp",
	"telegram",
	"email",
	"in_person",
	"vk",
	"max",
]);
const deliverableChannelSchema = z.enum([
	"sms",
	"whatsapp",
	"telegram",
	"email",
]);
const intentSchema = z.enum([
	"appointment_confirmation",
	"payment_reminder",
	"post_visit_instruction",
	"recall",
	"document_ready",
	"imaging_review",
	"general",
]);
const scopeSchema = z.enum(["service", "marketing"]);
const outboxStatusSchema = z.enum([
	"queued",
	"sending",
	"sent",
	"delivered",
	"failed",
	"cancelled",
	"suppressed",
]);

const templateCreateSchema = z.object({
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

const templateUpdateSchema = templateCreateSchema.partial().extend({
	allowPhi: z.boolean().default(false),
});

const previewSchema = z.object({
	body: z.string().min(1).max(20_000),
	channel: channelSchema.default("sms"),
	values: z.record(z.union([z.string(), z.number()])).default({}),
	allowPhi: z.boolean().default(false),
});

const enqueueSchema = z.object({
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

const settingsSchema = z.object({
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

const consentUpdateSchema = z.object({
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
const audienceCriteriaSchema = z
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

const campaignCreateSchema = z.object({
	title: z.string().trim().min(1).max(200),
	templateId: z.string().uuid(),
	scope: scopeSchema.default("marketing"),
	criteria: audienceCriteriaSchema.default({}),
	clinicId: z.string().uuid().nullable().optional(),
	scheduledAt: z.string().datetime({ offset: true }).nullable().optional(),
});

const dispatchBodySchema = z.object({
	batchSize: z.unknown().optional(),
});

const outboxQuerySchema = z.object({
	status: outboxStatusSchema.optional(),
	channel: channelSchema.optional(),
	patientId: z.string().uuid().optional(),
	campaignId: z.string().uuid().optional(),
	from: z.string().datetime({ offset: true }).optional(),
	to: z.string().datetime({ offset: true }).optional(),
	limit: z.coerce.number().int().min(1).max(200).default(50),
	offset: z.coerce.number().int().min(0).max(100_000).default(0),
});

function parseVariables(raw: string): string[] {
	try {
		const parsed: unknown = JSON.parse(raw);
		return Array.isArray(parsed)
			? parsed.filter((value): value is string => typeof value === "string")
			: [];
	} catch {
		return [];
	}
}

function validationError(reply: FastifyReply, problems: string[]) {
	return reply.code(400).send({
		error: "CommunicationValidationError",
		message: problems.join(" "),
		problems,
	});
}

export async function registerCommunicationOutboxRoutes(app: FastifyInstance) {
	// ─── Справочник переменных ────────────────────────────────────────────────

	app.get("/api/communications/variables", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication variables",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;
		return { variables: communicationTemplateVariables };
	});

	// ─── Шаблоны ──────────────────────────────────────────────────────────────

	app.get("/api/communications/templates", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication templates",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;

		const rows = await db
			.select()
			.from(communicationTemplates)
			.where(eq(communicationTemplates.organizationId, context.organizationId));

		return {
			templates: rows.map((row) => ({
				id: row.id,
				organizationId: row.organizationId,
				clinicId: row.clinicId,
				title: row.title,
				channel: row.channel,
				intent: row.intent,
				audienceRole: row.audienceRole,
				body: row.body,
				variables: parseVariables(row.variablesJson),
				isActive: row.isActive,
			})),
		};
	});

	app.post("/api/communications/templates", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"communication template create",
		);
		if (!context) return;
		if (
			!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
		)
			return;

		const parsed = templateCreateSchema.safeParse(request.body);
		if (!parsed.success) {
			return validationError(reply, [
				"Проверьте название, канал, назначение и текст шаблона.",
			]);
		}

		// Опечатку в имени переменной должен ловить редактор, а не пациент.
		const validation = validateTemplateBody(parsed.data.body, {
			allowPhi: parsed.data.allowPhi,
		});
		if (!validation.ok) return validationError(reply, validation.problems);

		const fit = checkChannelFit(parsed.data.channel, parsed.data.body);
		if (!fit.ok) return validationError(reply, fit.problems);

		const [created] = await db
			.insert(communicationTemplates)
			.values({
				organizationId: context.organizationId,
				clinicId: parsed.data.clinicId ?? null,
				title: parsed.data.title,
				channel: parsed.data.channel,
				intent: parsed.data.intent,
				audienceRole: parsed.data.audienceRole,
				body: parsed.data.body,
				variablesJson: JSON.stringify(validation.variables),
				isActive: parsed.data.isActive,
			})
			.returning();

		return reply.code(201).send({ template: created, sms: fit.sms });
	});

	app.patch(
		"/api/communications/templates/:templateId",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"communication template update",
			);
			if (!context) return;
			if (
				!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
			)
				return;

			const templateId = (request.params as { templateId?: string }).templateId;
			if (!templateId) return validationError(reply, ["Не указан шаблон."]);

			const parsed = templateUpdateSchema.safeParse(request.body);
			if (!parsed.success)
				return validationError(reply, ["Проверьте изменяемые поля шаблона."]);

			const [existing] = await db
				.select()
				.from(communicationTemplates)
				.where(
					and(
						eq(communicationTemplates.id, templateId),
						eq(communicationTemplates.organizationId, context.organizationId),
					),
				)
				.limit(1);
			if (!existing) {
				return reply.code(404).send({
					error: "TemplateNotFound",
					message: "Шаблон не найден в этой клинике.",
				});
			}

			const nextBody = parsed.data.body ?? existing.body;
			const nextChannel = parsed.data.channel ?? existing.channel;
			const validation = validateTemplateBody(nextBody, {
				allowPhi: parsed.data.allowPhi,
			});
			if (!validation.ok) return validationError(reply, validation.problems);
			const fit = checkChannelFit(nextChannel, nextBody);
			if (!fit.ok) return validationError(reply, fit.problems);

			// БЫЛО: SELECT с organizationId, UPDATE только по id; пустой RETURNING
			// уходил в ответ как template: undefined. СТАЛО: and(id, org) + 404.
			const [updated] = await db
				.update(communicationTemplates)
				.set({
					title: parsed.data.title ?? existing.title,
					channel: nextChannel,
					intent: parsed.data.intent ?? existing.intent,
					audienceRole: parsed.data.audienceRole ?? existing.audienceRole,
					body: nextBody,
					variablesJson: JSON.stringify(validation.variables),
					isActive: parsed.data.isActive ?? existing.isActive,
					clinicId:
						parsed.data.clinicId === undefined
							? existing.clinicId
							: parsed.data.clinicId,
				})
				.where(
					and(
						eq(communicationTemplates.id, templateId),
						eq(communicationTemplates.organizationId, context.organizationId),
					),
				)
				.returning();

			if (!updated) {
				return reply.code(404).send({
					error: "TemplateNotFound",
					message: "Шаблон не найден в этой клинике.",
				});
			}

			return { template: updated, sms: fit.sms };
		},
	);

	app.post("/api/communications/templates/preview", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication template preview",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;

		const parsed = previewSchema.safeParse(request.body);
		if (!parsed.success)
			return validationError(reply, [
				"Проверьте текст шаблона и значения переменных.",
			]);

		// В предпросмотре пустые значения заменяются примерами из справочника:
		// администратор должен увидеть готовый вид, а не «{patient}».
		const rendered = renderTemplate(parsed.data.body, parsed.data.values, {
			allowPhi: parsed.data.allowPhi,
			allowEmptyValues: true,
		});
		if (!rendered.ok) {
			return reply.code(400).send({
				error: "TemplateRenderError",
				message: rendered.problems.join(" "),
				problems: rendered.problems,
				unknownVariables: rendered.unknownVariables,
			});
		}

		const fit = checkChannelFit(parsed.data.channel, rendered.text);
		return {
			text: rendered.text,
			usedVariables: rendered.usedVariables,
			channel: parsed.data.channel,
			fits: fit.ok,
			problems: fit.problems,
			length: fit.length,
			limit: fit.limit,
			sms: fit.sms,
		};
	});

	// ─── Настройки рассылки ───────────────────────────────────────────────────

	app.get("/api/communications/settings", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication settings",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;
		return {
			settings: await resolveCommunicationSettings(context.organizationId),
		};
	});

	app.put("/api/communications/settings", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"communication settings update",
		);
		if (!context) return;
		if (
			!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
		)
			return;

		const parsed = settingsSchema.safeParse(request.body);
		if (!parsed.success)
			return validationError(reply, ["Проверьте значения настроек рассылки."]);

		const current = await resolveCommunicationSettings(context.organizationId);
		const next = {
			timezone: parsed.data.timezone ?? current.timezone,
			quietHoursStartMinute:
				parsed.data.quietHoursStartMinute ?? current.quietHoursStartMinute,
			quietHoursEndMinute:
				parsed.data.quietHoursEndMinute ?? current.quietHoursEndMinute,
			deferServiceInQuietHours:
				parsed.data.deferServiceInQuietHours ??
				current.deferServiceInQuietHours,
			blockMarketingInQuietHours:
				parsed.data.blockMarketingInQuietHours ??
				current.blockMarketingInQuietHours,
			dailyLimitPerPatient:
				parsed.data.dailyLimitPerPatient ?? current.dailyLimitPerPatient,
			maxAttempts: parsed.data.maxAttempts ?? current.maxAttempts,
			retryBaseSeconds:
				parsed.data.retryBaseSeconds ?? current.retryBaseSeconds,
			retryMaxSeconds: parsed.data.retryMaxSeconds ?? current.retryMaxSeconds,
			channelFallbackJson: JSON.stringify(
				parsed.data.channelFallback ?? current.channelFallback,
			),
			appointmentReminderEnabled:
				parsed.data.appointmentReminderEnabled ??
				current.appointmentReminderEnabled,
			appointmentReminderLeadHoursJson: JSON.stringify(
				parsed.data.appointmentReminderLeadHours ??
					current.appointmentReminderLeadHours,
			),
			appointmentReminderWindowMinutes:
				parsed.data.appointmentReminderWindowMinutes ??
				current.appointmentReminderWindowMinutes,
		};

		if (next.retryMaxSeconds < next.retryBaseSeconds) {
			return validationError(reply, [
				"Потолок паузы между попытками меньше её начального значения.",
			]);
		}

		// Включить напоминания без шаблона — значит завести автоматику, которая
		// ничего не отправит и промолчит об этом. Отказываем сразу и объясняем.
		if (
			next.appointmentReminderEnabled &&
			!current.appointmentReminderEnabled
		) {
			const [reminderTemplate] = await db
				.select({ id: communicationTemplates.id })
				.from(communicationTemplates)
				.where(
					and(
						eq(communicationTemplates.organizationId, context.organizationId),
						eq(communicationTemplates.intent, "appointment_confirmation"),
						eq(communicationTemplates.isActive, true),
					),
				)
				.limit(1);
			if (!reminderTemplate) {
				return validationError(reply, [
					"Нет активного шаблона с назначением «Подтверждение приёма» — напоминания отправлять нечем.",
					"Создайте шаблон для нужного канала и включите напоминания снова.",
				]);
			}
		}

		await db
			.insert(communicationSettings)
			.values({ organizationId: context.organizationId, ...next })
			.onConflictDoUpdate({
				target: communicationSettings.organizationId,
				set: { ...next, updatedAt: new Date() },
			});

		return {
			settings: await resolveCommunicationSettings(context.organizationId),
		};
	});

	// ─── Согласия пациента ────────────────────────────────────────────────────

	app.get("/api/communications/consents/:patientId", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication consents",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;

		const patientId = (request.params as { patientId?: string }).patientId;
		if (!patientId) return validationError(reply, ["Не указан пациент."]);

		const rows = await db
			.select()
			.from(patientCommunicationConsents)
			.where(
				and(
					eq(
						patientCommunicationConsents.organizationId,
						context.organizationId,
					),
					eq(patientCommunicationConsents.patientId, patientId),
				),
			);

		return {
			patientId,
			// Явных записей может не быть: сервисные сообщения допустимы в рамках
			// договора, рекламные — нет. Умолчания показываются интерфейсу здесь.
			defaults: { service: "granted", marketing: "revoked" },
			consents: rows.map((row) => ({
				channel: row.channel,
				scope: row.scope,
				state: row.state,
				source: row.source,
				evidence: row.evidence,
				decidedAt: row.decidedAt,
			})),
		};
	});

	app.put("/api/communications/consents/:patientId", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"communication consents update",
		);
		if (!context) return;
		if (
			!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
		)
			return;

		const patientId = (request.params as { patientId?: string }).patientId;
		if (!patientId) return validationError(reply, ["Не указан пациент."]);

		const parsed = consentUpdateSchema.safeParse(request.body);
		if (!parsed.success)
			return validationError(reply, ["Проверьте список согласий."]);

		const [patient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(
				and(
					eq(patients.id, patientId),
					eq(patients.organizationId, context.organizationId),
				),
			)
			.limit(1);
		if (!patient) {
			return reply.code(404).send({
				error: "PatientNotFound",
				message: "Пациент не найден в этой клинике.",
			});
		}

		const now = new Date();
		for (const entry of parsed.data.entries) {
			await db
				.insert(patientCommunicationConsents)
				.values({
					organizationId: context.organizationId,
					patientId,
					channel: entry.channel,
					scope: entry.scope,
					state: entry.state,
					source: entry.source,
					evidence: entry.evidence ?? null,
					decidedAt: now,
				})
				.onConflictDoUpdate({
					target: [
						patientCommunicationConsents.organizationId,
						patientCommunicationConsents.patientId,
						patientCommunicationConsents.channel,
						patientCommunicationConsents.scope,
					],
					set: {
						state: entry.state,
						source: entry.source,
						evidence: entry.evidence ?? null,
						decidedAt: now,
						updatedAt: now,
					},
				});
		}

		return { ok: true, updated: parsed.data.entries.length };
	});

	// ─── Очередь и журнал ─────────────────────────────────────────────────────

	app.get("/api/communications/outbox", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication outbox",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;

		const parsed = outboxQuerySchema.safeParse(request.query);
		if (!parsed.success)
			return validationError(reply, ["Проверьте параметры фильтра журнала."]);

		const filters: SQL[] = [
			eq(communicationOutbox.organizationId, context.organizationId),
		];
		if (parsed.data.status)
			filters.push(eq(communicationOutbox.status, parsed.data.status));
		if (parsed.data.channel)
			filters.push(eq(communicationOutbox.channel, parsed.data.channel));
		if (parsed.data.patientId)
			filters.push(eq(communicationOutbox.patientId, parsed.data.patientId));
		if (parsed.data.campaignId)
			filters.push(eq(communicationOutbox.campaignId, parsed.data.campaignId));
		if (parsed.data.from)
			filters.push(
				gte(communicationOutbox.createdAt, new Date(parsed.data.from)),
			);
		if (parsed.data.to)
			filters.push(
				lte(communicationOutbox.createdAt, new Date(parsed.data.to)),
			);

		const where = and(...filters);

		const [rows, summary] = await Promise.all([
			db
				.select()
				.from(communicationOutbox)
				.where(where)
				.orderBy(desc(communicationOutbox.createdAt))
				.limit(parsed.data.limit)
				.offset(parsed.data.offset),
			db
				.select({
					status: communicationOutbox.status,
					total: sql<number>`count(*)::int`,
				})
				.from(communicationOutbox)
				.where(eq(communicationOutbox.organizationId, context.organizationId))
				.groupBy(communicationOutbox.status),
		]);

		return {
			items: rows,
			// Сводка по всей организации, а не по странице: администратору нужно
			// видеть, сколько всего не ушло, а не сколько не ушло на этом экране.
			summary: Object.fromEntries(
				summary.map((row) => [row.status, Number(row.total)]),
			),
			limit: parsed.data.limit,
			offset: parsed.data.offset,
		};
	});

	app.post("/api/communications/outbox", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"communication outbox enqueue",
		);
		if (!context) return;
		if (
			!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
		)
			return;

		const parsed = enqueueSchema.safeParse(request.body);
		if (!parsed.success)
			return validationError(reply, [
				"Проверьте получателя, канал и текст сообщения.",
			]);
		const input = parsed.data;

		let body = input.body?.trim() ?? "";
		const templateId: string | null = input.templateId ?? null;
		let subject = input.subject?.trim() || null;

		if (templateId) {
			const [template] = await db
				.select()
				.from(communicationTemplates)
				.where(
					and(
						eq(communicationTemplates.id, templateId),
						eq(communicationTemplates.organizationId, context.organizationId),
					),
				)
				.limit(1);
			if (!template) {
				return reply.code(404).send({
					error: "TemplateNotFound",
					message: "Шаблон не найден в этой клинике.",
				});
			}
			if (!template.isActive) {
				return validationError(reply, [
					"Шаблон отключён и не может использоваться для отправки.",
				]);
			}

			// Отправка по шаблону идёт строго: незаполненная переменная
			// останавливает отправку, а не подставляет пустоту.
			const rendered = renderTemplate(template.body, input.values, {
				allowPhi: true,
			});
			if (!rendered.ok) {
				return reply.code(400).send({
					error: "TemplateRenderError",
					message: rendered.problems.join(" "),
					problems: rendered.problems,
					missingVariables: rendered.missingVariables,
				});
			}
			body = rendered.text;
			if (!subject) subject = template.title;
		}

		if (!body)
			return validationError(reply, [
				"Нужен либо шаблон, либо готовый текст сообщения.",
			]);

		const dedupeKey =
			input.dedupeKey ??
			`manual:${input.patientId ?? input.recipientAddress ?? "anon"}:${input.channel}:${input.intent}:${Date.now()}`;

		const result = await enqueueMessage({
			organizationId: context.organizationId,
			patientId: input.patientId ?? null,
			templateId,
			channel: input.channel as CommunicationChannelCode,
			intent: input.intent,
			scope: input.scope,
			recipientAddress: input.recipientAddress ?? null,
			subject,
			body,
			dedupeKey,
			scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
		});

		if (!result.ok) return validationError(reply, [result.reason]);
		return reply.code(result.duplicate ? 200 : 201).send({
			outboxId: result.outboxId,
			duplicate: result.duplicate,
			// Повторное нажатие кнопки не отправляет второе сообщение — и об
			// этом честно сообщается, а не молча возвращается «создано».
			message: result.duplicate
				? "Такое сообщение уже стоит в очереди."
				: "Сообщение поставлено в очередь.",
		});
	});

	app.post(
		"/api/communications/outbox/:outboxId/cancel",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"communication outbox cancel",
			);
			if (!context) return;
			if (
				!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
			)
				return;

			const outboxId = (request.params as { outboxId?: string }).outboxId;
			if (!outboxId) return validationError(reply, ["Не указано сообщение."]);

			// Отменить можно только то, что ещё не ушло: у отправленного отменять
			// нечего, и подменять его статус было бы враньём в журнале.
			const [cancelled] = await db
				.update(communicationOutbox)
				.set({
					status: "cancelled",
					lockedAt: null,
					lockedBy: null,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(communicationOutbox.id, outboxId),
						eq(communicationOutbox.organizationId, context.organizationId),
						inArray(communicationOutbox.status, ["queued", "sending"]),
					),
				)
				.returning({ id: communicationOutbox.id });

			if (!cancelled) {
				return reply.code(409).send({
					error: "OutboxNotCancellable",
					message: "Сообщение не найдено или уже отправлено — отменять нечего.",
				});
			}
			return { ok: true, outboxId: cancelled.id };
		},
	);

	app.post(
		"/api/communications/outbox/:outboxId/retry",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"communication outbox retry",
			);
			if (!context) return;
			if (
				!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
			)
				return;

			const outboxId = (request.params as { outboxId?: string }).outboxId;
			if (!outboxId) return validationError(reply, ["Не указано сообщение."]);

			const now = new Date();
			const [restored] = await db
				.update(communicationOutbox)
				.set({
					status: "queued",
					attempts: 0,
					nextAttemptAt: now,
					lockedAt: null,
					lockedBy: null,
					updatedAt: now,
				})
				.where(
					and(
						eq(communicationOutbox.id, outboxId),
						eq(communicationOutbox.organizationId, context.organizationId),
						inArray(communicationOutbox.status, [
							"failed",
							"cancelled",
							"suppressed",
						]),
					),
				)
				.returning({ id: communicationOutbox.id });

			if (!restored) {
				return reply.code(409).send({
					error: "OutboxNotRetryable",
					message:
						"Повторить можно только неудачное, отменённое или задержанное сообщение.",
				});
			}
			return { ok: true, outboxId: restored.id };
		},
	);

	/**
	 * Ручной прогон очереди. Нужен там, где фоновый обработчик выключен
	 * (машина разработчика, разовая отправка после настройки шлюза).
	 */
	app.post("/api/communications/outbox/dispatch", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"communication outbox dispatch",
		);
		if (!context) return;
		if (
			!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
		)
			return;

		const parsedBody = dispatchBodySchema.safeParse(request.body ?? {});
		const rawBatch = parsedBody.success ? parsedBody.data.batchSize : undefined;
		const batchSize = Number.parseInt(String(rawBatch ?? "25"), 10);
		const report = await dispatchDueMessages({
			// Только своя организация: администратор одной клиники не разбирает
			// очередь соседней, даже если процесс сервера общий.
			organizationId: context.organizationId,
			batchSize: Number.isFinite(batchSize) ? batchSize : 25,
			workerId: `manual:${context.organizationId}`,
		});
		return { report };
	});

	/**
	 * Ручная постановка напоминаний. Нужна для проверки настройки: администратор
	 * включил напоминания и хочет увидеть результат сейчас, а не через сутки.
	 */
	app.post("/api/communications/reminders/run", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"communication reminders run",
		);
		if (!context) return;
		if (
			!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
		)
			return;

		const report = await scheduleAppointmentReminders({
			organizationId: context.organizationId,
		});
		return { report };
	});

	// ─── Рассылки ─────────────────────────────────────────────────────────────

	app.get("/api/communications/campaigns", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication campaigns",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;

		const rows = await db
			.select()
			.from(communicationCampaigns)
			.where(eq(communicationCampaigns.organizationId, context.organizationId))
			.orderBy(desc(communicationCampaigns.createdAt))
			.limit(100);

		return {
			campaigns: rows.map((row) => ({
				id: row.id,
				title: row.title,
				channel: row.channel,
				scope: row.scope,
				status: row.status,
				templateId: row.templateId,
				criteria: parseAudienceCriteria(row.audienceJson),
				scheduledAt: row.scheduledAt,
				launchedAt: row.launchedAt,
				completedAt: row.completedAt,
				createdAt: row.createdAt,
			})),
		};
	});

	app.post("/api/communications/campaigns", async (request, reply) => {
		const context = await requireClinicalMutationContext(
			request,
			reply,
			"communication campaign create",
		);
		if (!context) return;
		if (
			!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
		)
			return;

		const parsed = campaignCreateSchema.safeParse(request.body);
		if (!parsed.success) {
			return validationError(reply, [
				"Проверьте название, шаблон и условия отбора получателей.",
			]);
		}
		if (
			parsed.data.criteria.ageFrom !== undefined &&
			parsed.data.criteria.ageTo !== undefined &&
			parsed.data.criteria.ageFrom > parsed.data.criteria.ageTo
		) {
			return validationError(reply, ["Возраст «от» больше возраста «до»."]);
		}

		const result = await createCampaign({
			organizationId: context.organizationId,
			title: parsed.data.title,
			templateId: parsed.data.templateId,
			scope: parsed.data.scope,
			criteria: parsed.data.criteria,
			clinicId: parsed.data.clinicId ?? null,
			scheduledAt: parsed.data.scheduledAt
				? new Date(parsed.data.scheduledAt)
				: null,
		});
		if (!result.ok) return validationError(reply, [result.reason]);
		return reply.code(201).send({ campaign: result.campaign });
	});

	/**
	 * Предпросмотр перед запуском: сколько подошло, сколько получит, во сколько
	 * это встанет и как будет выглядеть текст. Рассылка не должна уходить
	 * вслепую — иначе «отправлено 12 из 400» выясняется уже после отправки.
	 */
	app.get(
		"/api/communications/campaigns/:campaignId/preview",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"communication campaign preview",
			);
			if (!context) return;
			if (
				!enforcePermissionWhenStaffKnown(request, reply, "communications.read")
			)
				return;

			const campaignId = (request.params as { campaignId?: string }).campaignId;
			if (!campaignId) return validationError(reply, ["Не указана рассылка."]);

			const preview = await previewCampaign(context.organizationId, campaignId);
			if (!preview) {
				return reply.code(404).send({
					error: "CampaignNotFound",
					message: "Рассылка не найдена в этой клинике.",
				});
			}
			return preview;
		},
	);

	app.post(
		"/api/communications/campaigns/:campaignId/launch",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"communication campaign launch",
			);
			if (!context) return;
			if (
				!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
			)
				return;

			const campaignId = (request.params as { campaignId?: string }).campaignId;
			if (!campaignId) return validationError(reply, ["Не указана рассылка."]);

			const result = await launchCampaign({
				organizationId: context.organizationId,
				campaignId,
			});
			if (!result.ok) return validationError(reply, [result.reason]);
			return {
				queued: result.queued,
				alreadyQueued: result.alreadyQueued,
				skipped: result.skipped,
				matched: result.matched,
				// Рассылка идёт через ту же очередь: тихие часы и суточный предел
				// действуют и здесь, поэтому «поставлено» не равно «уже ушло».
				message: `Поставлено в очередь: ${result.queued}. Уже стояли: ${result.alreadyQueued}.`,
			};
		},
	);

	app.post(
		"/api/communications/campaigns/:campaignId/cancel",
		async (request, reply) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"communication campaign cancel",
			);
			if (!context) return;
			if (
				!enforcePermissionWhenStaffKnown(request, reply, "communications.write")
			)
				return;

			const campaignId = (request.params as { campaignId?: string }).campaignId;
			if (!campaignId) return validationError(reply, ["Не указана рассылка."]);

			const result = await cancelCampaign(context.organizationId, campaignId);
			if (!result.ok) {
				return reply.code(404).send({
					error: "CampaignNotFound",
					message: "Рассылка не найдена в этой клинике.",
				});
			}
			// Уже отправленное не трогается: в журнале оно должно остаться как есть.
			return { ok: true, cancelledMessages: result.cancelledMessages };
		},
	);

	app.get(
		"/api/communications/campaigns/:campaignId/progress",
		async (request, reply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"communication campaign progress",
			);
			if (!context) return;
			if (
				!enforcePermissionWhenStaffKnown(request, reply, "communications.read")
			)
				return;

			const campaignId = (request.params as { campaignId?: string }).campaignId;
			if (!campaignId) return validationError(reply, ["Не указана рассылка."]);

			const progress = await campaignProgress(
				context.organizationId,
				campaignId,
			);
			if (!progress) {
				return reply.code(404).send({
					error: "CampaignNotFound",
					message: "Рассылка не найдена в этой клинике.",
				});
			}
			return progress;
		},
	);

	// ─── Состояние шлюзов ─────────────────────────────────────────────────────

	/**
	 * Что настроено, а что нет — одним ответом. Без этого экрана «не отправилось»
	 * выясняется только по журналу постфактум.
	 */
	/**
	 * Сколько сообщений ждёт отправки и с какого времени.
	 *
	 * Считается по времени, когда сообщение уже ДОЛЖНО было уйти: строка,
	 * запланированная на завтра, не «застряла». Возраст самой старой такой
	 * строки — это и есть ответ на вопрос «давно ли всё стоит».
	 */
	async function queueBacklog(
		organizationId: string,
	): Promise<{ waiting: number; oldestWaitingAt: Date | null }> {
		const now = new Date();
		const [row] = await db
			.select({
				waiting: sql<number>`count(*)::int`,
				oldest: sql<Date | null>`min(${communicationOutbox.scheduledAt})`,
			})
			.from(communicationOutbox)
			.where(
				and(
					eq(communicationOutbox.organizationId, organizationId),
					// Только «queued»: в перечислении очереди статуса «scheduled» нет,
					// отложенные строки остаются queued с будущим scheduled_at.
					eq(communicationOutbox.status, "queued"),
					lte(communicationOutbox.scheduledAt, now),
				),
			);

		return {
			waiting: Number(row?.waiting ?? 0),
			oldestWaitingAt: row?.oldest ?? null,
		};
	}

	app.get("/api/communications/gateway-status", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication gateway status",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;

		const credentials = await resolveChannelCredentials(context.organizationId);
		const smsCredentials = readSmsCredentialsFromEnv();
		const smtpCredentials = readSmtpCredentialsFromEnv();

		// Остаток запрашивается у шлюза только когда он действительно настроен:
		// иначе на каждый вход в раздел уходил бы бессмысленный внешний запрос.
		const smsBalance = smsCredentials
			? await fetchSmsBalance(smsCredentials)
			: null;

		return {
			channels: {
				sms: {
					configured: smsCredentials !== null,
					provider: smsCredentials?.provider ?? null,
					sender: smsCredentials?.sender ?? null,
					balance: smsBalance?.ok
						? { amount: smsBalance.balanceRub, currency: smsBalance.currency }
						: null,
					balanceError:
						smsBalance && !smsBalance.ok ? smsBalance.errorMessage : null,
				},
				email: {
					configured: smtpCredentials !== null,
					host: smtpCredentials?.host ?? null,
					from: smtpCredentials?.fromAddress ?? null,
					requireTls: smtpCredentials?.requireTls ?? true,
				},
				whatsapp: { configured: credentials.whatsapp !== null },
				telegram: { configured: credentials.telegramBotToken !== null },
				// MAX отправляет с тех пор, как появился maxTransport; признак берётся
				// из тех же учётных данных, что и сама отправка, а не пишется руками —
				// иначе экран однажды разойдётся с поведением, как разошёлся здесь.
				max: {
					configured: credentials.maxBotToken !== null,
					detail:
						credentials.maxBotToken !== null
							? "Бот подключён. Первым написать нельзя: диалог начинает пациент."
							: "Бот MAX не подключён: нет токена или интеграция выключена.",
				},
				vk: {
					configured: false,
					detail: "Отправка во ВКонтакте не подключена: нет ключа сообщества.",
				},
			},
			/*
			 * Работает ли автоматическая отправка и сколько сообщений ждёт. Без
			 * этого экран показывал наполняющуюся очередь и ни одного признака
			 * того, что её никто не разбирает.
			 */
			automaticSending: {
				...describeAutomaticSending(),
				...(await queueBacklog(context.organizationId)),
			},
			deliverableChannels: MACHINE_DELIVERABLE_CHANNELS,
			defaults: DEFAULT_COMMUNICATION_SETTINGS,
		};
	});
}

export default registerCommunicationOutboxRoutes;
