/**
 * fiscalQueueWorker.ts — 54-FZ Fiscal Receipt Queue Buffer & Auto-Retry Worker.
 * Decouples KKT LAN I/O from PostgreSQL transactions using Outbox Claim -> Print -> Commit.
 */

import { randomInt } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../db/client.js";
import { withSavepoint, withTenantCtx } from "../../../db/rls.js";
import { fiscalReceiptQueue, payments } from "../../../db/schema.js";
import { BoundedTtlMap } from "../../../lib/boundedTtlMap.js";
import { LanKktDriverService } from "../lanKktDriverService.js";
import type { KktDeviceStatus, KktLanConfig, KktPrintResult } from "../types.js";
import {
	buildFiscalReceiptDetails,
	extractTargetPaymentIds,
	isFreshPrinting,
	parseFfd12Payload,
	safeCheckDeviceStatus,
} from "./queuePayloadUtils.js";

export const MAX_FISCAL_RETRIES = 10;

function isNextRetryDue(payloadJson: unknown, nowMs: number): boolean {
	if (!payloadJson || typeof payloadJson !== "object" || !("nextRetryAt" in payloadJson)) {
		return true;
	}
	const raw = payloadJson.nextRetryAt;
	if (typeof raw !== "string" || !raw) return true;
	const ts = Date.parse(raw);
	if (Number.isNaN(ts)) return true;
	return ts <= nowMs;
}

function buildRetryFailurePatch(
	payloadJson: unknown,
	currentRetryCount: number,
	now: Date,
): {
	status: "hardware_offline" | "dead_letter";
	payloadJson: Record<string, unknown>;
} {
	const nextRetryCount = currentRetryCount + 1;
	const isDeadLetter = nextRetryCount >= MAX_FISCAL_RETRIES;
	const nextRetryAt = isDeadLetter
		? null
		: new Date(
				now.getTime() +
					FiscalQueueRetryWorker.calculateNextAttemptDelayMs(
						nextRetryCount,
						5000,
						300000,
						true,
					),
			).toISOString();
	const basePayload =
		typeof payloadJson === "object" && payloadJson !== null
			? (payloadJson as Record<string, unknown>)
			: {};
	return {
		status: isDeadLetter ? "dead_letter" : "hardware_offline",
		payloadJson: {
			...basePayload,
			nextRetryAt,
		},
	};
}

export class FiscalQueueRetryWorker {
	private static orgTimers = new BoundedTtlMap<string, NodeJS.Timeout>({
		maxEntries: 1000,
		touchOnGet: false,
		onEvict: (_orgId, timer) => {
			clearInterval(timer);
		},
	});
	public static logger?: {
		warn: (obj: unknown, msg?: string) => void;
		error: (obj: unknown, msg?: string) => void;
		info?: (obj: unknown, msg?: string) => void;
	} | null = null;

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

	public static async retrySingleReceipt(
		organizationId: string,
		queueItemId: string,
		config?: Partial<KktLanConfig>,
	): Promise<{
		success: boolean;
		status: "printed" | "hardware_offline" | "dead_letter";
		item: typeof fiscalReceiptQueue.$inferSelect | null;
		retryCount: number;
		error?: string | null | undefined;
	}> {
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

			const failurePatch = buildRetryFailurePatch(
				queueItem.payloadJson,
				queueItem.retryCount ?? 0,
				now,
			);
			const updated = await withTenantCtx(organizationId, async (tx) => {
				const targetDb = tx ?? db;
				const [row] = await targetDb
					.update(fiscalReceiptQueue)
					.set({
						status: failurePatch.status,
						lastError: errorMessage,
						payloadJson: failurePatch.payloadJson,
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
				status: failurePatch.status,
				item: updated,
				retryCount: updated?.retryCount ?? queueItem.retryCount + 1,
				error: errorMessage,
			};
		}

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

		return await withTenantCtx(organizationId, async (tx) => {
			const targetDb = tx ?? db;

			if (!printResult.success || printResult.status === "hardware_offline") {
				const errorText = printResult.errorMessage || "KKT print execution failed";
				const failurePatch = buildRetryFailurePatch(
					queueItem.payloadJson,
					queueItem.retryCount ?? 0,
					now,
				);
				const [updated] = await targetDb
					.update(fiscalReceiptQueue)
					.set({
						status: failurePatch.status,
						lastError: errorText,
						payloadJson: failurePatch.payloadJson,
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
					status: failurePatch.status,
					item: updated || null,
					retryCount: updated?.retryCount ?? queueItem.retryCount + 1,
					error: errorText,
				};
			}

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

			const targetPaymentIds = extractTargetPaymentIds(
				queueItem.paymentId,
				queueItem.payloadJson,
			);
			if (targetPaymentIds.length > 0) {
				try {
					const runPaySync = async (syncTx: typeof targetDb) => {
						await syncTx
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
					};
					if (tx) {
						await withSavepoint(tx, runPaySync);
					} else {
						await runPaySync(targetDb);
					}
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

	public static async flushOrganizationQueue(
		organizationId: string,
		config?: Partial<KktLanConfig>,
		options?: { ignoreBackoff?: boolean | undefined },
	): Promise<{
		totalProcessed: number;
		printedCount: number;
		failedCount: number;
		deviceStatus: KktDeviceStatus;
	}> {
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

			const exceededRows = rows.filter(
				(row) => (row.retryCount ?? 0) >= MAX_FISCAL_RETRIES,
			);
			if (exceededRows.length > 0) {
				await targetDb
					.update(fiscalReceiptQueue)
					.set({
						status: "dead_letter",
						lastError: "Превышен лимит попыток фискализации (dead_letter)",
						updatedAt: claimTime,
					})
					.where(
						and(
							inArray(
								fiscalReceiptQueue.id,
								exceededRows.map((row) => row.id),
							),
							eq(fiscalReceiptQueue.organizationId, organizationId),
						),
					);
			}

			const eligible = rows.filter(
				(row) =>
					(row.retryCount ?? 0) < MAX_FISCAL_RETRIES &&
					!isFreshPrinting(row, claimTime.getTime()) &&
					(options?.ignoreBackoff || isNextRetryDue(row.payloadJson, claimTime.getTime())),
			);
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
				const failurePatch = buildRetryFailurePatch(
					item.payloadJson,
					item.retryCount ?? 0,
					now,
				);

				await withTenantCtx(organizationId, async (tx) => {
					const targetDb = tx ?? db;
					await targetDb
						.update(fiscalReceiptQueue)
						.set({
							status: failurePatch.status,
							lastError: offlineError,
							payloadJson: failurePatch.payloadJson,
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

			await withTenantCtx(organizationId, async (tx) => {
				const targetDb = tx ?? db;
				if (!printResult.success || printResult.status === "hardware_offline") {
					const failurePatch = buildRetryFailurePatch(
						item.payloadJson,
						item.retryCount ?? 0,
						now,
					);
					await targetDb
						.update(fiscalReceiptQueue)
						.set({
							status: failurePatch.status,
							lastError: printResult.errorMessage || "KKT print execution failed",
							payloadJson: failurePatch.payloadJson,
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
							const runBatchPaySync = async (syncTx: typeof targetDb) => {
								await syncTx
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
							};
							if (tx) {
								await withSavepoint(tx, runBatchPaySync);
							} else {
								await runBatchPaySync(targetDb);
							}
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

	public static isAutoRetryRunning(organizationId?: string): boolean {
		if (organizationId !== undefined) {
			return this.orgTimers.has(organizationId);
		}
		return this.orgTimers.size > 0;
	}
}
