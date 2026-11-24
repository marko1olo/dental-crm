/**
 * receiptQueueHandlers.ts — KKT Device Diagnostics & Fiscal Queue Retry Endpoints.
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { fiscalReceiptQueue } from "../../../db/schema.js";
import {
	FiscalQueueRetryWorker,
	LanKktDriverService,
} from "../../../services/hardware/index.js";
import {
	fiscalQueueIdParamSchema,
	fiscalQueueQuerySchema,
	kktDeviceTestConnectionSchema,
} from "./types.js";

export async function handleKktDeviceStatus(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalReadContext(request, reply, "kkt device status");
	if (!ctx) return;

	const status = await LanKktDriverService.checkDeviceStatus();
	return reply.status(200).send({
		success: true,
		status,
	});
}

export async function handleKktTestConnection(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalMutationContext(request, reply, "kkt test connection");
	if (!ctx) return;

	const parsed = kktDeviceTestConnectionSchema.safeParse(request.body || {});
	if (!parsed.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректные параметры подключения к ККТ",
		});
	}

	const { host, port, timeoutMs } = parsed.data;
	const result = await LanKktDriverService.pingSocket(host, port, timeoutMs);

	return reply.status(200).send({
		success: result.reachable,
		host,
		port,
		latencyMs: result.latencyMs,
		error: result.error || null,
	});
}

export async function handleFiscalQueueList(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalReadContext(request, reply, "fiscal queue read");
	if (!ctx) return;
	const orgId = ctx.organizationId;

	const parsedQuery = fiscalQueueQuerySchema.safeParse(request.query);
	if (!parsedQuery.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректные параметры запроса очереди фискальных чеков.",
			details: parsedQuery.error.issues,
		});
	}
	const requestedStatus = parsedQuery.data.status;
	const limit = parsedQuery.data.limit;

	const statusFilter =
		requestedStatus === "all"
			? undefined
			: requestedStatus
				? eq(fiscalReceiptQueue.status, requestedStatus)
				: inArray(fiscalReceiptQueue.status, [
						"pending_print",
						"hardware_offline",
						"offline_pending",
					]);

	const conditions = [eq(fiscalReceiptQueue.organizationId, orgId)];
	if (statusFilter) {
		conditions.push(statusFilter);
	}

	const items = await withTenantCtx(orgId, async (tx) => {
		return tx
			.select()
			.from(fiscalReceiptQueue)
			.where(and(...conditions))
			.orderBy(desc(fiscalReceiptQueue.createdAt))
			.limit(limit);
	});

	return reply.status(200).send({
		items,
		total: items.length,
	});
}

export async function handleFiscalQueueRetry(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalMutationContext(request, reply, "fiscal queue retry");
	if (!ctx) return;
	const orgId = ctx.organizationId;

	const parsedParams = fiscalQueueIdParamSchema.safeParse(request.params);
	if (!parsedParams.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректный UUID записи фискальной очереди",
		});
	}
	const { id } = parsedParams.data;

	const result = await FiscalQueueRetryWorker.retrySingleReceipt(orgId, id);

	if (result.error === "QueueItemNotFound" || (!result.item && !result.success)) {
		return reply.status(404).send({
			error: "QueueItemNotFound",
			message: "Запись очереди фискализации не найдена",
		});
	}

	return reply.status(200).send({
		success: result.success,
		status: result.status,
		retryCount: result.retryCount,
		item: result.item,
		...(result.error ? { error: result.error } : {}),
	});
}

export async function handleFiscalQueueRetryAll(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalMutationContext(request, reply, "fiscal queue retry-all");
	if (!ctx) return;
	const orgId = ctx.organizationId;

	const result = await FiscalQueueRetryWorker.flushOrganizationQueue(orgId);

	return reply.status(200).send({
		success: true,
		totalProcessed: result.totalProcessed,
		processedCount: result.totalProcessed,
		printedCount: result.printedCount,
		failedCount: result.failedCount,
		deviceStatus: result.deviceStatus,
	});
}

export async function handleFiscalQueueAutoRetryStart(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalMutationContext(request, reply, "fiscal auto retry start");
	if (!ctx) return;

	FiscalQueueRetryWorker.startAutoRetryLoop(ctx.organizationId);

	return reply.status(200).send({
		success: true,
		message: "Фоновый авто-повтор печати чеков запущен (интервал: 30с).",
	});
}

export async function handleFiscalQueueAutoRetryStop(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalMutationContext(request, reply, "fiscal auto retry stop");
	if (!ctx) return;

	FiscalQueueRetryWorker.stopAutoRetryLoop(ctx.organizationId);

	return reply.status(200).send({
		success: true,
		message: "Фоновый авто-повтор печати чеков остановлен.",
	});
}
