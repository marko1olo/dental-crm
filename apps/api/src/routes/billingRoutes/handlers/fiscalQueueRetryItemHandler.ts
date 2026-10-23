import { and, eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { fiscalReceiptQueue } from "../../../db/schema.js";
import { enforcePermissionWhenStaffKnown } from "../../../security/permissions.js";
import { fiscalQueueParamsSchema } from "../types.js";

export async function handleRetryFiscalQueueItem(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!(await requireClinicalMutationAccess(request, reply, "billing fiscal queue retry"))) {
		if (reply.sent) return reply;
		return reply;
	}
	if (!enforcePermissionWhenStaffKnown(request, reply, "finance.write")) {
		if (reply.sent) return reply;
		return reply;
	}

	const orgId = await requireResolvedOrganizationId(request, reply, "billing fiscal queue retry");
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const parsedParams = fiscalQueueParamsSchema.safeParse(request.params);
	if (!parsedParams.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректный идентификатор чека в очереди (требуется UUID).",
		});
	}
	const { id } = parsedParams.data;

	const [queueItem] = await db
		.select()
		.from(fiscalReceiptQueue)
		.where(and(eq(fiscalReceiptQueue.id, id), eq(fiscalReceiptQueue.organizationId, orgId)))
		.limit(1);

	if (!queueItem) {
		return reply.code(404).send({
			error: "FiscalQueueItemNotFound",
			message: "Запись фискального чека не найдена в этой клинике.",
		});
	}

	if (queueItem.status === "printed") {
		return reply.code(200).send({
			success: true,
			status: "printed",
			message: "Чек уже успешно распечатан на ККТ.",
			item: queueItem,
		});
	}

	const isKktOffline = process.env.KKM_FORCE_OFFLINE === "1" || process.env.KKM_HARDWARE_TIMEOUT === "1";

	if (isKktOffline) {
		const [updated] = await db
			.update(fiscalReceiptQueue)
			.set({
				status: "hardware_offline",
				lastError: "KKT connection timed out (5000ms) or printer offline",
				retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
				updatedAt: new Date(),
			})
			.where(and(eq(fiscalReceiptQueue.id, id), eq(fiscalReceiptQueue.organizationId, orgId)))
			.returning();

		return reply.code(200).send({
			success: false,
			status: "hardware_offline",
			error: "KKT connection timed out (5000ms) or printer offline",
			retryCount: updated?.retryCount ?? queueItem.retryCount + 1,
			item: updated,
		});
	}

	const [updated] = await db
		.update(fiscalReceiptQueue)
		.set({ status: "printed", printedAt: new Date(), lastError: null, updatedAt: new Date() })
		.where(and(eq(fiscalReceiptQueue.id, id), eq(fiscalReceiptQueue.organizationId, orgId)))
		.returning();

	return reply.code(200).send({ success: true, status: "printed", item: updated });
}
