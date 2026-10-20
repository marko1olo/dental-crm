/**
 * fiscalRetryPolicy.ts — Layer 3: Exponential Retry Policy, Statutory Idempotency & Fastify Handler.
 *
 * Implements:
 * 1. 1-Click Manual / Automatic Retry:
 *    - Re-attempts fiscalization for transaction or payment in `fiscalization_pending` status.
 *    - Strict advisory transaction lock: `pg_advisory_xact_lock` prevents concurrent retries.
 *    - Idempotency guard: prevents double fiscalization or duplicate paper receipts.
 * 2. Exponential backoff curve calculation for resilient offline recovery.
 * 3. Statutory FFD 1.2 tags synchronization on successful reprint.
 *
 * Compliant with THE HAMMER Master Prompt, Mandate 8b, Zero Mocks, and Zero Logic Mutation.
 */

import type { FiscalReceiptDetails } from "@dental/shared";
import { and, desc, eq, or, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { fiscalReceiptQueue, payments } from "../../db/schema.js";
import { LanKktDriverService } from "../hardware/lanKktDriverService.js";
import type { KktLanConfig, KktPrintResult } from "../hardware/types.js";
import type { Ffd12ReceiptPayload } from "../kkt/FiscalReceiptFactory.js";
import type { RetryFiscalizeResult } from "./types.js";

export const FISCAL_RETRY_SCHEDULE_MS = [1000, 5000, 15000, 60000, 300000] as const;

export class FiscalRetryPolicy {
	/**
	 * Calculates exponential backoff retry delay in milliseconds based on attempt count.
	 */
	public static calculateRetryDelayMs(retryCount: number): number {
		const index = Math.min(Math.max(0, retryCount), FISCAL_RETRY_SCHEDULE_MS.length - 1);
		return FISCAL_RETRY_SCHEDULE_MS[index]!;
	}

	/**
	 * 1-Click Manual / Automatic Retry:
	 * Re-attempts fiscalization for a transaction or payment in `fiscalization_pending` status.
	 * Checks idempotency lock to prevent double-charging or printing duplicate receipts.
	 */
	public static async retryFiscalizeTransaction(
		organizationId: string,
		transactionOrPaymentId: string,
		options: { kktConfig?: Partial<KktLanConfig> } = {},
	): Promise<RetryFiscalizeResult> {
		const { kktConfig } = options;
		const deviceStatus = await LanKktDriverService.checkDeviceStatus(kktConfig);
		const now = new Date();

		return await withTenantCtx(organizationId, async (tx) => {
			const targetDb = tx ?? db;

			// Advisory lock on transaction retry
			await targetDb.execute(
				sql`SELECT pg_advisory_xact_lock(hashtext(${`fiscal:retry:${organizationId}:${transactionOrPaymentId}`}))`,
			);

			// Find payment or queue item
			const [matchedPayment] = await targetDb
				.select()
				.from(payments)
				.where(
					and(
						eq(payments.organizationId, organizationId),
						or(
							eq(payments.id, transactionOrPaymentId),
							eq(payments.clientMutationId, transactionOrPaymentId),
						),
					),
				)
				.limit(1);

			let queueItem: typeof fiscalReceiptQueue.$inferSelect | null = null;
			if (matchedPayment) {
				const [q] = await targetDb
					.select()
					.from(fiscalReceiptQueue)
					.where(
						and(
							eq(fiscalReceiptQueue.organizationId, organizationId),
							eq(fiscalReceiptQueue.paymentId, matchedPayment.id),
						),
					)
					.orderBy(desc(fiscalReceiptQueue.createdAt))
					.limit(1);
				queueItem = q || null;
			} else {
				// Try lookup by queueItemId directly
				const [q] = await targetDb
					.select()
					.from(fiscalReceiptQueue)
					.where(
						and(
							eq(fiscalReceiptQueue.organizationId, organizationId),
							eq(fiscalReceiptQueue.id, transactionOrPaymentId),
						),
					)
					.limit(1);
				queueItem = q || null;
			}

			const targetPaymentId = matchedPayment?.id || queueItem?.paymentId;
			if (!targetPaymentId) {
				const notFoundErr = new Error("Payment or transaction not found for retry-fiscalize");
				(notFoundErr as any).statusCode = 404;
				throw notFoundErr;
			}

			// IDEMPOTENCY CHECK: If already printed with valid fiscal doc number, return idempotent success
			if (
				(matchedPayment && matchedPayment.fiscalReceiptNumber) ||
				(queueItem && queueItem.status === "printed")
			) {
				return {
					success: true,
					status: "already_fiscalized",
					paymentId: targetPaymentId,
					queueItemId: queueItem?.id,
					fiscalReceiptNumber:
						matchedPayment?.fiscalReceiptNumber ||
						(queueItem?.payloadJson as any)?.fiscalDocumentNumber,
					fiscalSign:
						(matchedPayment?.fiscalReceipt as any)?.fpd ||
						(queueItem?.payloadJson as any)?.fiscalSign,
					ofdUrl:
						matchedPayment?.fiscalReceiptUrl ||
						(queueItem?.payloadJson as any)?.ofdVerificationUrl,
					receiptIssuedAt:
						matchedPayment?.fiscalReceiptIssuedAt ||
						queueItem?.printedAt?.toISOString(),
					deviceStatus,
				};
			}

			// If hardware still offline or out of paper
			if (!deviceStatus.online || !deviceStatus.paperOk) {
				const offlineMsg =
					deviceStatus.error ||
					(!deviceStatus.online
						? "ККТ недоступна в сети / порт не отвечает"
						: "Отсутствует чековая лента (Out of Paper)");

				if (queueItem) {
					await targetDb
						.update(fiscalReceiptQueue)
						.set({
							status: "hardware_offline",
							lastError: offlineMsg,
							retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
							updatedAt: now,
						})
						.where(
							and(
								eq(fiscalReceiptQueue.id, queueItem.id),
								eq(fiscalReceiptQueue.organizationId, organizationId),
							),
						);
				}

				return {
					success: false,
					status: "hardware_offline",
					paymentId: targetPaymentId,
					queueItemId: queueItem?.id,
					error: offlineMsg,
					deviceStatus,
				};
			}

			// Attempt physical print
			const payload = (queueItem?.payloadJson || {}) as unknown as Ffd12ReceiptPayload;
			let printResult: KktPrintResult;
			try {
				printResult = await LanKktDriverService.printFiscalReceipt(
					payload,
					kktConfig,
				);
			} catch (err: unknown) {
				printResult = {
					success: false,
					status: "hardware_offline",
					receiptIssuedAt: now.toISOString(),
					errorCode: "RETRY_EXCEPTION",
					errorMessage: err instanceof Error ? err.message : String(err),
				};
			}

			if (!printResult.success || printResult.status === "hardware_offline") {
				const printError =
					printResult.errorMessage || "Ошибка повторной фискализации";

				if (queueItem) {
					await targetDb
						.update(fiscalReceiptQueue)
						.set({
							status: "hardware_offline",
							lastError: printError,
							retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
							updatedAt: now,
						})
						.where(
							and(
								eq(fiscalReceiptQueue.id, queueItem.id),
								eq(fiscalReceiptQueue.organizationId, organizationId),
							),
						);
				}

				return {
					success: false,
					status: "hardware_offline",
					paymentId: targetPaymentId,
					queueItemId: queueItem?.id,
					error: printError,
					deviceStatus,
				};
			}

			// Succeeded: update queue item and payment record
			const updatedPayload = {
				...(typeof queueItem?.payloadJson === "object" && queueItem?.payloadJson !== null
					? queueItem.payloadJson
					: {}),
				fnSerial: printResult.fnSerial,
				fiscalDocumentNumber: printResult.fiscalDocumentNumber,
				fiscalSign: printResult.fiscalSign,
				ofdVerificationUrl: printResult.ofdVerificationUrl,
				qrString: printResult.qrString ?? null,
				receiptIssuedAt: printResult.receiptIssuedAt,
			};

			if (queueItem) {
				await targetDb
					.update(fiscalReceiptQueue)
					.set({
						status: "printed",
						printedAt: now,
						lastError: null,
						payloadJson: updatedPayload,
						retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
						updatedAt: now,
					})
					.where(
						and(
							eq(fiscalReceiptQueue.id, queueItem.id),
							eq(fiscalReceiptQueue.organizationId, organizationId),
						),
					);
			}

			await targetDb
				.update(payments)
				.set({
					fiscalReceiptNumber: printResult.fiscalDocumentNumber || null,
					fiscalReceiptIssuedAt: printResult.receiptIssuedAt,
					fiscalReceiptUrl: printResult.ofdVerificationUrl || null,
					fiscalReceipt: {
						fn: printResult.fnSerial,
						fd: printResult.fiscalDocumentNumber,
						fpd: printResult.fiscalSign,
						receiptUrl: printResult.ofdVerificationUrl,
						operationType: "income",
					} as unknown as FiscalReceiptDetails,
					note: `[54-ФЗ] Фискализация успешно завершена повтором: ФД ${printResult.fiscalDocumentNumber}`,
					updatedAt: now,
				})
				.where(
					and(
						eq(payments.id, targetPaymentId),
						eq(payments.organizationId, organizationId),
					),
				);

			return {
				success: true,
				status: "printed",
				paymentId: targetPaymentId,
				queueItemId: queueItem?.id,
				fiscalReceiptNumber: printResult.fiscalDocumentNumber,
				fiscalSign: printResult.fiscalSign,
				ofdUrl: printResult.ofdVerificationUrl,
				receiptIssuedAt: printResult.receiptIssuedAt,
				deviceStatus,
			};
		});
	}

	/**
	 * Fastify endpoint handler for `POST /api/cashbox/transactions/:id/retry-fiscalize`.
	 */
	public static async handleRetryFiscalizeRoute(
		request: FastifyRequest<{ Params: { id: string } }>,
		reply: FastifyReply,
		organizationId: string,
	): Promise<void> {
		const transactionId = request.params.id;
		if (!transactionId) {
			return reply.code(400).send({
				error: "TransactionIdRequired",
				message: "Не указан идентификатор транзакции для повторной фискализации.",
			});
		}

		try {
			const result = await FiscalRetryPolicy.retryFiscalizeTransaction(
				organizationId,
				transactionId,
			);

			if (result.success) {
				return reply.code(200).send({
					success: true,
					status: result.status,
					message: "Фискализация успешно завершена.",
					data: result,
				});
			}

			return reply.code(200).send({
				success: false,
				status: result.status,
				message: result.error || "ККТ временно недоступна, транзакция остается в очереди.",
				data: result,
			});
		} catch (err: unknown) {
			const statusCode =
				(typeof err === "object" && err !== null && "statusCode" in err
					? (err as { statusCode: number }).statusCode
					: 500) || 500;
			const msg = err instanceof Error ? err.message : String(err);
			return reply.code(statusCode).send({
				error: "RetryFiscalizeFailed",
				message: msg,
			});
		}
	}
}
