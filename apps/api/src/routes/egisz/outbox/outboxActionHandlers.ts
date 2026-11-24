/**
 * outboxActionHandlers.ts — Handlers for dispatching, syncing and querying outbox queue.
 * Mandate 8b compliant (<= 120 lines).
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { requireClinicalMutationAccess, requireClinicalReadAccess } from "../../../accessGuard.js";
import { requireOrganizationId } from "../../../security/identity.js";
import { EgiszOutboxDispatcher } from "../../../services/egisz/EgiszOutboxDispatcher.js";

export const outboxHeadersSchema = z
	.object({
		"idempotency-key": z.string().uuid().optional(),
		organizationid: z.string().uuid().optional(),
	})
	.passthrough();

export const outboxDispatchRouteOptions = {
	schema: {
		description: "EGISZ Outbox dispatch queue with optional RFC 9562 Idempotency-Key",
		headers: {
			type: "object",
			properties: {
				"idempotency-key": { type: "string" },
				organizationid: { type: "string" },
			},
		},
	},
};

export async function handleOutboxDispatch(request: FastifyRequest, reply: FastifyReply) {
	const headerValidation = outboxHeadersSchema.safeParse(request.headers);
	if (!headerValidation.success) {
		return reply.status(400).send({
			success: false,
			error: "ValidationError",
			message: "Некорректный формат заголовков (idempotency-key / organizationid).",
			issues: headerValidation.error.issues,
		});
	}

	if (!(await requireClinicalMutationAccess(request, reply, "egisz outbox dispatch"))) return;
	const orgId = requireOrganizationId(request, reply);
	if (!orgId) return;

	const dispatcher = new EgiszOutboxDispatcher();
	const result = await dispatcher.processPendingQueue(orgId);
	return reply.status(200).send({ success: true, ...result });
}

export async function handleOutboxSyncStatus(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalMutationAccess(request, reply, "egisz outbox sync status"))) return;
	const orgId = requireOrganizationId(request, reply);
	if (!orgId) return;

	const dispatcher = new EgiszOutboxDispatcher();
	const updatedCount = await dispatcher.syncPendingStatuses(orgId);
	return reply.status(200).send({ success: true, updatedCount });
}

export async function handleOutboxStatus(request: FastifyRequest, reply: FastifyReply) {
	if (!(await requireClinicalReadAccess(request, reply, "egisz outbox status"))) return;
	const orgId = requireOrganizationId(request, reply);
	if (!orgId) return;

	const dispatcher = new EgiszOutboxDispatcher();
	const status = await dispatcher.getQueueStatus(orgId);
	return reply.status(200).send({ success: true, status });
}
