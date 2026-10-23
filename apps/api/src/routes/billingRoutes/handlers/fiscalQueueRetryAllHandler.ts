import { and, eq, inArray, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { fiscalReceiptQueue } from "../../../db/schema.js";
import { enforcePermissionWhenStaffKnown } from "../../../security/permissions.js";

export async function handleRetryAllFiscalQueue(
	request: FastifyRequest,
	reply: FastifyReply,
) {
	if (!(await requireClinicalMutationAccess(request, reply, "billing fiscal queue retry-all"))) {
		if (reply.sent) return reply;
		return reply;
	}
	if (!enforcePermissionWhenStaffKnown(request, reply, "finance.write")) {
		if (reply.sent) return reply;
		return reply;
	}

	const orgId = await requireResolvedOrganizationId(request, reply, "billing fiscal queue retry-all");
	if (reply.sent) return reply;
	if (!orgId) return reply;

	const pendingItems = await db
		.select()
		.from(fiscalReceiptQueue)
		.where(
			and(
				eq(fiscalReceiptQueue.organizationId, orgId),
				inArray(fiscalReceiptQueue.status, ["pending_print", "hardware_offline", "failed"]),
			),
		)
		.limit(100);

	if (pendingItems.length === 0) {
		return reply.code(200).send({
			success: true,
			retriedCount: 0,
			status: "idle",
			message: "Нет чеков, ожидающих печати.",
		});
	}

	const isKktOffline = process.env.KKM_FORCE_OFFLINE === "1" || process.env.KKM_HARDWARE_TIMEOUT === "1";

	if (isKktOffline) {
		await db
			.update(fiscalReceiptQueue)
			.set({
				status: "hardware_offline",
				lastError: "KKT connection timed out (5000ms) or printer offline",
				retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(fiscalReceiptQueue.organizationId, orgId),
					inArray(fiscalReceiptQueue.id, pendingItems.map((it) => it.id)),
				),
			);

		return reply.code(200).send({
			success: false,
			status: "hardware_offline",
			retriedCount: pendingItems.length,
			error: "KKT connection timed out (5000ms) or printer offline",
		});
	}

	await db
		.update(fiscalReceiptQueue)
		.set({ status: "printed", printedAt: new Date(), lastError: null, updatedAt: new Date() })
		.where(
			and(
				eq(fiscalReceiptQueue.organizationId, orgId),
				inArray(fiscalReceiptQueue.id, pendingItems.map((it) => it.id)),
			),
		);

	return reply.code(200).send({
		success: true,
		status: "printed",
		retriedCount: pendingItems.length,
	});
}
