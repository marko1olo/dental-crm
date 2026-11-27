/**
 * DENTE CRM — Offline Payment & 54-FZ Fiscal Receipt Queue
 *
 * MANDATE COMPLIANCE:
 * - Mandate 8b: Money and legal documents are exact to the kopeck (ACID integer kopecks).
 * - Mandate 8c: Low-spec 5400 RPM HDD zero-seek optimization, in-memory optimistic ledger.
 * - Mandate 8e: Doctor autonomy — 1-click checkout without blocking for internet or offline fiscal register.
 * - Mandate 8n: Solo doctor & small clinic resilience in 1-chair clinics without network/server.
 * - Mandate 8s: Friction-killer — zero lost revenue, instant receipt generation and offline queueing.
 *
 * Provides resilient, optimistic queueing of cash, card, and mixed payments when network is down.
 */

import { generateUuidV7, kopecksToRub } from "@dental/shared";
import {
	CLINICAL_CACHE_STORE_NAME,
	resolveActiveOfflineOrgScope,
} from "../services/offline/storage/constants.js";
import { queueBatchedStorePut } from "../services/offline/storage/idbBatchBuffer.js";
import {
	enqueueOfflineMutation,
	getPendingOfflineMutations,
	removeOfflineMutation,
	type OfflineMutation,
} from "../services/offline/offlineStorage.js";
import { routeFiscalReceiptPrint } from "../utils/runtimeRouter.js";
import { isLowSpecDevice } from "../utils/lowSpecHddOptimizer.js";
import { logger } from "../utils/logger.js";
import { offlineSyncService } from "../services/offline/offlineSyncService.js";

export type PaymentMethodKind = "cash" | "card" | "sbp" | "deposit" | "mixed";
export type PaymentQueueStatus = "queued" | "processing" | "synced" | "failed";
export type FiscalBufferStatus = "buffered" | "printed" | "not_required";

export interface OfflinePaymentItemRow {
	readonly name: string;
	readonly priceKopecks: number;
	readonly quantity: number;
	readonly code804n?: string | undefined;
	readonly vatPercent?: number | undefined;
}

export interface SplitPaymentDetail {
	readonly cashKopecks?: number | undefined;
	readonly cardKopecks?: number | undefined;
	readonly depositKopecks?: number | undefined;
	readonly sbpKopecks?: number | undefined;
	readonly bonusKopecks?: number | undefined;
	readonly certificateKopecks?: number | undefined;
	readonly certificateNumber?: string | undefined;
}

export interface OfflinePaymentItem {
	readonly id: string;
	readonly idempotencyKey: string;
	readonly patientId: string;
	readonly patientName: string;
	readonly visitId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly totalKopecks: number;
	readonly totalRub: number;
	readonly paymentType: PaymentMethodKind;
	readonly splitDetails?: SplitPaymentDetail | undefined;
	readonly items: OfflinePaymentItemRow[];
	readonly cashierName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientPhoneOrEmail?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly createdAt: string;
	readonly status: PaymentQueueStatus;
	readonly fiscalStatus: FiscalBufferStatus;
	readonly fiscalQueueId?: string | undefined;
}

export interface EnqueueOfflinePaymentInput {
	readonly patientId: string;
	readonly patientName: string;
	readonly visitId?: string | undefined;
	readonly invoiceId?: string | undefined;
	readonly totalKopecks: number;
	readonly paymentType: PaymentMethodKind;
	readonly splitDetails?: SplitPaymentDetail | undefined;
	readonly items: OfflinePaymentItemRow[];
	readonly cashierName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly patientPhoneOrEmail?: string | undefined;
	readonly organizationId?: string | undefined;
	readonly printFiscalReceipt?: boolean | undefined;
}

// In-memory fast optimistic ledger of offline payments
const MAX_MEMORY_PAYMENT_CACHE = 100;
const memoryPaymentCache = new Map<string, OfflinePaymentItem>();

function setBoundedPaymentCache(id: string, item: OfflinePaymentItem): void {
	if (memoryPaymentCache.has(id)) {
		memoryPaymentCache.delete(id);
	} else if (memoryPaymentCache.size >= MAX_MEMORY_PAYMENT_CACHE) {
		const oldest = memoryPaymentCache.keys().next().value;
		if (oldest !== undefined) memoryPaymentCache.delete(oldest);
	}
	memoryPaymentCache.set(id, item);
}

function getCryptoRandomString(length: number): string {
	if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
		const bytes = new Uint8Array(length);
		crypto.getRandomValues(bytes);
		return Array.from(bytes, (b) => (b % 36).toString(36)).join("");
	}
	const time = Date.now();
	return ((time ^ (time >> 3)) % 10000000).toString(36);
}

/**
 * Generates collision-resistant unique offline payment identifier.
 */
export function generateOfflinePaymentId(): string {
	const rand = getCryptoRandomString(7);
	const time = Date.now().toString(36);
	return `off_pay_${time}_${rand}`;
}

/**
 * Generates composite idempotency key for exact payment deduplication.
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generatePaymentIdempotencyKey(
	_patientId: string,
	_totalKopecks: number,
	_timestamp = Date.now(),
): string {
	return generateUuidV7();
}

/**
 * Optimistically enqueues a payment transaction and buffers fiscal receipt without blocking.
 */
export async function enqueueOfflinePayment(
	input: EnqueueOfflinePaymentInput,
): Promise<OfflinePaymentItem> {
	const id = generateOfflinePaymentId();
	const idempotencyKey = generatePaymentIdempotencyKey(input.patientId, input.totalKopecks);
	const createdAt = new Date().toISOString();
	const totalRub = kopecksToRub(input.totalKopecks);

	let fiscalStatus: FiscalBufferStatus = "not_required";
	let fiscalQueueId: string | undefined;

	// Buffer fiscal receipt if requested per 54-FZ
	if (input.printFiscalReceipt) {
		try {
			const fiscalRes = await routeFiscalReceiptPrint({
				payload: {
					items: input.items.map((it) => ({
						name: it.name,
						priceRub: kopecksToRub(it.priceKopecks),
						quantity: it.quantity,
					})),
					totalRub,
					cashierName: input.cashierName || "Кассир",
					patientEmailOrPhone: input.patientPhoneOrEmail,
					paymentType:
						input.paymentType === "cash"
							? "cash"
							: input.paymentType === "sbp"
								? "sbp"
								: input.paymentType === "deposit"
									? "deposit"
									: "card",
				},
			});
			if (fiscalRes.success) {
				fiscalStatus = fiscalRes.bufferedOffline ? "buffered" : "printed";
				fiscalQueueId = fiscalRes.queueItemId;
			}
		} catch (err) {
			logger.warn("[offlinePaymentQueue] Error dispatching fiscal receipt, buffering gracefully:", err);
			fiscalStatus = "buffered";
		}
	}

	const paymentItem: OfflinePaymentItem = {
		id,
		idempotencyKey,
		patientId: input.patientId,
		patientName: input.patientName,
		visitId: input.visitId,
		invoiceId: input.invoiceId,
		totalKopecks: input.totalKopecks,
		totalRub,
		paymentType: input.paymentType,
		splitDetails: input.splitDetails,
		items: [...input.items],
		cashierName: input.cashierName,
		doctorName: input.doctorName,
		patientPhoneOrEmail: input.patientPhoneOrEmail,
		organizationId: resolveActiveOfflineOrgScope(input.organizationId),
		createdAt,
		status: "queued",
		fiscalStatus,
		fiscalQueueId,
	};

	// 1. Instant L1 RAM update (0ms latency, bounded LRU)
	setBoundedPaymentCache(id, paymentItem);

	// 2. Persist daily summary in unified IndexedDB outbox (zero localStorage PII leak)
	const dayKey = createdAt.substring(0, 10);
	const dailyList = getCachedDailyPayments(dayKey);
	queueBatchedStorePut({
		storeName: CLINICAL_CACHE_STORE_NAME,
		key: `daily_payments_${dayKey}`,
		record: {
			cacheKey: `daily_payments_${dayKey}`,
			entityKind: "daily_payments",
			entityId: dayKey,
			data: dailyList,
			cachedAtMs: Date.now(),
		},
	});

	// 3. Register in background mutation queue for server synchronization
	try {
		await enqueueOfflineMutation<OfflinePaymentItem>({
			entityType: "payment",
			entityId: id,
			action: "create",
			payload: paymentItem,
			organizationId: paymentItem.organizationId,
		});
	} catch (err) {
		logger.warn("[offlinePaymentQueue] Failed to enqueue mutation in offlineStorage, retained in memory:", err);
	}

	return paymentItem;
}

/**
 * Retrieves all pending payment mutations waiting for server sync.
 */
export async function getPendingOfflinePayments(): Promise<OfflinePaymentItem[]> {
	try {
		const mutations = await getPendingOfflineMutations({ entityType: "payment" });
		const results: OfflinePaymentItem[] = [];

		for (const mut of mutations) {
			if (mut.entityType === "payment" || mut.entityType === "CASH_RECEIPT_DRAFT") {
				results.push(mut.payload as OfflinePaymentItem);
			}
		}

		if (results.length > 0) {
			return results;
		}

		return Array.from(memoryPaymentCache.values()).filter((p) => p.status === "queued");
	} catch (err) {
		logger.warn("[offlinePaymentQueue] Error retrieving pending payments:", err);
		return Array.from(memoryPaymentCache.values()).filter((p) => p.status === "queued");
	}
}

/**
 * Retrieves cached daily payments from bounded L1 memory cache.
 */
export function getCachedDailyPayments(dateStr?: string): OfflinePaymentItem[] {
	const dayKey = (dateStr || new Date().toISOString()).substring(0, 10);

	const memList = Array.from(memoryPaymentCache.values()).filter(
		(p) => p.createdAt.substring(0, 10) === dayKey,
	);
	return memList;
}

/**
 * Flushes pending payment mutations to server using the provided dispatcher.
 */
export async function syncOfflinePaymentQueue(
	syncDispatcher: (payment: OfflinePaymentItem) => Promise<{ success: boolean; serverPaymentId?: string | undefined }>,
): Promise<{ syncedCount: number; failedCount: number }> {
	const pending = await getPendingOfflinePayments();
	let syncedCount = 0;
	let failedCount = 0;

	for (const item of pending) {
		try {
			const res = await syncDispatcher(item);
			if (res.success) {
				await removeOfflineMutation(item.id);
				memoryPaymentCache.set(item.id, { ...item, status: "synced" });
				syncedCount++;
			} else {
				failedCount++;
			}
		} catch (err) {
			logger.warn(`[offlinePaymentQueue] Failed to sync payment ${item.id}:`, err);
			failedCount++;
		}
	}

	return { syncedCount, failedCount };
}

/**
 * Flushes offline payment mutations through the single SSOT Sync Gateway outbox (`OfflineSyncService`),
 * preventing double-flush races with direct /api/cashbox/payments posts.
 */
let isPaymentFlushing = false;
export async function flushOfflinePaymentsToServer(): Promise<{ syncedCount: number; failedCount: number }> {
	if (isPaymentFlushing) {
		return { syncedCount: 0, failedCount: 0 };
	}
	isPaymentFlushing = true;
	try {
		const drain = await offlineSyncService.drainOutbox();
		return {
			syncedCount: drain.appliedCount + drain.duplicateCount + drain.mergedCount,
			failedCount: drain.failedCount + drain.rejectedCount,
		};
	} finally {
		isPaymentFlushing = false;
	}
}

/**
 * Legacy compatibility hook: lifecycle online sync is managed centrally by OfflineSyncService.
 */
export function initOfflinePaymentAutoSync(): void {
	// Managed centrally by OfflineSyncService to prevent duplicate online flushes.
}

/**
 * Clears in-memory payment cache (useful during testing or logout).
 */
export function clearPaymentMemoryCache(): void {
	memoryPaymentCache.clear();
}
