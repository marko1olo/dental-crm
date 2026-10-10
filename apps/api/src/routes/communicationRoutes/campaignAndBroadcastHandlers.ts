/**
 * campaignAndBroadcastHandlers.ts — Layer 2: Message Templates & Service Broadcast Campaigns Handlers.
 *
 * Implements:
 * - 152-FZ / 323-FZ validated template catalogs and safe macro rendering
 * - Mass service broadcasts (reminders, recalls, notifications)
 * - Strict consent filtering according to 152-FZ & 38-FZ (Advertising Law)
 * - Audit logs of consents and opt-outs
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationAccess,
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	communicationEvents,
	patientCommunicationConsents,
	patients,
} from "../../db/schema.js";
import { MessageTemplateEngine } from "../../services/communications/MessageTemplateEngine.js";
import {
	broadcastCampaignSchema,
	createTemplateRouteSchema,
	renderTemplateRouteSchema,
	templateListQuerySchema,
} from "./types.js";

export async function registerCampaignAndBroadcastHandlers(
	app: FastifyInstance,
): Promise<void> {
	// ────────────────────────────────────────────────────────────
	// 152-ФЗ / 323-ФЗ: ШАБЛОНЫ СООБЩЕНИЙ И БЕЗОПАСНЫЙ РЕНДЕРИНГ
	// ────────────────────────────────────────────────────────────

	/**
	 * GET /api/communications/catalogs/templates
	 * Получение каталога шаблонов сообщений клиники
	 */
	app.get("/api/communications/catalogs/templates", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"list communication templates",
			))
		)
			return;

		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"list communication templates",
		);
		if (!organizationId) return;

		const queryParsed = templateListQuerySchema.safeParse(request.query ?? {});
		const query = queryParsed.success ? queryParsed.data : {};
		const isActive =
			query.isActive === "true"
				? true
				: query.isActive === "false"
					? false
					: undefined;

		const templates = await MessageTemplateEngine.listTemplates(
			organizationId,
			{
				channel: query.channel ?? undefined,
				intent: query.intent ?? undefined,
				isActive,
			},
		);

		return reply.send({
			success: true,
			templates,
		});
	});

	/**
	 * POST /api/communications/catalogs/templates
	 * Создание нового шаблона сообщения с валидацией 152-ФЗ / 323-ФЗ ст. 13
	 */
	app.post("/api/communications/catalogs/templates", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"create communication template",
			))
		)
			return;

		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"create communication template",
		);
		if (!organizationId) return;

		const parsed = createTemplateRouteSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры шаблона сообщения.",
				details: parsed.error.format(),
			});
		}

		try {
			const template = await MessageTemplateEngine.createTemplate(
				organizationId,
				{
					title: parsed.data.title,
					channel: parsed.data.channel,
					intent: parsed.data.intent,
					templateText: parsed.data.templateText,
					variables: parsed.data.variables ?? undefined,
					isActive: parsed.data.isActive,
				},
			);
			return reply.code(201).send({
				success: true,
				template,
			});
		} catch (err: any) {
			return reply.code(422).send({
				error: "MedicalSecrecyInTemplateError",
				message: err.message || "Ошибка создания шаблона сообщения",
			});
		}
	});

	/**
	 * POST /api/communications/templates/render
	 * Безопасный рендеринг шаблона с подстановкой макросов и защитой от утечки врачебной тайны
	 */
	app.post("/api/communications/templates/render", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"render communication template",
			))
		)
			return;

		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"render communication template",
		);
		if (!organizationId) return;

		const parsed = renderTemplateRouteSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры для рендеринга шаблона.",
				details: parsed.error.format(),
			});
		}

		const result = await MessageTemplateEngine.render(organizationId, {
			templateId: parsed.data.templateId ?? undefined,
			templateText: parsed.data.templateText ?? undefined,
			channel: parsed.data.channel,
			patientId: parsed.data.patientId ?? undefined,
			appointmentId: parsed.data.appointmentId ?? undefined,
			visitId: parsed.data.visitId ?? undefined,
			variables: parsed.data.variables ?? undefined,
			allowPreviewFallback: parsed.data.allowPreviewFallback,
			violationHandling: parsed.data.violationHandling,
		});

		if (
			result.hasMedicalSecrecyViolation &&
			parsed.data.violationHandling === "block"
		) {
			return reply.code(422).send({
				error: "MedicalSecrecyViolation",
				message: result.error,
				result,
			});
		}

		return reply.send({
			success: true,
			result,
		});
	});

	// ────────────────────────────────────────────────────────────
	// МАССОВЫЕ СЕРВИСНЫЕ РАССЫЛКИ И ПРОВЕРКА СОГЛАСИЙ (152-ФЗ / 38-ФЗ)
	// ────────────────────────────────────────────────────────────

	/**
	 * POST /api/communications/campaigns/broadcast
	 * Массовая отправка сервисных уведомлений с автоматической фильтрацией отозванных согласий
	 */
	app.post("/api/communications/campaigns/broadcast", async (request, reply) => {
		if (
			!(await requireClinicalMutationAccess(
				request,
				reply,
				"communications broadcast campaign",
			))
		)
			return;

		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"communications broadcast campaign",
		);
		if (!organizationId) return;

		const parsed = broadcastCampaignSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры сервисной рассылки.",
				details: parsed.error.issues,
			});
		}

		const {
			templateId,
			templateText,
			channel,
			patientIds,
			respectConsent,
		} = parsed.data;

		// 1. Извлекаем или валидируем текст шаблона
		let rawText = templateText ?? "";
		if (templateId && !rawText) {
			const templates = await MessageTemplateEngine.listTemplates(
				organizationId,
				{ isActive: true },
			);
			const found = templates.find((t) => t.id === templateId);
			if (found) {
				rawText = found.templateText;
			}
		}

		if (!rawText.trim()) {
			return reply.code(400).send({
				error: "TemplateNotFound",
				message: "Текст рассылки не может быть пустым.",
			});
		}

		// 2. Валидация 152-ФЗ / 323-ФЗ ст. 13
		const secrecy = MessageTemplateEngine.detectMedicalSecrecyLeaks(rawText);
		if (secrecy.hasLeak) {
			return reply.code(422).send({
				error: "MedicalSecrecyViolation",
				message: `Массовая рассылка содержит недопустимые клинические сведения: ${secrecy.reasons.join("; ")}`,
				detectedTerms: secrecy.detectedTerms,
			});
		}

		// 3. Выборка пациентов и проверка согласий
		const existingPatients = await db
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
				status: patients.status,
			})
			.from(patients)
			.where(
				and(
					eq(patients.organizationId, organizationId),
					inArray(patients.id, patientIds),
				),
			);

		// Исключаем архивированных пациентов
		const activePatients = existingPatients.filter(
			(p) => p.status !== "archived",
		);

		// Если требуется учет согласий — ищем отозванные согласия
		let allowedPatientIds = activePatients.map((p) => p.id);
		let skippedDueToConsentCount = 0;

		if (respectConsent && allowedPatientIds.length > 0) {
			const revokedConsents = await db
				.select({ patientId: patientCommunicationConsents.patientId })
				.from(patientCommunicationConsents)
				.where(
					and(
						eq(patientCommunicationConsents.organizationId, organizationId),
						inArray(
							patientCommunicationConsents.patientId,
							allowedPatientIds,
						),
						eq(
							patientCommunicationConsents.channel,
							channel as any,
						),
						inArray(patientCommunicationConsents.state, [
							"revoked",
							"opted_out",
						]),
					),
				);

			const revokedSet = new Set(revokedConsents.map((r) => r.patientId));
			const previousCount = allowedPatientIds.length;
			allowedPatientIds = allowedPatientIds.filter((id) => !revokedSet.has(id));
			skippedDueToConsentCount = previousCount - allowedPatientIds.length;
		}

		// 4. Формируем события рассылки
		const eventsToInsert = allowedPatientIds.map((pId) => ({
			organizationId,
			patientId: pId,
			channel: channel as any,
			direction: "outbound" as const,
			status: "queued" as const,
			message: rawText,
		}));

		if (eventsToInsert.length > 0) {
			await db.insert(communicationEvents).values(eventsToInsert);
		}

		return reply.send({
			success: true,
			totalRequested: patientIds.length,
			activeRecipients: activePatients.length,
			dispatchedCount: eventsToInsert.length,
			skippedDueToConsentCount,
			skippedArchivedCount: existingPatients.length - activePatients.length,
		});
	});

	/**
	 * GET /api/communications/campaigns/consents/:patientId
	 * Получение статуса согласий пациента по всем каналам связи
	 */
	app.get(
		"/api/communications/campaigns/consents/:patientId",
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"communications get patient consents",
				))
			)
				return;

			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"communications get patient consents",
			);
			if (!organizationId) return;

			const { patientId } = request.params as { patientId: string };

			const consents = await db
				.select()
				.from(patientCommunicationConsents)
				.where(
					and(
						eq(patientCommunicationConsents.organizationId, organizationId),
						eq(patientCommunicationConsents.patientId, patientId),
					),
				)
				.orderBy(desc(patientCommunicationConsents.decidedAt));

			return reply.send({
				success: true,
				patientId,
				consents,
			});
		},
	);
}
