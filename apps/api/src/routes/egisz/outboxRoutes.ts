import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import * as schema from "../../db/schema.js";
import { requireOrganizationId } from "../../security/identity.js";
import { EgiszOutboxDispatcher } from "../../services/egisz/EgiszOutboxDispatcher.js";

export function registerEgiszOutboxRoutes(app: FastifyInstance): void {
	/**
	 * POST /api/clinical/egisz/outbox/dispatch — обработка очереди отправки СЭМД в РЭМД.
	 */
	app.post(
		"/api/clinical/egisz/outbox/dispatch",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"egisz outbox dispatch",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const dispatcher = new EgiszOutboxDispatcher();
			const result = await dispatcher.processPendingQueue(orgId);

			return reply.status(200).send({
				success: true,
				...result,
			});
		},
	);

	/**
	 * POST /api/clinical/egisz/outbox/sync-status — синхронизация статусов зарегистрированных документов из РЭМД.
	 */
	app.post(
		"/api/clinical/egisz/outbox/sync-status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalMutationAccess(
					request,
					reply,
					"egisz outbox sync status",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const dispatcher = new EgiszOutboxDispatcher();
			const updatedCount = await dispatcher.syncPendingStatuses(orgId);

			return reply.status(200).send({
				success: true,
				updatedCount,
			});
		},
	);

	/**
	 * GET /api/clinical/egisz/outbox/status — мониторинг состояния очереди отправки СЭМД в РЭМД.
	 */
	app.get(
		"/api/clinical/egisz/outbox/status",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"egisz outbox status",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const dispatcher = new EgiszOutboxDispatcher();
			const status = await dispatcher.getQueueStatus(orgId);

			return reply.status(200).send({
				success: true,
				status,
			});
		},
	);

	/**
	 * GET /api/clinical/egisz/outbox — список документов в очереди отправки СЭМД с фильтрацией.
	 */
	app.get(
		"/api/clinical/egisz/outbox",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"egisz outbox list",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const query = (request.query || {}) as {
				status?: string;
				limit?: string;
			};
			const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));

			const conditions = [eq(schema.egiszOutbox.organizationId, orgId)];
			if (query.status) {
				conditions.push(eq(schema.egiszOutbox.status, query.status as any));
			}

			const items = await db
				.select({
					id: schema.egiszOutbox.id,
					visitId: schema.egiszOutbox.visitId,
					patientId: schema.egiszOutbox.patientId,
					doctorId: schema.egiszOutbox.doctorId,
					docTypeNsiCode: schema.egiszOutbox.docTypeNsiCode,
					status: schema.egiszOutbox.status,
					attempts: schema.egiszOutbox.attempts,
					maxAttempts: schema.egiszOutbox.maxAttempts,
					scheduledAt: schema.egiszOutbox.scheduledAt,
					nextAttemptAt: schema.egiszOutbox.nextAttemptAt,
					remdDocumentId: schema.egiszOutbox.remdDocumentId,
					remdTransactionId: schema.egiszOutbox.remdTransactionId,
					lastErrorClass: schema.egiszOutbox.lastErrorClass,
					lastErrorMessage: schema.egiszOutbox.lastErrorMessage,
					doctorCertSubject: schema.egiszOutbox.doctorCertSubject,
					doctorSignedAt: schema.egiszOutbox.doctorSignedAt,
					createdAt: schema.egiszOutbox.createdAt,
					updatedAt: schema.egiszOutbox.updatedAt,
				})
				.from(schema.egiszOutbox)
				.where(and(...conditions))
				.orderBy(desc(schema.egiszOutbox.createdAt))
				.limit(limit);

			return reply.status(200).send({
				success: true,
				items,
			});
		},
	);

	/**
	 * GET /api/clinical/egisz/outbox/:outboxId/receipt — официальная регистрационная квитанция РЭМД по ID пакета.
	 */
	app.get(
		"/api/clinical/egisz/outbox/:outboxId/receipt",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"egisz outbox receipt read",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsedParams = z.object({ outboxId: z.string().uuid() }).safeParse(request.params);
			if (!parsedParams.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Параметр outboxId должен быть валидным UUID.",
				});
			}
			const { outboxId } = parsedParams.data;

			const dispatcher = new EgiszOutboxDispatcher();
			const receipt = await dispatcher.getReceiptByOutboxId(orgId, outboxId);

			if (!receipt) {
				return reply.status(404).send({
					error: "ReceiptNotFound",
					message:
						"Регистрационная квитанция РЭМД не найдена или документ ещё не зарегистрирован в Минздраве.",
				});
			}

			return reply.status(200).send({
				ok: true,
				receipt,
			});
		},
	);

	/**
	 * GET /api/clinical/egisz/visits/:visitId/receipt — официальная регистрационная квитанция РЭМД по ID приёма.
	 */
	app.get(
		"/api/clinical/egisz/visits/:visitId/receipt",
		async (request: FastifyRequest, reply: FastifyReply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"egisz visit receipt read",
				))
			)
				return;
			const orgId = requireOrganizationId(request, reply);
			if (!orgId) return;

			const parsedParams = z.object({ visitId: z.string().uuid() }).safeParse(request.params);
			if (!parsedParams.success) {
				return reply.status(400).send({
					error: "ValidationError",
					message: "Параметр visitId должен быть валидным UUID.",
				});
			}
			const { visitId } = parsedParams.data;

			const dispatcher = new EgiszOutboxDispatcher();
			const receipt = await dispatcher.getReceiptByVisitId(orgId, visitId);

			if (!receipt) {
				return reply.status(404).send({
					error: "ReceiptNotFound",
					message:
						"Регистрационная квитанция РЭМД для указанного приёма не найдена или документ ещё не зарегистрирован в Минздраве.",
				});
			}

			return reply.status(200).send({
				ok: true,
				receipt,
			});
		},
	);
}
