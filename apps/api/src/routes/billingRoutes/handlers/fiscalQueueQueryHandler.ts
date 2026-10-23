import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { fiscalReceiptQueue } from "../../../db/schema.js";
import { fiscalQueueQuerySchema } from "../types.js";

export async function handleGetFiscalQueuePending(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (
		!(await requireClinicalReadAccess(
			request,
			reply,
			"billing fiscal queue read",
		))
	) {
		if (reply.sent) return reply;
		return reply;
	}
	const orgId = await requireResolvedOrganizationId(
		request,
		reply,
		"billing fiscal queue read",
	);
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const parsedQuery = fiscalQueueQuerySchema.safeParse(request.query);
	const requestedStatus = parsedQuery.success
		? parsedQuery.data.status
		: undefined;
	const limit = parsedQuery.success ? parsedQuery.data.limit : 50;

	const statusFilter =
		requestedStatus === "all"
			? undefined
			: requestedStatus
				? eq(fiscalReceiptQueue.status, requestedStatus)
				: inArray(fiscalReceiptQueue.status, [
						"pending_print",
						"hardware_offline",
					]);

	const conditions = [eq(fiscalReceiptQueue.organizationId, orgId)];
	if (statusFilter) {
		conditions.push(statusFilter);
	}

	const items = await db
		.select()
		.from(fiscalReceiptQueue)
		.where(and(...conditions))
		.orderBy(desc(fiscalReceiptQueue.createdAt))
		.limit(limit);

	return reply.code(200).send({
		items,
		total: items.length,
	});
}
