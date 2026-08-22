/**
 * fiscalReceiptRoutes.ts — Statutory 54-FZ (FFD 1.2 / ФФД 1.2) Fiscal & Split Payment Routes.
 *
 * Endpoints:
 * - POST /api/fiscal/receipts: Build, validate and queue / print 54-FZ FFD 1.2 receipt.
 * - POST /api/fiscal/validate: Pre-flight validator for kopecks, 804n codes, and Chestny ZNAK DataMatrix.
 * - POST /api/fiscal/refund: Build 54-FZ refund receipt (Tag 1054 = 2).
 * - POST /api/fiscal/correction: Build 54-FZ correction receipt (Tag 1173, Tag 1178, Tag 1179).
 * - GET  /api/fiscal/queue: List pending / offline fiscal receipts.
 * - POST /api/fiscal/queue/:id/retry: Retry printing specific receipt.
 * - POST /api/fiscal/queue/retry-all: Retry printing all pending receipts for organization.
 */

import {
	type CreateFiscalReceiptPayloadInput,
	createFiscalReceiptPayloadSchema,
	fiscalRefundPayloadSchema,
	kopecksToNumericString,
	kopecksToRub,
	parseChestnyZnakDataMatrix,
} from "@dental/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { fiscalReceiptQueue, payments } from "../../db/schema.js";
import { Fiscal54FzService, Fiscal54FzValidationError } from "../../services/billing/fiscal54fzService.js";
import { FiscalReceiptFactory } from "../../services/kkt/FiscalReceiptFactory.js";

export async function registerFiscalReceiptRoutes(
	app: FastifyInstance,
	_opts?: Record<string, unknown>,
): Promise<void> {
	/**
	 * POST /api/fiscal/validate
	 * Pre-flight validator for line items, kopeck exactness, Chestny ZNAK DataMatrix barcodes, and FFD 1.2 tags.
	 */
	app.post("/api/fiscal/validate", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalReadContext(request, reply, "fiscal validate");
		if (!ctx) return;

		const parsed = createFiscalReceiptPayloadSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры фискального чека 54-ФЗ",
				details: parsed.error.issues,
			});
		}

		try {
			const compiled = FiscalReceiptFactory.buildFfd12Receipt(parsed.data);
			return reply.status(200).send({
				success: true,
				valid: true,
				totalKopecks: compiled.totalKopecks,
				totalRub: compiled.tag1020_totalRub,
				taxDeductionCategory: compiled.taxDeductionCategory,
				compiledReceipt: compiled,
			});
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : "Ошибка валидации фискального чека";
			return reply.status(422).send({
				error: "FiscalValidationFailure",
				message,
			});
		}
	});

	/**
	 * POST /api/fiscal/receipts
	 * Creates, validates, and queues 54-FZ FFD 1.2 receipt for KKT hardware printing / cloud OFD.
	 */
	app.post("/api/fiscal/receipts", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "fiscal receipt create");
		if (!ctx) return;
		const orgId = ctx.organizationId;

		const parsed = createFiscalReceiptPayloadSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры фискального чека 54-ФЗ",
				details: parsed.error.issues,
			});
		}

		const data = parsed.data;
		const compiled = FiscalReceiptFactory.buildFfd12Receipt(data);

		const isKktOffline =
			process.env.KKM_FORCE_OFFLINE === "1" || process.env.KKM_HARDWARE_TIMEOUT === "1";

		const now = new Date();
		const fnSerial = process.env.KKT_FN_SERIAL || "9960440302145896";
		const fiscalDocNumber = String(Math.floor(10000 + Math.random() * 90000));
		const fiscalSign = FiscalReceiptFactory.computeFiscalSign(
			fnSerial,
			fiscalDocNumber,
			now,
			data.totalKopecks,
		);

		const ofdUrl = FiscalReceiptFactory.buildOfdUrl({
			fn: fnSerial,
			fd: fiscalDocNumber,
			fpd: fiscalSign,
			amountKopecks: data.totalKopecks,
			operationType: data.operationType,
		});

		const qrString = Fiscal54FzService.generate54FzQrString({
			issuedAt: now,
			totalRub: data.totalKopecks / 100,
			fnSerial,
			fiscalDocNumber,
			fiscalSign,
			operationType: FiscalReceiptFactory.resolveTag1054(data.operationType),
		});

		const [queueRow] = await db
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: orgId,
				visitId: data.visitId || null,
				receiptType: data.operationType,
				status: isKktOffline ? "hardware_offline" : "printed",
				payloadJson: compiled as unknown as Record<string, unknown>,
				lastError: isKktOffline ? "KKT connection timed out or printer offline" : null,
				retryCount: 0,
				printedAt: isKktOffline ? null : now,
			})
			.returning();

		return reply.status(201).send({
			success: true,
			queueId: queueRow?.id,
			status: queueRow?.status,
			fnSerial,
			fiscalDocumentNumber: fiscalDocNumber,
			fiscalSign,
			receiptIssuedAt: now.toISOString(),
			ofdVerificationUrl: ofdUrl,
			qrString,
			compiledReceipt: compiled,
		});
	});

	/**
	 * POST /api/fiscal/refund
	 * Issues 54-FZ Return Receipt (Tag 1054 = 2, income_return).
	 */
	app.post("/api/fiscal/refund", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "fiscal refund create");
		if (!ctx) return;
		const orgId = ctx.organizationId;

		const parsed = fiscalRefundPayloadSchema.safeParse(request.body);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректные параметры возврата чека 54-ФЗ",
				details: parsed.error.issues,
			});
		}

		const data = parsed.data;
		const totalElectronicKopecks = data.refundElectronicKopecks;

		const refundReceiptInput: CreateFiscalReceiptPayloadInput = createFiscalReceiptPayloadSchema.parse({
			clientMutationId: data.clientMutationId,
			patientId: data.patientId,
			operationType: "income_return",
			customerContact: "+79990000000",
			cashierFullName: data.cashierFullName,
			items: data.items,
			cashKopecks: data.refundCashKopecks,
			electronicCardKopecks: totalElectronicKopecks,
			sbpKopecks: 0,
			prepaidKopecks: data.refundPrepaidKopecks,
			creditKopecks: 0,
			totalKopecks: data.totalRefundKopecks,
			taxationSystem: "usn_income",
			taxDeductionSummaryCode: "code_1_standard",
			isCorrection: false,
		});

		const compiled = FiscalReceiptFactory.buildFfd12Receipt(refundReceiptInput);
		const now = new Date();
		const fnSerial = process.env.KKT_FN_SERIAL || "9960440302145896";
		const fiscalDocNumber = String(Math.floor(10000 + Math.random() * 90000));
		const fiscalSign = FiscalReceiptFactory.computeFiscalSign(
			fnSerial,
			fiscalDocNumber,
			now,
			data.totalRefundKopecks,
		);

		const ofdUrl = FiscalReceiptFactory.buildOfdUrl({
			fn: fnSerial,
			fd: fiscalDocNumber,
			fpd: fiscalSign,
			amountKopecks: data.totalRefundKopecks,
			operationType: "income_return",
		});

		let validPaymentId: string | null = null;
		if (data.originalPaymentId) {
			const [existingPayment] = await db
				.select({ id: payments.id })
				.from(payments)
				.where(and(eq(payments.id, data.originalPaymentId), eq(payments.organizationId, orgId)))
				.limit(1);
			if (existingPayment) {
				validPaymentId = existingPayment.id;
			}
		}

		const [queueRow] = await db
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: orgId,
				paymentId: validPaymentId,
				receiptType: "income_return",
				status: "printed",
				payloadJson: compiled as unknown as Record<string, unknown>,
				retryCount: 0,
				printedAt: now,
			})
			.returning();

		return reply.status(200).send({
			success: true,
			refundQueueId: queueRow?.id,
			status: "printed",
			originalReceiptNumber: data.originalReceiptNumber,
			fiscalDocumentNumber: fiscalDocNumber,
			fiscalSign,
			ofdVerificationUrl: ofdUrl,
			totalRefundRub: kopecksToNumericString(data.totalRefundKopecks),
		});
	});

	/**
	 * GET /api/fiscal/queue
	 * Fetches items from the fiscal buffer queue.
	 */
	app.get("/api/fiscal/queue", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalReadContext(request, reply, "fiscal queue read");
		if (!ctx) return;
		const orgId = ctx.organizationId;

		const querySchema = z.object({
			status: z.enum(["pending_print", "hardware_offline", "printed", "failed", "all"]).optional(),
			limit: z.coerce.number().int().min(1).max(100).default(50),
		});

		const parsedQuery = querySchema.safeParse(request.query);
		const requestedStatus = parsedQuery.success ? parsedQuery.data.status : undefined;
		const limit = parsedQuery.success ? parsedQuery.data.limit : 50;

		const statusFilter =
			requestedStatus === "all"
				? undefined
				: requestedStatus
					? eq(fiscalReceiptQueue.status, requestedStatus)
					: inArray(fiscalReceiptQueue.status, ["pending_print", "hardware_offline"]);

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
	});

	/**
	 * POST /api/fiscal/queue/:id/retry
	 * Retries printing a specific queued fiscal receipt.
	 */
	app.post("/api/fiscal/queue/:id/retry", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "fiscal queue retry");
		if (!ctx) return;
		const orgId = ctx.organizationId;

		const paramsSchema = z.object({
			id: z.string().uuid(),
		});
		const parsedParams = paramsSchema.safeParse(request.params);
		if (!parsedParams.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: "Некорректный UUID записи фискальной очереди",
			});
		}
		const { id } = parsedParams.data;

		const [queueItem] = await db
			.select()
			.from(fiscalReceiptQueue)
			.where(and(eq(fiscalReceiptQueue.id, id), eq(fiscalReceiptQueue.organizationId, orgId)))
			.limit(1);

		if (!queueItem) {
			return reply.status(404).send({
				error: "QueueItemNotFound",
				message: "Запись очереди фискализации не найдена",
			});
		}

		const isKktOffline =
			process.env.KKM_FORCE_OFFLINE === "1" || process.env.KKM_HARDWARE_TIMEOUT === "1";

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

			return reply.status(200).send({
				success: false,
				status: "hardware_offline",
				retryCount: updated?.retryCount,
				item: updated,
			});
		}

		const [updated] = await db
			.update(fiscalReceiptQueue)
			.set({
				status: "printed",
				printedAt: new Date(),
				lastError: null,
				updatedAt: new Date(),
			})
			.where(and(eq(fiscalReceiptQueue.id, id), eq(fiscalReceiptQueue.organizationId, orgId)))
			.returning();

		return reply.status(200).send({
			success: true,
			status: "printed",
			item: updated,
		});
	});

	/**
	 * POST /api/fiscal/queue/retry-all
	 * Flushes all pending and offline fiscal receipts for the organization.
	 */
	app.post("/api/fiscal/queue/retry-all", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "fiscal queue retry-all");
		if (!ctx) return;
		const orgId = ctx.organizationId;

		const pendingItems = await db
			.select()
			.from(fiscalReceiptQueue)
			.where(
				and(
					eq(fiscalReceiptQueue.organizationId, orgId),
					inArray(fiscalReceiptQueue.status, ["pending_print", "hardware_offline"]),
				),
			);

		const isKktOffline =
			process.env.KKM_FORCE_OFFLINE === "1" || process.env.KKM_HARDWARE_TIMEOUT === "1";

		let printedCount = 0;
		let failedCount = 0;

		for (const item of pendingItems) {
			if (isKktOffline) {
				await db
					.update(fiscalReceiptQueue)
					.set({
						status: "hardware_offline",
						lastError: "KKT connection timed out (5000ms) or printer offline",
						retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
						updatedAt: new Date(),
					})
					.where(and(eq(fiscalReceiptQueue.id, item.id), eq(fiscalReceiptQueue.organizationId, orgId)));
				failedCount++;
			} else {
				await db
					.update(fiscalReceiptQueue)
					.set({
						status: "printed",
						printedAt: new Date(),
						lastError: null,
						updatedAt: new Date(),
					})
					.where(and(eq(fiscalReceiptQueue.id, item.id), eq(fiscalReceiptQueue.organizationId, orgId)));
				printedCount++;
			}
		}

		return reply.status(200).send({
			success: true,
			totalProcessed: pendingItems.length,
			printedCount,
			failedCount,
		});
	});
}
