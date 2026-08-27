/**
 * Recalls API Routes
 *
 * Exposes endpoints for managing preventive recall reminders:
 * - GET  /api/v1/recalls/due: list overdue/upcoming patient recalls
 * - POST /api/v1/recalls/dispatch: triggers batch WhatsApp notification dispatch
 * - POST /api/v1/recalls/snooze: postpones a recall by specified days
 * - POST /api/v1/recalls/book: records booking intent for an overdue recall
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import {
	bookRecall,
	dispatchBatchRecalls,
	dispatchRecallNotification,
	scanDueRecalls,
	snoozeRecall,
} from "../services/recallReminderService.js";

const dispatchBodySchema = z.object({
	recallIds: z.array(z.string()).optional(),
	recallId: z.string().optional(),
});

const snoozeBodySchema = z.object({
	recallId: z.string(),
	days: z.number().int().min(1).max(365).optional().default(30),
});

const bookBodySchema = z.object({
	recallId: z.string(),
	patientId: z.string().optional(),
});

export const registerRecallRoutes: FastifyPluginAsync = async (
	app: FastifyInstance,
) => {
	/**
	 * GET /api/v1/recalls/due — List overdue recalls for current organization
	 */
	app.get(
		"/api/v1/recalls/due",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"read due recalls",
			);
			if (!resolvedOrgId) return;

			const dueRecalls = await scanDueRecalls(resolvedOrgId);

			return reply.send({
				data: dueRecalls,
				total: dueRecalls.length,
			});
		},
	);

	/**
	 * POST /api/v1/recalls/dispatch — Dispatch batch WhatsApp recall reminders
	 */
	app.post(
		"/api/v1/recalls/dispatch",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"dispatch recalls",
			);
			if (!resolvedOrgId) return;

			const parsed = dispatchBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Некорректные параметры отправки напоминаний",
				});
			}

			const recallIds = parsed.data.recallIds ?? (parsed.data.recallId ? [parsed.data.recallId] : undefined);
			const result = await dispatchBatchRecalls(resolvedOrgId, recallIds);

			return reply.send({
				ok: true,
				total: result.total,
				dispatched: result.dispatched,
				failed: result.failed,
				details: result.details,
			});
		},
	);

	/**
	 * POST /api/v1/recalls/snooze — Postpone recall by specified days
	 */
	app.post(
		"/api/v1/recalls/snooze",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"snooze recall",
			);
			if (!resolvedOrgId) return;

			const parsed = snoozeBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Укажите recallId и количество дней отсрочки",
				});
			}

			const result = await snoozeRecall(
				resolvedOrgId,
				parsed.data.recallId,
				parsed.data.days,
			);

			return reply.send({
				ok: true,
				...result,
			});
		},
	);

	/**
	 * POST /api/v1/recalls/book — Record quick booking intent
	 */
	app.post(
		"/api/v1/recalls/book",
		{ config: { tenantTxSelfManaged: true } },
		async (request, reply) => {
			const resolvedOrgId = await requireResolvedOrganizationId(
				request,
				reply,
				"book recall",
			);
			if (!resolvedOrgId) return;

			const parsed = bookBodySchema.safeParse(request.body ?? {});
			if (!parsed.success) {
				return reply.code(400).send({
					error: "ValidationError",
					message: "Укажите recallId",
				});
			}

			const result = await bookRecall(
				resolvedOrgId,
				parsed.data.recallId,
				parsed.data.patientId,
			);

			return reply.send({
				ok: true,
				...result,
			});
		},
	);
};

export default registerRecallRoutes;
