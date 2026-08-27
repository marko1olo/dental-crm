/**
 * DENTE Dental CRM — 54-FZ Fiscal Receipt Queue Buffer & Auto-Retry Worker.
 *
 * Statutory resilience engine for fiscal cash registers (ATOL, Shtrikh-M) and 54-FZ FFD 1.2:
 * - PostgreSQL transactional queue buffer (`fiscal_receipt_queue`)
 * - Multi-tenant RLS isolation (`organizationId`)
 * - Integer kopecks math (0 float guarantee)
 * - Automatic background retry loop with exponential backoff & full jitter
 * - Direct LanKktDriverService execution on hardware recovery
 * - Atomic sync of fiscal document numbers, fiscal signs, and OFD URLs to `payments`
 */

import type { FiscalReceiptDetails } from "@dental/shared";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { fiscalReceiptQueue, payments } from "../../db/schema.js";
import { type Ffd12ReceiptPayload } from "../kkt/FiscalReceiptFactory.js";
import { LanKktDriverService } from "./lanKktDriverService.js";
import type { KktDeviceStatus, KktLanConfig, KktPrintResult } from "./types.js";

export class FiscalQueueRetryWorker {
	private static isRunning = false;
	private static intervalTimer: NodeJS.Timeout | null = null;

	/**
	 * Calculates exponential backoff with full jitter for offline queue retry attempts:
	 * retry 0 -> ~1000ms
	 * retry 1 -> ~2000ms
	 * retry 2 -> ~4000ms
	 * retry 3 -> ~8000ms
	 * capped at maxBackoffMs (default 60000ms).
	 */
	public static calculateExponentialBackoff(
		retryCount: number,
		initialBackoffMs = 1000,
		maxBackoffMs = 60000,
		jitter = true,
	): number {
		const exp = Math.min(Math.max(0, retryCount), 10);
		const rawBackoff = Math.min(maxBackoffMs, initialBackoffMs * Math.pow(2, exp));
		if (!jitter) return Math.round(rawBackoff);
		const factor = 0.5 + Math.random() * 0.5;
		return Math.max(100, Math.round(rawBackoff * factor));
	}

	/**
	 * Retries a single queued fiscal receipt item with statutory 54-FZ validation.
	 */
	public static async retrySingleReceipt(
		organizationId: string,
		queueItemId: string,
		config?: Partial<KktLanConfig>,
	): Promise<{
		success: boolean;
		status: "printed" | "hardware_offline";
		item: typeof fiscalReceiptQueue.$inferSelect | null;
		retryCount: number;
		error?: string | null | undefined;
	}> {
		const deviceStatus = await LanKktDriverService.checkDeviceStatus(config);

		return await withTenantCtx(organizationId, async (tx) => {
			const targetDb = tx ?? db;

			const [queueItem] = await targetDb
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.id, queueItemId),
						eq(fiscalReceiptQueue.organizationId, organizationId),
					),
				)
				.limit(1);

			if (!queueItem) {
				return {
					success: false,
					status: "hardware_offline",
					item: null,
					retryCount: 0,
					error: "QueueItemNotFound",
				};
			}

			// If already printed, return idempotent success
			if (queueItem.status === "printed") {
				return {
					success: true,
					status: "printed",
					item: queueItem,
					retryCount: queueItem.retryCount,
					error: null,
				};
			}

			const now = new Date();

			if (!deviceStatus.online || !deviceStatus.paperOk) {
				const errorMessage =
					deviceStatus.error ||
					(!deviceStatus.online
						? "KKT connection timed out or printer offline in clinic LAN"
						: "Отсутствует чековая лента (Out of Paper)");

				const [updated] = await targetDb
					.update(fiscalReceiptQueue)
					.set({
						status: "hardware_offline",
						lastError: errorMessage,
						retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
						updatedAt: now,
					})
					.where(
						and(
							eq(fiscalReceiptQueue.id, queueItemId),
							eq(fiscalReceiptQueue.organizationId, organizationId),
						),
					)
					.returning();

				return {
					success: false,
					status: "hardware_offline",
					item: updated || null,
					retryCount: updated?.retryCount ?? queueItem.retryCount + 1,
					error: errorMessage,
				};
			}

			// Execute actual hardware print
			let printResult: KktPrintResult;
			try {
				const payload = (queueItem.payloadJson || {}) as unknown as Ffd12ReceiptPayload;
				printResult = await LanKktDriverService.printFiscalReceipt(payload, config);
			} catch (err: unknown) {
				const printErrorMsg = err instanceof Error ? err.message : "LanKktDriver print error";
				printResult = {
					success: false,
					status: "hardware_offline",
					receiptIssuedAt: now.toISOString(),
					errorCode: "PRINT_EXCEPTION",
					errorMessage: printErrorMsg,
				};
			}

			if (!printResult.success || printResult.status === "hardware_offline") {
				const errorText = printResult.errorMessage || "KKT print execution failed";
				const [updated] = await targetDb
					.update(fiscalReceiptQueue)
					.set({
						status: "hardware_offline",
						lastError: errorText,
						retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
						updatedAt: now,
					})
					.where(
						and(
							eq(fiscalReceiptQueue.id, queueItemId),
							eq(fiscalReceiptQueue.organizationId, organizationId),
						),
					)
					.returning();

				return {
					success: false,
					status: "hardware_offline",
					item: updated || null,
					retryCount: updated?.retryCount ?? queueItem.retryCount + 1,
					error: errorText,
				};
			}

			// Print succeeded: persist fiscal document attributes into payloadJson
			const updatedPayload = {
				...(typeof queueItem.payloadJson === "object" && queueItem.payloadJson !== null
					? queueItem.payloadJson
					: {}),
				fnSerial: printResult.fnSerial,
				fiscalDocumentNumber: printResult.fiscalDocumentNumber,
				fiscalSign: printResult.fiscalSign,
				ofdVerificationUrl: printResult.ofdVerificationUrl,
				qrString: printResult.qrString ?? null,
				receiptIssuedAt: printResult.receiptIssuedAt,
			};

			const [updated] = await targetDb
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
						eq(fiscalReceiptQueue.id, queueItemId),
						eq(fiscalReceiptQueue.organizationId, organizationId),
					),
				)
				.returning();

			// If attached to a payment, sync fiscal attributes to the payment record
			if (queueItem.paymentId) {
				try {
					await targetDb
						.update(payments)
						.set({
							fiscalReceiptNumber: printResult.fiscalDocumentNumber ?? null,
							fiscalReceiptIssuedAt: printResult.receiptIssuedAt,
							fiscalReceiptUrl: printResult.ofdVerificationUrl ?? null,
							fiscalReceipt: updatedPayload as unknown as FiscalReceiptDetails,
							updatedAt: now,
						})
						.where(
							and(
								eq(payments.id, queueItem.paymentId),
								eq(payments.organizationId, organizationId),
							),
						);
				} catch (paySyncErr) {
					console.warn(
						`[FiscalQueueRetryWorker] Failed to sync fiscal receipt to payment ${queueItem.paymentId}:`,
						paySyncErr,
					);
				}
			}

			return {
				success: true,
				status: "printed",
				item: updated || null,
				retryCount: updated?.retryCount ?? queueItem.retryCount + 1,
				error: null,
			};
		});
	}

	/**
	 * Retries all pending and offline fiscal receipts for an organization.
	 */
	public static async flushOrganizationQueue(
		organizationId: string,
		config?: Partial<KktLanConfig>,
	): Promise<{
		totalProcessed: number;
		printedCount: number;
		failedCount: number;
		deviceStatus: KktDeviceStatus;
	}> {
		const deviceStatus = await LanKktDriverService.checkDeviceStatus(config);

		return await withTenantCtx(organizationId, async (tx) => {
			const targetDb = tx ?? db;
			const pendingItems = await targetDb
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.organizationId, organizationId),
						inArray(fiscalReceiptQueue.status, [
							"pending_print",
							"hardware_offline",
							"offline_pending",
							"printing",
						]),
					),
				)
				.orderBy(fiscalReceiptQueue.createdAt);

			if (pendingItems.length === 0) {
				return {
					totalProcessed: 0,
					printedCount: 0,
					failedCount: 0,
					deviceStatus,
				};
			}

			let printedCount = 0;
			let failedCount = 0;
			const now = new Date();

			for (const item of pendingItems) {
				if (!deviceStatus.online || !deviceStatus.paperOk) {
					const offlineError =
						deviceStatus.error ||
						(!deviceStatus.online
							? "KKT hardware offline or connection timed out"
							: "Отсутствует чековая лента (Out of Paper)");

					await targetDb
						.update(fiscalReceiptQueue)
						.set({
							status: "hardware_offline",
							lastError: offlineError,
							retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
							updatedAt: now,
						})
						.where(
							and(
								eq(fiscalReceiptQueue.id, item.id),
								eq(fiscalReceiptQueue.organizationId, organizationId),
							),
						);
					failedCount++;
					continue;
				}

				// Attempt hardware print
				let printResult: KktPrintResult;
				try {
					const payload = (item.payloadJson || {}) as unknown as Ffd12ReceiptPayload;
					printResult = await LanKktDriverService.printFiscalReceipt(payload, config);
				} catch (err: unknown) {
					const printErrorMsg = err instanceof Error ? err.message : "LAN print error";
					printResult = {
						success: false,
						status: "hardware_offline",
						receiptIssuedAt: now.toISOString(),
						errorCode: "PRINT_ERROR",
						errorMessage: printErrorMsg,
					};
				}

				if (!printResult.success || printResult.status === "hardware_offline") {
					await targetDb
						.update(fiscalReceiptQueue)
						.set({
							status: "hardware_offline",
							lastError: printResult.errorMessage || "KKT print execution failed",
							retryCount: sql`${fiscalReceiptQueue.retryCount} + 1`,
							updatedAt: now,
						})
						.where(
							and(
								eq(fiscalReceiptQueue.id, item.id),
								eq(fiscalReceiptQueue.organizationId, organizationId),
							),
						);
					failedCount++;
				} else {
					const updatedPayload = {
						...(typeof item.payloadJson === "object" && item.payloadJson !== null
							? item.payloadJson
							: {}),
						fnSerial: printResult.fnSerial,
						fiscalDocumentNumber: printResult.fiscalDocumentNumber,
						fiscalSign: printResult.fiscalSign,
						ofdVerificationUrl: printResult.ofdVerificationUrl,
						qrString: printResult.qrString ?? null,
						receiptIssuedAt: printResult.receiptIssuedAt,
					};

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
								eq(fiscalReceiptQueue.id, item.id),
								eq(fiscalReceiptQueue.organizationId, organizationId),
							),
						);

					if (item.paymentId) {
						try {
							await targetDb
								.update(payments)
								.set({
									fiscalReceiptNumber: printResult.fiscalDocumentNumber ?? null,
									fiscalReceiptIssuedAt: printResult.receiptIssuedAt,
									fiscalReceiptUrl: printResult.ofdVerificationUrl ?? null,
									fiscalReceipt: updatedPayload as unknown as FiscalReceiptDetails,
									updatedAt: now,
								})
								.where(
									and(
										eq(payments.id, item.paymentId),
										eq(payments.organizationId, organizationId),
									),
								);
						} catch (paySyncErr) {
							console.warn(
								`[FiscalQueueRetryWorker] Failed to sync payment ${item.paymentId}:`,
								paySyncErr,
							);
						}
					}

					printedCount++;
				}
			}

			return {
				totalProcessed: pendingItems.length,
				printedCount,
				failedCount,
				deviceStatus,
			};
		});
	}

	/**
	 * Starts background auto-retry timer (e.g. every 30 seconds).
	 */
	public static startAutoRetryLoop(organizationId: string, intervalMs = 30000): void {
		if (this.isRunning) return;
		this.isRunning = true;
		this.intervalTimer = setInterval(async () => {
			try {
				await this.flushOrganizationQueue(organizationId);
			} catch (err) {
				console.error("[FiscalQueueRetryWorker] Auto-retry tick error:", err);
			}
		}, intervalMs);
	}

	/**
	 * Stops background auto-retry timer.
	 */
	public static stopAutoRetryLoop(): void {
		if (this.intervalTimer) {
			clearInterval(this.intervalTimer);
			this.intervalTimer = null;
		}
		this.isRunning = false;
	}

	/**
	 * Checks if auto-retry loop is running.
	 */
	public static isAutoRetryRunning(): boolean {
		return this.isRunning;
	}
}
