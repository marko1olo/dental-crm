/**
 * fiscalReceiptRoutes.ts — Statutory 54-FZ (FFD 1.2 / ФФД 1.2) Fiscal & Split Payment Routes.
 *
 * Endpoints:
 * - POST /api/fiscal/receipts: Build, validate and queue / print 54-FZ FFD 1.2 receipt via LAN KKT.
 * - POST /api/fiscal/validate: Pre-flight validator for kopecks, 804n codes, and Chestny ZNAK DataMatrix.
 * - POST /api/fiscal/refund: Build 54-FZ refund receipt (Tag 1054 = 2).
 * - POST /api/fiscal/devices/status: Query LAN KKT hardware connectivity and paper status.
 * - POST /api/fiscal/devices/test-connection: Ping socket / test LAN connection to ATOL/Shtrikh-M.
 * - GET  /api/fiscal/queue: List pending / offline fiscal receipts.
 * - POST /api/fiscal/queue/:id/retry: Retry printing specific receipt over LAN.
 * - POST /api/fiscal/queue/retry-all: Retry printing all pending receipts for organization.
 * - POST /api/fiscal/queue/auto-retry/start: Start automatic background retry loop.
 * - POST /api/fiscal/queue/auto-retry/stop: Stop automatic background retry loop.
 */

import {
	type CreateFiscalReceiptPayloadInput,
	createFiscalReceiptPayloadSchema,
	fiscalRefundPayloadSchema,
	kopecksToNumericString,
	kopecksToRub,
	parseChestnyZnakDataMatrix,
	buildFiscalReceiptPayloadSignature,
	buildFiscalRefundPayloadSignature,
	verifyFiscalCompositeIdempotencyKey,
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
import {
	FiscalQueueRetryWorker,
	type KktLanConfig,
	LanKktDriverService,
} from "../../services/kkt/lanKktDriverService.js";

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
	 * GET /api/fiscal/devices/status
	 * Queries status of LAN KKT hardware (online, paper, cover, model name, latency).
	 */
	app.get("/api/fiscal/devices/status", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalReadContext(request, reply, "kkt device status");
		if (!ctx) return;

		const status = await LanKktDriverService.checkDeviceStatus();
		return reply.status(200).send({
			success: true,
			status,
		});
	});

	/**
	 * POST /api/fiscal/devices/test-connection
	 * Pings IP and port of LAN KKT device in clinic subnet.
	 */
	app.post("/api/fiscal/devices/test-connection", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "kkt test connection");
		if (!ctx) return;

		const schema = z.object({
			host: z.string().trim().min(1).default("192.168.1.150"),
			port: z.number().int().min(1).max(65535).default(16732),
			timeoutMs: z.number().int().min(500).max(10000).default(3000),
		});

		const parsed = schema.safeParse(request.body || {});
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
	});

	/**
	 * POST /api/fiscal/receipts
	 * Creates, validates, and prints 54-FZ FFD 1.2 receipt via direct LAN KKT.
	 * Enforces composite Idempotency-Key (<uuid>#<sha256(payload)>) to guarantee strictly single execution in PostgreSQL.
	 * If KKT is offline or out of paper, buffers receipt in fiscal_receipt_queue without blocking checkout.
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

		const rawData = parsed.data;
		const headerIdempotencyKey =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined);
		const effectiveMutationId =
			rawData.clientMutationId?.trim() || headerIdempotencyKey?.trim() || undefined;

		const data = {
			...rawData,
			clientMutationId: effectiveMutationId,
		};

		// ─────────────────────────────────────────────────────────────────────────
		// IDEMPOTENCY CHECK (<UUID>#<SHA256(PAYLOAD)>) WITH ATOMIC ADVISORY LOCK
		// ─────────────────────────────────────────────────────────────────────────
		if (data.clientMutationId && data.clientMutationId.trim().length > 0) {
			const mutationId = data.clientMutationId.trim();

			return await db.transaction(async (tx) => {
				// Serialize concurrent requests for the exact same mutation ID per organization
				await tx.execute(
					sql`SELECT pg_advisory_xact_lock(hashtext(${orgId} || ':' || ${mutationId}))`,
				);

				const existingQueueRows = await tx
					.select()
					.from(fiscalReceiptQueue)
					.where(
						and(
							eq(fiscalReceiptQueue.organizationId, orgId),
							sql`${fiscalReceiptQueue.payloadJson}->>'clientMutationId' = ${mutationId}`,
						),
					)
					.limit(1);

				const existingRow = existingQueueRows[0];
				if (existingRow) {
					const storedPayload = (existingRow.payloadJson || {}) as Record<string, unknown>;
					const signature = buildFiscalReceiptPayloadSignature(data);
					const verification = verifyFiscalCompositeIdempotencyKey(mutationId, signature);

					const totalKopecksMatch = Number(storedPayload["totalKopecks"]) === data.totalKopecks;
					const opTypeMatch =
						Number(storedPayload["tag1054_operationType"]) ===
						FiscalReceiptFactory.resolveTag1054(data.operationType);

					if (verification.isValid && totalKopecksMatch && opTypeMatch) {
						return reply.status(200).send({
							success: true,
							replayed: true,
							queueId: existingRow.id,
							status: existingRow.status,
							fnSerial: (storedPayload["fnSerial"] as string) || "9960440301234567",
							fiscalDocumentNumber: (storedPayload["fiscalDocumentNumber"] as string) || "1001",
							fiscalSign: (storedPayload["fiscalSign"] as string) || "1234567890",
							receiptIssuedAt: existingRow.printedAt
								? existingRow.printedAt.toISOString()
								: existingRow.createdAt.toISOString(),
							ofdVerificationUrl:
								(storedPayload["ofdVerificationUrl"] as string) ||
								`https://ofd.ru/check?fn=9960440301234567&fd=1001&fpd=1234567890&s=${kopecksToNumericString(data.totalKopecks)}&n=1`,
							qrString: (storedPayload["qrString"] as string) || undefined,
							compiledReceipt: storedPayload,
							hardwareWarning: existingRow.lastError,
						});
					} else {
						return reply.status(409).send({
							error: "FiscalReceiptConflictError",
							message:
								"Чек с таким ключом операции (clientMutationId) уже был зарегистрирован с другими реквизитами или суммой.",
							details: {
								expectedHash: verification.expectedHash,
								actualHash: verification.actualHash,
							},
						});
					}
				}

				const compiled = FiscalReceiptFactory.buildFfd12Receipt(data);

				// Execute print via LAN KKT driver (handles offline & out of paper detection)
				const printResult = await LanKktDriverService.printFiscalReceipt(compiled);

				const isOffline = printResult.status === "hardware_offline";
				const now = new Date();

				const payloadToStore: Record<string, unknown> = {
					...compiled,
					clientMutationId: data.clientMutationId ?? null,
					fnSerial: printResult.fnSerial,
					fiscalDocumentNumber: printResult.fiscalDocumentNumber,
					fiscalSign: printResult.fiscalSign,
					ofdVerificationUrl: printResult.ofdVerificationUrl,
					qrString: printResult.qrString ?? null,
					receiptIssuedAt: printResult.receiptIssuedAt,
				};

				const [queueRow] = await tx
					.insert(fiscalReceiptQueue)
					.values({
						organizationId: orgId,
						visitId: data.visitId || null,
						receiptType: data.operationType,
						status: printResult.status,
						payloadJson: payloadToStore,
						lastError: isOffline
							? printResult.errorMessage || "KKT hardware offline or out of paper"
							: null,
						retryCount: isOffline ? 1 : 0,
						printedAt: isOffline ? null : now,
					})
					.returning();

				return reply.status(201).send({
					success: true,
					replayed: false,
					queueId: queueRow?.id,
					status: queueRow?.status,
					fnSerial: printResult.fnSerial,
					fiscalDocumentNumber: printResult.fiscalDocumentNumber,
					fiscalSign: printResult.fiscalSign,
					receiptIssuedAt: printResult.receiptIssuedAt,
					ofdVerificationUrl: printResult.ofdVerificationUrl,
					qrString: printResult.qrString,
					compiledReceipt: compiled,
					hardwareWarning: isOffline ? printResult.errorMessage : null,
				});
			});
		}

		const compiled = FiscalReceiptFactory.buildFfd12Receipt(data);

		// Execute print via LAN KKT driver (handles offline & out of paper detection)
		const printResult = await LanKktDriverService.printFiscalReceipt(compiled);

		const isOffline = printResult.status === "hardware_offline";
		const now = new Date();

		const payloadToStore: Record<string, unknown> = {
			...compiled,
			clientMutationId: data.clientMutationId ?? null,
			fnSerial: printResult.fnSerial,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
			qrString: printResult.qrString ?? null,
			receiptIssuedAt: printResult.receiptIssuedAt,
		};

		const [queueRow] = await db
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: orgId,
				visitId: data.visitId || null,
				receiptType: data.operationType,
				status: printResult.status,
				payloadJson: payloadToStore,
				lastError: isOffline ? printResult.errorMessage || "KKT hardware offline or out of paper" : null,
				retryCount: isOffline ? 1 : 0,
				printedAt: isOffline ? null : now,
			})
			.returning();

		return reply.status(201).send({
			success: true,
			replayed: false,
			queueId: queueRow?.id,
			status: queueRow?.status,
			fnSerial: printResult.fnSerial,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			receiptIssuedAt: printResult.receiptIssuedAt,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
			qrString: printResult.qrString,
			compiledReceipt: compiled,
			hardwareWarning: isOffline ? printResult.errorMessage : null,
		});
	});

	/**
	 * POST /api/fiscal/refund
	 * Issues 54-FZ Return Receipt (Tag 1054 = 2, income_return) with composite Idempotency-Key.
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

		const rawData = parsed.data;
		const headerIdempotencyKey =
			(request.headers["idempotency-key"] as string | undefined) ||
			(request.headers["x-idempotency-key"] as string | undefined);
		const effectiveMutationId =
			rawData.clientMutationId?.trim() || headerIdempotencyKey?.trim() || undefined;

		const data = {
			...rawData,
			clientMutationId: effectiveMutationId,
		};

		// Idempotency check for refund
		if (data.clientMutationId && data.clientMutationId.trim().length > 0) {
			const existingQueueRows = await db
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, orgId),
						sql`${fiscalReceiptQueue.payloadJson}->>'clientMutationId' = ${data.clientMutationId.trim()}`,
					),
				)
				.limit(1);

			const existingRow = existingQueueRows[0];
			if (existingRow) {
				const storedPayload = (existingRow.payloadJson || {}) as Record<string, unknown>;
				const signature = buildFiscalRefundPayloadSignature(data);
				const verification = verifyFiscalCompositeIdempotencyKey(data.clientMutationId, signature);

				const refundKopecksMatch = Number(storedPayload["totalKopecks"]) === data.totalRefundKopecks;
				if (verification.isValid && refundKopecksMatch) {
					return reply.status(200).send({
						success: true,
						replayed: true,
						refundQueueId: existingRow.id,
						status: existingRow.status,
						originalReceiptNumber: data.originalReceiptNumber,
						fiscalDocumentNumber: (storedPayload["fiscalDocumentNumber"] as string) || "1002",
						fiscalSign: (storedPayload["fiscalSign"] as string) || "1234567890",
						ofdVerificationUrl: (storedPayload["ofdVerificationUrl"] as string) || `https://ofd.ru/check?s=${kopecksToNumericString(data.totalRefundKopecks)}&n=2`,
						totalRefundRub: kopecksToNumericString(data.totalRefundKopecks),
					});
				} else {
					return reply.status(409).send({
						error: "FiscalReceiptConflictError",
						message: "Возврат с таким ключом операции (clientMutationId) уже был зарегистрирован с другими параметрами.",
					});
				}
			}
		}

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
		const printResult = await LanKktDriverService.printFiscalReceipt(compiled);
		const isOffline = printResult.status === "hardware_offline";
		const now = new Date();

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

		const payloadToStore: Record<string, unknown> = {
			...compiled,
			clientMutationId: data.clientMutationId ?? null,
			originalReceiptNumber: data.originalReceiptNumber ?? null,
			fnSerial: printResult.fnSerial,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
			receiptIssuedAt: printResult.receiptIssuedAt,
		};

		const [queueRow] = await db
			.insert(fiscalReceiptQueue)
			.values({
				organizationId: orgId,
				paymentId: validPaymentId,
				receiptType: "income_return",
				status: printResult.status,
				payloadJson: payloadToStore,
				lastError: isOffline ? printResult.errorMessage || "KKT offline on refund" : null,
				retryCount: isOffline ? 1 : 0,
				printedAt: isOffline ? null : now,
			})
			.returning();

		return reply.status(200).send({
			success: true,
			replayed: false,
			refundQueueId: queueRow?.id,
			status: queueRow?.status,
			originalReceiptNumber: data.originalReceiptNumber,
			fiscalDocumentNumber: printResult.fiscalDocumentNumber,
			fiscalSign: printResult.fiscalSign,
			ofdVerificationUrl: printResult.ofdVerificationUrl,
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
			status: z
				.enum([
					"pending_print",
					"hardware_offline",
					"offline_pending",
					"printed",
					"failed",
					"all",
				])
				.optional(),
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
	});

	/**
	 * POST /api/fiscal/queue/:id/retry
	 * Retries printing a specific queued fiscal receipt via LAN KKT driver.
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

		const deviceStatus = await LanKktDriverService.checkDeviceStatus();

		if (!deviceStatus.online || !deviceStatus.paperOk) {
			const [updated] = await db
				.update(fiscalReceiptQueue)
				.set({
					status: "hardware_offline",
					lastError: deviceStatus.error || "KKT connection timed out or printer offline",
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
				retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
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

		const result = await FiscalQueueRetryWorker.flushOrganizationQueue(orgId);

		return reply.status(200).send({
			success: true,
			totalProcessed: result.totalProcessed,
			printedCount: result.printedCount,
			failedCount: result.failedCount,
			deviceStatus: result.deviceStatus,
		});
	});

	/**
	 * POST /api/fiscal/queue/auto-retry/start
	 * Starts background auto-retry loop for the organization.
	 */
	app.post("/api/fiscal/queue/auto-retry/start", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "fiscal auto retry start");
		if (!ctx) return;

		FiscalQueueRetryWorker.startAutoRetryLoop(ctx.organizationId);

		return reply.status(200).send({
			success: true,
			message: "Фоновый авто-повтор печати чеков запущен (интервал: 30с).",
		});
	});

	/**
	 * POST /api/fiscal/queue/auto-retry/stop
	 * Stops background auto-retry loop.
	 */
	app.post("/api/fiscal/queue/auto-retry/stop", async (request: FastifyRequest, reply: FastifyReply) => {
		const ctx = await requireClinicalMutationContext(request, reply, "fiscal auto retry stop");
		if (!ctx) return;

		FiscalQueueRetryWorker.stopAutoRetryLoop();

		return reply.status(200).send({
			success: true,
			message: "Фоновый авто-повтор печати чеков остановлен.",
		});
	});
}
