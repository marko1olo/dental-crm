import type { FastifyInstance } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { enforcePermissionWhenStaffKnown } from "../../security/permissions.js";
import { MessageTemplateEngine } from "../../services/communications/MessageTemplateEngine.js";
import { renderTemplate } from "../../services/communications/templateRenderer.js";
import {
	cancelCampaignRecord,
	cancelQueuedMessage,
	createCampaignRecord,
	dispatchOutboxBatch,
	enqueueOutboxMessage,
	getCampaignProgressRecord,
	getGatewayStatusOverview,
	launchCampaignRecord,
	previewCampaignRecord,
	retryQueuedMessage,
	runAppointmentReminders,
} from "./outboxDispatcher.js";
import {
	fetchCampaignsList,
	fetchOutboxJournal,
	fetchTemplateById,
} from "./outboxQueries.js";
import {
	campaignCreateSchema,
	dispatchBodySchema,
	enqueueSchema,
	outboxQuerySchema,
	validationError,
} from "./types.js";

export async function registerOutboxAndCampaignRoutes(app: FastifyInstance) {
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

		return fetchOutboxJournal(context.organizationId, parsed.data);
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
			const template = await fetchTemplateById(
				context.organizationId,
				templateId,
			);
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

		const secrecy = MessageTemplateEngine.detectMedicalSecrecyLeaks(body);
		if (secrecy.hasLeak) {
			return reply.code(422).send({
				error: "MedicalSecrecyViolation",
				message: `Отправка сведений о здоровье, диагнозов или формулы зубов по открытым каналам связи запрещена (152-ФЗ / 323-ФЗ ст. 13): ${secrecy.reasons.join("; ")}`,
				detectedTerms: secrecy.detectedTerms,
			});
		}

		const result = await enqueueOutboxMessage({
			organizationId: context.organizationId,
			patientId: input.patientId ?? null,
			templateId,
			channel: input.channel,
			intent: input.intent,
			scope: input.scope,
			recipientAddress: input.recipientAddress ?? null,
			subject,
			body,
			dedupeKey: input.dedupeKey,
			scheduledAt: input.scheduledAt ?? null,
		});

		if (!result.ok) return validationError(reply, [result.reason]);
		return reply.code(result.duplicate ? 200 : 201).send({
			outboxId: result.outboxId,
			duplicate: result.duplicate,
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

			const cancelled = await cancelQueuedMessage(
				context.organizationId,
				outboxId,
			);
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

			const restored = await retryQueuedMessage(
				context.organizationId,
				outboxId,
			);
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
		const report = await dispatchOutboxBatch(
			context.organizationId,
			Number.isFinite(batchSize) ? batchSize : 25,
		);
		return { report };
	});

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

		const report = await runAppointmentReminders(context.organizationId);
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

		const campaigns = await fetchCampaignsList(context.organizationId);
		return { campaigns };
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

		const result = await createCampaignRecord({
			organizationId: context.organizationId,
			title: parsed.data.title,
			templateId: parsed.data.templateId,
			scope: parsed.data.scope,
			criteria: parsed.data.criteria,
			clinicId: parsed.data.clinicId ?? null,
			scheduledAt: parsed.data.scheduledAt ?? null,
		});
		if (!result.ok) return validationError(reply, [result.reason]);
		return reply.code(201).send({ campaign: result.campaign });
	});

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

			const preview = await previewCampaignRecord(
				context.organizationId,
				campaignId,
			);
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

			const result = await launchCampaignRecord(
				context.organizationId,
				campaignId,
			);
			if (!result.ok) return validationError(reply, [result.reason]);
			return {
				queued: result.queued,
				alreadyQueued: result.alreadyQueued,
				skipped: result.skipped,
				matched: result.matched,
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

			const result = await cancelCampaignRecord(
				context.organizationId,
				campaignId,
			);
			if (!result.ok) {
				return reply.code(404).send({
					error: "CampaignNotFound",
					message: "Рассылка не найдена в этой клинике.",
				});
			}
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

			const progress = await getCampaignProgressRecord(
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

	app.get("/api/communications/gateway-status", async (request, reply) => {
		const context = await requireClinicalReadContext(
			request,
			reply,
			"communication gateway status",
		);
		if (!context) return;
		if (!enforcePermissionWhenStaffKnown(request, reply, "communications.read"))
			return;

		return getGatewayStatusOverview(context.organizationId);
	});
}
