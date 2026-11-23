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

import { randomInt } from "node:crypto";
import type { FiscalReceiptDetails } from "@dental/shared";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { fiscalReceiptQueue, payments } from "../../db/schema.js";
import { type Ffd12ReceiptPayload } from "../kkt/FiscalReceiptFactory.js";
import { LanKktDriverService } from "./lanKktDriverService.js";
import type { KktDeviceStatus, KktLanConfig, KktPrintResult } from "./types.js";

function parseFfd12Payload(val: unknown): Ffd12ReceiptPayload {
	if (val && typeof val === "object" && !Array.isArray(val)) {
		return val as Ffd12ReceiptPayload;
	}
	return {} as Ffd12ReceiptPayload;
}

function buildFiscalReceiptDetails(
	payload: Ffd12ReceiptPayload,
	printResult: KktPrintResult,
): FiscalReceiptDetails {
	const opTypeMap: Record<number, FiscalReceiptDetails["operationType"]> = {
		1: "income",
		2: "income_return",
		3: "expense",
		4: "expense_return",
	};
	return {
		fn: printResult.fnSerial ?? null,
		fd: printResult.fiscalDocumentNumber ?? null,
		fpd: printResult.fiscalSign ?? null,
		receiptUrl: printResult.ofdVerificationUrl ?? null,
		cashierName: payload.tag1021_cashierName ?? null,
		operationType: opTypeMap[payload.tag1054_operationType] ?? "income",
	};
}

const STALE_PRINTING_THRESHOLD_MS = 2 * 60 * 1000;

function isFreshPrinting(
	item: { status: string; updatedAt: Date | string | null | undefined },
	nowMs: number,
): boolean {
	if (item.status !== "printing" || !item.updatedAt) {
		return false;
	}
	const updatedAtMs =
		item.updatedAt instanceof Date
			? item.updatedAt.getTime()
			: new Date(item.updatedAt).getTime();
	if (!Number.isFinite(updatedAtMs)) {
		return false;
	}
	return nowMs - updatedAtMs < STALE_PRINTING_THRESHOLD_MS;
}

function extractTargetPaymentIds(
	paymentId: string | null | undefined,
	payloadJson: unknown,
): string[] {
	const ids = new Set<string>();
	if (typeof paymentId === "string" && paymentId.length > 0) {
		ids.add(paymentId);
	}
	if (
		typeof payloadJson === "object" &&
		payloadJson !== null &&
		"createdPaymentIds" in payloadJson
	) {
		const rawCreatedIds: unknown = payloadJson.createdPaymentIds;
		if (Array.isArray(rawCreatedIds)) {
			for (const entry of rawCreatedIds) {
				const candidate: unknown = entry;
				if (typeof candidate === "string" && candidate.length > 0) {
					ids.add(candidate);
				}
			}
		}
	}
	return Array.from(ids);
}

async function safeCheckDeviceStatus(config?: Partial<KktLanConfig>): Promise<KktDeviceStatus> {
	try {
		return await LanKktDriverService.checkDeviceStatus(config);
	} catch (err: unknown) {
		return {
			online: false,
			paperOk: false,
			coverClosed: true,
			fnPresent: false,
			fnFiscalized: false,
			modelName: "Offline",
			fnSerial: "",
			kktSerialNumber: "",
			lastCheckAt: new Date().toISOString(),
			latencyMs: 0,
			error: err instanceof Error ? err.message : "KKT device status check failed",
		};
	}
}

export class FiscalQueueRetryWorker {
	private static orgTimers = new Map<string, NodeJS.Timeout>();
	public static logger?: {
		warn: (obj: unknown, msg?: string) => void;
		error: (obj: unknown, msg?: string) => void;
		info?: (obj: unknown, msg?: string) => void;
	} | null = null;

	/**
	 * Calculates exponential backoff with full jitter for offline queue retry attempts:
	 * retry 0 -> ~1000ms
	 * retry 1 -> ~2000ms
	 * retry 2 -> ~4000ms
	 * max -> 60000ms
	 */
	public static calculateNextAttemptDelayMs(
		retryCount: number,
		initialBackoffMs = 1000,
		maxBackoffMs = 60000,
		jitter = true,
	): number {
		const exp = Math.min(Math.max(0, retryCount), 10);
		const rawBackoff = Math.min(maxBackoffMs, initialBackoffMs * Math.pow(2, exp));
		if (!jitter) return Math.round(rawBackoff);
		const factor = 0.5 + randomInt(0, 1000) / 2000;
		return Math.max(100, Math.round(rawBackoff * factor));
	}

	public static calculateExponentialBackoff(
		retryCount: number,
		initialBackoffMs = 1000,
		maxBackoffMs = 60000,
		jitter = true,
	): number {
		return this.calculateNextAttemptDelayMs(
			retryCount,
			initialBackoffMs,
			maxBackoffMs,
			jitter,
		);
	}

	/**
	 * Retries a single queued fiscal receipt item with statutory 54-FZ validation.
	 * Executes network I/O outside of PostgreSQL transaction (Outbox Pattern).
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
		// Step 1: Claim queue item atomically inside tenant transaction BEFORE external KKT I/O
		const claimTime = new Date();
		const claimResult = await withTenantCtx(organizationId, async (tx) => {
			const targetDb = tx ?? db;
			const selectQuery = targetDb
				.select()
				.from(fiscalReceiptQueue)
				.where(
					and(
						eq(fiscalReceiptQueue.id, queueItemId),
						eq(fiscalReceiptQueue.organizationId, organizationId),
					),
				)
				.limit(1);
			const rows = await (
				typeof selectQuery === "object" &&
				selectQuery !== null &&
				"for" in selectQuery &&
				typeof selectQuery.for === "function"
					? selectQuery.for("update", { skipLocked: true })
					: selectQuery
			);
			const item = rows[0] ?? null;

			if (!item) {
				return { kind: "not_found" as const };
			}
			if (item.status === "printed") {
				return { kind: "already_printed" as const, item };
			}
			if (isFreshPrinting(item, claimTime.getTime())) {
				return { kind: "already_printing" as const, item };
			}

			const [claimed] = await targetDb
				.update(fiscalReceiptQueue)
				.set({
					status: "printing",
					updatedAt: claimTime,
				})
				.where(
					and(
						eq(fiscalReceiptQueue.id, queueItemId),
						eq(fiscalReceiptQueue.organizationId, organizationId),
					),
				)
				.returning();

			return { kind: "claimed" as const, item: claimed ?? item };
		});

		if (claimResult.kind === "not_found") {
			return {
				success: false,
				status: "hardware_offline",
				item: null,
				retryCount: 0,
				error: "QueueItemNotFound",
			};
		}

		// If already printed, return idempotent success
		if (claimResult.kind === "already_printed") {
			return {
				success: true,
				status: "printed",
				item: claimResult.item,
				retryCount: claimResult.item.retryCount,
				error: null,
			};
		}

		if (claimResult.kind === "already_printing") {
			return {
				success: false,
				status: "hardware_offline",
				item: claimResult.item,
				retryCount: claimResult.item.retryCount,
				error: "PrintAlreadyInProgress",
			};
		}

		const queueItem = claimResult.item;
		const now = new Date();
		const deviceStatus = await safeCheckDeviceStatus(config);

		if (!deviceStatus.online || !deviceStatus.paperOk) {
			const errorMessage =
				deviceStatus.error ||
				(!deviceStatus.online
					? "KKT connection timed out or printer offline in clinic LAN"
					: "Отсутствует чековая лента (Out of Paper)");

			const updated = await withTenantCtx(organizationId, async (tx) => {
				const targetDb = tx ?? db;
				const [row] = await targetDb
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
				return row || null;
			});

			return {
				success: false,
				status: "hardware_offline",
				item: updated,
				retryCount: updated?.retryCount ?? queueItem.retryCount + 1,
				error: errorMessage,
			};
		}

		// Step 2: Execute actual hardware print OUTSIDE of database transaction
		const payload = parseFfd12Payload(queueItem.payloadJson);
		let printResult: KktPrintResult;
		try {
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

		// Step 3: Fast transactional commit of results
		return await withTenantCtx(organizationId, async (tx) => {
			const targetDb = tx ?? db;

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

			// If attached to payments (including split tenders), sync fiscal attributes to all matching payment records
			const targetPaymentIds = extractTargetPaymentIds(
				queueItem.paymentId,
				queueItem.payloadJson,
			);
			if (targetPaymentIds.length > 0) {
				try {
					await targetDb
						.update(payments)
						.set({
							fiscalReceiptNumber: printResult.fiscalDocumentNumber ?? null,
							fiscalReceiptIssuedAt: printResult.receiptIssuedAt,
							fiscalReceiptUrl: printResult.ofdVerificationUrl ?? null,
							fiscalReceipt: buildFiscalReceiptDetails(payload, printResult),
							updatedAt: now,
						})
						.where(
							and(
								inArray(payments.id, targetPaymentIds),
								eq(payments.organizationId, organizationId),
							),
						);
				} catch (paySyncErr) {
					FiscalQueueRetryWorker.logger?.warn(
						{ paySyncErr, paymentIds: targetPaymentIds },
						`[FiscalQueueRetryWorker] Failed to sync fiscal receipt to payments ${targetPaymentIds.join(", ")}`,
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
	 * Executes network I/O per item outside of PostgreSQL transactions.
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
		// Step 1: Claim pending/stale items inside tenant transaction BEFORE external KKT I/O
		const claimTime = new Date();
		const pendingItems = await withTenantCtx(organizationId, async (tx) => {
			const targetDb = tx ?? db;
			const selectQuery = targetDb
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

			const rows = await (
				typeof selectQuery === "object" &&
				selectQuery !== null &&
				"for" in selectQuery &&
				typeof selectQuery.for === "function"
					? selectQuery.for("update", { skipLocked: true })
					: selectQuery
			);

			const eligible = rows.filter((row) => !isFreshPrinting(row, claimTime.getTime()));
			if (eligible.length === 0) {
				return [];
			}

			const eligibleIds = eligible.map((row) => row.id);
			await targetDb
				.update(fiscalReceiptQueue)
				.set({
					status: "printing",
					updatedAt: claimTime,
				})
				.where(
					and(
						inArray(fiscalReceiptQueue.id, eligibleIds),
						eq(fiscalReceiptQueue.organizationId, organizationId),
					),
				);

			return eligible;
		});

		const deviceStatus = await safeCheckDeviceStatus(config);

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

				await withTenantCtx(organizationId, async (tx) => {
					const targetDb = tx ?? db;
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
				});
				failedCount++;
				continue;
			}

			// Step 2: Attempt hardware print OUTSIDE database transaction
			let printResult: KktPrintResult;
			const payload = parseFfd12Payload(item.payloadJson);
			try {
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

			// Step 3: Fast transactional update
			await withTenantCtx(organizationId, async (tx) => {
				const targetDb = tx ?? db;
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

					const targetPaymentIds = extractTargetPaymentIds(
						item.paymentId,
						item.payloadJson,
					);
					if (targetPaymentIds.length > 0) {
						try {
							await targetDb
								.update(payments)
								.set({
									fiscalReceiptNumber: printResult.fiscalDocumentNumber ?? null,
									fiscalReceiptIssuedAt: printResult.receiptIssuedAt,
									fiscalReceiptUrl: printResult.ofdVerificationUrl ?? null,
									fiscalReceipt: buildFiscalReceiptDetails(payload, printResult),
									updatedAt: now,
								})
								.where(
									and(
										inArray(payments.id, targetPaymentIds),
										eq(payments.organizationId, organizationId),
									),
								);
						} catch (paySyncErr) {
							FiscalQueueRetryWorker.logger?.warn(
								{ paySyncErr, paymentIds: targetPaymentIds },
								`[FiscalQueueRetryWorker] Failed to sync payments ${targetPaymentIds.join(", ")}`,
							);
						}
					}

					printedCount++;
				}
			});
		}

		return {
			totalProcessed: pendingItems.length,
			printedCount,
			failedCount,
			deviceStatus,
		};
	}

	/**
	 * Starts background auto-retry timer (e.g. every 30 seconds).
	 */
	public static startAutoRetryLoop(
		organizationId: string,
		intervalMs = 30000,
		logger?: {
			warn: (obj: unknown, msg?: string) => void;
			error: (obj: unknown, msg?: string) => void;
			info?: (obj: unknown, msg?: string) => void;
		},
	): void {
		if (logger) {
			this.logger = logger;
		}
		if (this.orgTimers.has(organizationId)) return;
		const timer = setInterval(async () => {
			try {
				await this.flushOrganizationQueue(organizationId);
			} catch (err) {
				FiscalQueueRetryWorker.logger?.error(
					{ err, organizationId },
					"[FiscalQueueRetryWorker] Auto-retry tick error",
				);
			}
		}, intervalMs);
		timer.unref();
		this.orgTimers.set(organizationId, timer);
	}

	/**
	 * Stops background auto-retry timer (for one organization or all organizations).
	 */
	public static stopAutoRetryLoop(organizationId?: string): void {
		if (organizationId !== undefined) {
			const timer = this.orgTimers.get(organizationId);
			if (timer) {
				clearInterval(timer);
				this.orgTimers.delete(organizationId);
			}
			return;
		}
		for (const timer of this.orgTimers.values()) {
			clearInterval(timer);
		}
		this.orgTimers.clear();
	}

	/**
	 * Checks if auto-retry loop is running (for one organization or any organization).
	 */
	public static isAutoRetryRunning(organizationId?: string): boolean {
		if (organizationId !== undefined) {
			return this.orgTimers.has(organizationId);
		}
		return this.orgTimers.size > 0;
	}
}

export const FiscalReceiptQueueService = FiscalQueueRetryWorker;

