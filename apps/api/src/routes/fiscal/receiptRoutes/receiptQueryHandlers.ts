/**
 * receiptQueryHandlers.ts — Layer 3: Fiscal Queue Queries, SBP Payment Verification & Hardware Telemetry.
 *
 * Implements:
 * - SBP Dynamic QR Payment Status (ГОСТ Р 56042-2014 / НСПК / Tag 1081)
 * - LAN KKT Hardware Diagnostics & Socket Ping
 * - Offline Queue Listing, Selective Retry & Bulk Flush
 * - Automatic Background Retry Loop Controller
 */

import { kopecksToRub, parseKopecks } from "@dental/shared";
import { and, desc, eq, inArray, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	fiscalReceiptQueue,
	idempotencyKeys,
	patientInvoices,
	payments,
	sberbankTransactions,
} from "../../../db/schema.js";
import { isValidUuid } from "../../../plugins/idempotencyModules/idempotencyHeaderParser.js";
import {
	FiscalQueueRetryWorker,
	LanKktDriverService,
} from "../../../services/hardware/index.js";
import {
	fiscalQueueIdParamSchema,
	fiscalQueueQuerySchema,
	kktDeviceTestConnectionSchema,
	sbpStatusInputSchema,
} from "./types.js";

/**
 * GET /api/fiscal/sbp-status & POST /api/fiscal/sbp-status (also /api/payments/status)
 * Fast status verification for SBP dynamic QR payments (ГОСТ Р 56042-2014 / НСПК) & Tag 1081.
 * Supports auto-receipt generation and manual cashier confirmation per Mandates 8e, 8k.
 */
export async function handleSbpStatus(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const parsedQuery = sbpStatusInputSchema.safeParse(request.query || {});
	const parsedBody = sbpStatusInputSchema.safeParse(request.body || {});
	const query = parsedQuery.success ? parsedQuery.data : {};
	const body = parsedBody.success ? parsedBody.data : {};

	const orderId = (body.orderId || query.orderId)?.trim();
	const qrId = (body.qrId || query.qrId)?.trim();
	const invoiceId = (body.invoiceId || query.invoiceId)?.trim();
	const paymentId = (body.paymentId || query.paymentId)?.trim();
	const isConfirmManual =
		body.action === "confirm_manual" ||
		query.action === "confirm_manual" ||
		query.confirm === "true";
	const isMutation = request.method.toUpperCase() === "POST" || isConfirmManual;

	const ctx = isMutation
		? await requireClinicalMutationContext(request, reply, "sbp status confirm")
		: await requireClinicalReadContext(request, reply, "sbp status query");
	if (!ctx) return;
	const orgId = ctx.organizationId;

	const rawMutationId =
		(request.headers["idempotency-key"] as string | undefined) ||
		(request.headers["x-idempotency-key"] as string | undefined) ||
		body.clientMutationId ||
		query.clientMutationId;
	const clientMutationId = rawMutationId?.trim();

	if (isMutation) {
		if (!clientMutationId || !isValidUuid(clientMutationId)) {
			return reply.code(400).send({
				error: "IdempotencyKeyRequired",
				message:
					"Для мутаций и подтверждения оплаты СБП требуется валидный UUID (UUIDv7) в заголовке Idempotency-Key (Мандат 8bo / RFC 9562).",
			});
		}
	}

	return await withTenantCtx(orgId, async (tx) => {
		if (clientMutationId) {
			const [existingKey] = await tx
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
						eq(idempotencyKeys.key, clientMutationId),
					),
				)
				.limit(1);
			if (existingKey && existingKey.status === "completed" && existingKey.responseBody) {
				reply.header("idempotency-replayed", "true");
				reply.header("x-idempotency-replayed", "true");
				return reply
					.code(existingKey.responseCode || 200)
					.send(existingKey.responseBody);
			}
		}

		let isPaid = false;
		let resolvedOrderId = orderId || qrId || invoiceId || null;
		let resolvedPaymentId: string | null = paymentId || null;
		let resolvedFiscalReceiptId: string | null = null;
		let amountKopecks: number | null = null;
		let paidAtIso: string | null = null;

		// 1. Check sberbankTransactions by orderId or qrId
		if (orderId || qrId || clientMutationId) {
			const txRows = await tx
				.select()
				.from(sberbankTransactions)
				.where(
					and(
						eq(sberbankTransactions.organizationId, orgId),
						or(
							orderId ? eq(sberbankTransactions.orderId, orderId) : undefined,
							qrId ? eq(sberbankTransactions.orderId, qrId) : undefined,
							clientMutationId ? eq(sberbankTransactions.orderId, clientMutationId) : undefined,
						),
					),
				)
				.limit(1);

			const sbTx = txRows[0];
			if (sbTx) {
				resolvedOrderId = sbTx.orderId;
				amountKopecks = Number(sbTx.amountKopecks);
				if (sbTx.status === "paid" || sbTx.status === "completed" || sbTx.status === "PAID") {
					isPaid = true;
					paidAtIso = (sbTx.updatedAt || sbTx.createdAt).toISOString();
				} else if (isConfirmManual) {
					await tx
						.update(sberbankTransactions)
						.set({ status: "paid", updatedAt: new Date() })
						.where(
							and(
								eq(sberbankTransactions.id, sbTx.id),
								eq(sberbankTransactions.organizationId, orgId),
							),
						);
					isPaid = true;
					paidAtIso = new Date().toISOString();
				}
			}
		}

		// 2. Check payments table
		if (!isPaid && (paymentId || orderId || clientMutationId)) {
			const isUuid = paymentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId);
			const paymentRows = await tx
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, orgId),
						or(
							isUuid ? eq(payments.id, paymentId!) : undefined,
							clientMutationId ? eq(payments.clientMutationId, clientMutationId) : undefined,
							orderId ? sql`${payments.note} LIKE ${'%' + orderId + '%'}` : undefined,
						),
					),
				)
				.limit(1);

			const p = paymentRows[0];
			if (p) {
				resolvedPaymentId = p.id;
				if (p.status === "paid") {
					isPaid = true;
					paidAtIso = p.paidAt ? p.paidAt.toISOString() : p.createdAt.toISOString();
					amountKopecks = parseKopecks(p.amountRub);
					if (p.fiscalReceiptNumber) {
						resolvedFiscalReceiptId = p.fiscalReceiptNumber;
					}
				}
			}
		}

		// 3. Check patientInvoices table
		if (!isPaid && (invoiceId || orderId)) {
			const invTarget = invoiceId || orderId;
			const isUuid = invTarget && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invTarget);
			const invRows = await tx
				.select()
				.from(patientInvoices)
				.where(
					and(
						eq(patientInvoices.organizationId, orgId),
						or(
							isUuid ? eq(patientInvoices.id, invTarget!) : undefined,
							invTarget ? eq(patientInvoices.id, invTarget) : undefined,
						),
					),
				)
				.limit(1);

			const inv = invRows[0];
			if (inv) {
				if (inv.status === "paid") {
					isPaid = true;
					paidAtIso = inv.paidAt ? inv.paidAt.toISOString() : new Date().toISOString();
					amountKopecks = parseKopecks(inv.totalAmountRub || inv.totalRub || 0);
				} else if (isConfirmManual) {
					await tx
						.update(patientInvoices)
						.set({ status: "paid", paidAt: new Date() })
						.where(
							and(
								eq(patientInvoices.id, inv.id),
								eq(patientInvoices.organizationId, orgId),
							),
						);
					isPaid = true;
					paidAtIso = new Date().toISOString();
				}
			}
		}

		// 4. Check fiscalReceiptQueue for emitted receipts
		if (resolvedPaymentId || resolvedOrderId) {
			const queueRows = await tx
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, orgId),
						or(
							resolvedPaymentId ? eq(fiscalReceiptQueue.paymentId, resolvedPaymentId) : undefined,
							resolvedOrderId
								? sql`${fiscalReceiptQueue.payloadJson}->>'orderId' = ${resolvedOrderId} OR ${fiscalReceiptQueue.payloadJson}->>'clientMutationId' = ${resolvedOrderId}`
								: undefined,
						),
					),
				)
				.limit(1);

			const q = queueRows[0];
			if (q) {
				resolvedFiscalReceiptId = q.id;
				if ((q.status as string) === "completed" || q.status === "printed") {
					isPaid = true;
					paidAtIso = q.printedAt ? q.printedAt.toISOString() : q.createdAt.toISOString();
				}
			}
		}

		// 5. If manual confirmation requested and no existing record found, confirm directly
		if (isConfirmManual && !isPaid) {
			isPaid = true;
			paidAtIso = new Date().toISOString();
		}

		const responseData: Record<string, unknown> = {
			success: true,
			paid: isPaid,
			status: isPaid ? "paid" : "pending",
			orderId: resolvedOrderId,
			qrId: qrId || null,
			paymentId: resolvedPaymentId,
			fiscalReceiptId: resolvedFiscalReceiptId,
			amountKopecks,
			amountRub: amountKopecks !== null ? kopecksToRub(amountKopecks) : null,
			paidAt: paidAtIso,
			method: "sbp_qr",
		};

		if (isMutation && clientMutationId) {
			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: orgId,
					key: clientMutationId,
					status: "completed",
					responseBody: responseData,
					responseCode: 200,
				})
				.onConflictDoNothing();
		}

		return reply.status(200).send(responseData);
	});
}

/**
 * GET /api/fiscal/devices/status
 * Queries status of LAN KKT hardware (online, paper, cover, model name, latency).
 */
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

/**
 * POST /api/fiscal/devices/test-connection
 * Pings IP and port of LAN KKT device in clinic subnet.
 */
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

/**
 * GET /api/fiscal/queue
 * Fetches items from the fiscal buffer queue.
 */
export async function handleFiscalQueueList(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalReadContext(request, reply, "fiscal queue read");
	if (!ctx) return;
	const orgId = ctx.organizationId;

	const parsedQuery = fiscalQueueQuerySchema.safeParse(request.query);
	const requestedStatus = parsedQuery.success ? parsedQuery.data.status : undefined;
	const limit = parsedQuery.success ? parsedQuery.data.limit : 50;

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

	const items = await db
		.select()
		.from(fiscalReceiptQueue)
		.where(and(...conditions))
		.orderBy(desc(fiscalReceiptQueue.createdAt))
		.limit(limit);

	return reply.status(200).send({
		items,
		total: items.length,
	});
}

/**
 * POST /api/fiscal/queue/:id/retry
 * Retries printing a specific queued fiscal receipt via LAN KKT driver.
 */
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

/**
 * POST /api/fiscal/queue/retry-all
 * Flushes all pending and offline fiscal receipts for the organization.
 */
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
		printedCount: result.printedCount,
		failedCount: result.failedCount,
		deviceStatus: result.deviceStatus,
	});
}

/**
 * POST /api/fiscal/queue/auto-retry/start
 * Starts background auto-retry loop for the organization.
 */
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

/**
 * POST /api/fiscal/queue/auto-retry/stop
 * Stops background auto-retry loop.
 */
export async function handleFiscalQueueAutoRetryStop(
	request: FastifyRequest,
	reply: FastifyReply,
): Promise<void> {
	const ctx = await requireClinicalMutationContext(request, reply, "fiscal auto retry stop");
	if (!ctx) return;

	FiscalQueueRetryWorker.stopAutoRetryLoop();

	return reply.status(200).send({
		success: true,
		message: "Фоновый авто-повтор печати чеков остановлен.",
	});
}
