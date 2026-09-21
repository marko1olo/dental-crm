/**
 * DENTE CRM — 54-FZ Fiscal Receipt Queue Buffer & Auto-Retry Manager.
 *
 * Provides statutory resilience when fiscal register hardware is offline,
 * connection drops, or cashier paper runs out:
 * - Buffers receipts in local state and backend `fiscal_receipt_queue`
 * - Automatic background retry loop on hardware recovery
 * - Notifies subscribers when receipts are successfully printed or offline
 * - 54-FZ idempotency and audit logs
 */

import { generateUuidV7 } from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage.js";
import type {
	FiscalReceiptPrintPayload,
	FiscalReceiptPrintResult,
	QueueOverflowTelemetry,
	QueuedFiscalReceiptItem,
} from "./hardwareTypes.js";
import { KktLanPrinterService } from "./kktLanPrinter.js";

type QueueEventListener = (items: QueuedFiscalReceiptItem[]) => void;
type ReceiptPrintedListener = (receipt: QueuedFiscalReceiptItem, result: FiscalReceiptPrintResult) => void;

export class FiscalReceiptQueueManager {
	public static readonly MAX_QUEUE_CAPACITY = 2000;
	public static readonly MAX_RETRY_LIMIT = 10;
	public static readonly STORAGE_KEY = "dente_queued_fiscal_receipts_v1";
	private static inMemoryQueue = new Map<string, QueuedFiscalReceiptItem>();
	private static queueListeners = new Set<QueueEventListener>();
	private static printedListeners = new Set<ReceiptPrintedListener>();
	private static autoRetryTimer: NodeJS.Timeout | null = null;
	private static isAutoRetrying = false;
	private static evictedPrintedCount = 0;

	/**
	 * Loads pending receipts from persistent offline storage into memory.
	 */
	public static loadFromStorage(): void {
		try {
			const raw = safeLocalStorageGetItem(this.STORAGE_KEY);
			if (raw) {
				const parsed = JSON.parse(raw) as QueuedFiscalReceiptItem[];
				if (Array.isArray(parsed)) {
					for (const item of parsed) {
						if (item && item.id && !this.inMemoryQueue.has(item.id)) {
							this.inMemoryQueue.set(item.id, item);
						}
					}
				}
			}
		} catch (err) {
			console.warn("[FiscalReceiptQueueManager] Storage load error:", err);
		}
	}

	/**
	 * Persists unprinted and offline receipts to offline storage.
	 */
	public static saveToStorage(): void {
		try {
			const itemsToSave = Array.from(this.inMemoryQueue.values())
				.filter((i) => i.status === "pending_print" || i.status === "hardware_offline" || i.status === "failed")
				.slice(-200);
			safeLocalStorageSetItem(this.STORAGE_KEY, JSON.stringify(itemsToSave), true);
		} catch (err) {
			console.warn("[FiscalReceiptQueueManager] Storage save error:", err);
		}
	}

	/**
	 * Subscribes to queue changes.
	 */
	public static subscribe(listener: QueueEventListener): () => void {
		this.queueListeners.add(listener);
		listener(this.getAllQueuedItems());
		return () => {
			this.queueListeners.delete(listener);
		};
	}

	/**
	 * Subscribes to receipt printed events.
	 */
	public static onReceiptPrinted(listener: ReceiptPrintedListener): () => void {
		this.printedListeners.add(listener);
		return () => {
			this.printedListeners.delete(listener);
		};
	}

	private static notifyListeners(): void {
		const items = this.getAllQueuedItems();
		for (const listener of this.queueListeners) {
			try {
				listener(items);
			} catch (err) {
				console.error("[FiscalReceiptQueueManager] Listener error:", err);
			}
		}
	}

	/**
	 * Returns queue telemetry and capacity metrics.
	 */
	public static getQueueTelemetry(): QueueOverflowTelemetry {
		const items = this.getAllQueuedItems();
		const pendingCount = items.filter((i) => i.status === "pending_print" || i.status === "hardware_offline").length;
		const printedCount = items.filter((i) => i.status === "printed").length;
		const failedCount = items.filter((i) => i.status === "failed").length;

		return {
			maxCapacity: this.MAX_QUEUE_CAPACITY,
			currentSize: items.length,
			pendingCount,
			printedCount,
			failedCount,
			evictedPrintedCount: this.evictedPrintedCount,
		};
	}

	/**
	 * Calculates exponential backoff delay with jitter (in ms).
	 */
	public static calculateBackoffDelay(retryCount: number, baseMs = 1000, maxMs = 60000): number {
		const exponential = baseMs * Math.pow(2, Math.min(retryCount, 6));
		let jitter = 0;
		if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
			const buf = new Uint32Array(1);
			globalThis.crypto.getRandomValues(buf);
			jitter = (buf[0] ?? 0) % 500;
		} else {
			jitter = (retryCount * 73 + 127) % 500;
		}
		return Math.min(maxMs, exponential + jitter);
	}

	/**
	 * Returns all items in the queue.
	 */
	public static getAllQueuedItems(): QueuedFiscalReceiptItem[] {
		return Array.from(this.inMemoryQueue.values()).sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		);
	}

	/**
	 * Returns items pending print or offline.
	 */
	public static getPendingItems(): QueuedFiscalReceiptItem[] {
		return this.getAllQueuedItems().filter(
			(item) => item.status === "pending_print" || item.status === "hardware_offline",
		);
	}

	/**
	 * Buffers a receipt in the queue when KKT hardware is offline or out of paper.
	 * Enforces capacity limits and evicts oldest already-printed receipts if full.
	 */
	public static enqueueReceipt(
		payload: FiscalReceiptPrintPayload,
		reason = "KKT hardware offline or out of paper",
		queueId?: string,
	): QueuedFiscalReceiptItem {
		// Enforce capacity bounds
		if (this.inMemoryQueue.size >= this.MAX_QUEUE_CAPACITY) {
			// Find and evict oldest printed receipts first
			const printedItems = this.getAllQueuedItems()
				.filter((i) => i.status === "printed")
				.reverse();

			if (printedItems.length > 0) {
				const toEvict = printedItems[0]!;
				this.inMemoryQueue.delete(toEvict.id);
				this.evictedPrintedCount++;
			} else {
				// If queue is completely full of unprinted/failed items, evict oldest failed item
				const failedItems = this.getAllQueuedItems()
					.filter((i) => i.status === "failed")
					.reverse();
				if (failedItems.length > 0) {
					this.inMemoryQueue.delete(failedItems[0]!.id);
				} else {
					console.warn("[FiscalReceiptQueueManager] Queue capacity reached max limit, forcing oldest unprinted item eviction to prevent OOM.");
					const oldest = this.getAllQueuedItems().reverse()[0];
					if (oldest) this.inMemoryQueue.delete(oldest.id);
				}
			}
		}

		const id = queueId || generateUuidV7();
		const now = new Date().toISOString();

		const item: QueuedFiscalReceiptItem = {
			id,
			paymentId: undefined,
			visitId: payload.visitId,
			receiptType: payload.operationType,
			status: "hardware_offline",
			payload,
			retryCount: 1,
			lastError: reason,
			createdAt: now,
			updatedAt: now,
		};

		this.inMemoryQueue.set(id, item);
		this.notifyListeners();
		this.saveToStorage();
		return item;
	}

	/**
	 * Retries printing a specific queued receipt.
	 * Implements Dead Letter Queue (DLQ) state when exceeding MAX_RETRY_LIMIT.
	 */
	public static async retryReceipt(id: string): Promise<FiscalReceiptPrintResult> {
		const item = this.inMemoryQueue.get(id);
		if (!item) {
			return {
				success: false,
				status: "hardware_offline",
				error: "Запись в очереди чеков не найдена",
			};
		}

		const nextRetryCount = item.retryCount + 1;
		const now = new Date().toISOString();

		// Dead Letter Queue transition
		if (nextRetryCount > this.MAX_RETRY_LIMIT) {
			const failedItem: QueuedFiscalReceiptItem = {
				...item,
				status: "failed",
				lastError: `Превышен лимит попыток печати (${this.MAX_RETRY_LIMIT}). Чек помещен в карантин ошибок для ручной обработки кассиром.`,
				retryCount: nextRetryCount,
				updatedAt: now,
			};
			this.inMemoryQueue.set(id, failedItem);
			this.notifyListeners();
			this.saveToStorage();
			return {
				success: false,
				status: "hardware_offline",
				error: failedItem.lastError || "Превышен лимит попыток печати",
			};
		}

		const printResult = await KktLanPrinterService.printReceipt(item.payload);

		if (printResult.success && printResult.status === "printed") {
			const updatedItem: QueuedFiscalReceiptItem = {
				...item,
				status: "printed",
				printedAt: printResult.printedAt || now,
				lastError: null,
				retryCount: nextRetryCount,
				updatedAt: now,
			};
			this.inMemoryQueue.set(id, updatedItem);
			this.notifyListeners();
			this.saveToStorage();

			for (const listener of this.printedListeners) {
				try {
					listener(updatedItem, printResult);
				} catch (err) {
					console.error("[FiscalReceiptQueueManager] OnPrinted listener error:", err);
				}
			}

			return printResult;
		}

		// Still offline
		const updatedItem: QueuedFiscalReceiptItem = {
			...item,
			status: "hardware_offline",
			lastError: printResult.error || "Касса по-прежнему недоступна",
			retryCount: nextRetryCount,
			updatedAt: now,
		};
		this.inMemoryQueue.set(id, updatedItem);
		this.notifyListeners();
		this.saveToStorage();
		return printResult;
	}

	/**
	 * Flushes all pending and offline receipts in the queue.
	 */
	public static async flushAllPending(): Promise<{
		totalProcessed: number;
		printedCount: number;
		failedCount: number;
	}> {
		const pending = this.getPendingItems();
		if (pending.length === 0) {
			return { totalProcessed: 0, printedCount: 0, failedCount: 0 };
		}

		// First, check device health
		const health = await KktLanPrinterService.checkDeviceHealth();
		if (!health.online || !health.paperOk) {
			// Update errors
			for (const item of pending) {
				const updated: QueuedFiscalReceiptItem = {
					...item,
					status: "hardware_offline",
					lastError: health.error || "ККТ недоступна или нет бумаги",
					retryCount: item.retryCount + 1,
					updatedAt: new Date().toISOString(),
				};
				this.inMemoryQueue.set(item.id, updated);
			}
			this.notifyListeners();
			this.saveToStorage();
			return {
				totalProcessed: pending.length,
				printedCount: 0,
				failedCount: pending.length,
			};
		}

		let printedCount = 0;
		let failedCount = 0;

		for (const item of pending) {
			const res = await this.retryReceipt(item.id);
			if (res.success) {
				printedCount++;
			} else {
				failedCount++;
			}
		}

		return {
			totalProcessed: pending.length,
			printedCount,
			failedCount,
		};
	}

	private static visibilityListener: (() => void) | null = null;

	/**
	 * Starts background auto-retry loop for offline receipts.
	 */
	public static startAutoRetryLoop(intervalMs = 15000): void {
		if (this.isAutoRetrying) return;
		this.isAutoRetrying = true;

		if (typeof document !== "undefined" && !this.visibilityListener) {
			this.visibilityListener = () => {
				if (!document.hidden && this.getPendingItems().length > 0) {
					void this.flushAllPending().catch((err) => {
						console.error("[FiscalReceiptQueueManager] Visibility resume flush error:", err);
					});
				}
			};
			document.addEventListener("visibilitychange", this.visibilityListener);
		}

		this.autoRetryTimer = setInterval(async () => {
			if (typeof document !== "undefined" && document.hidden) return;
			const pending = this.getPendingItems();
			if (pending.length > 0) {
				try {
					await this.flushAllPending();
				} catch (err) {
					console.error("[FiscalReceiptQueueManager] Auto-retry loop error:", err);
				}
			}
		}, intervalMs);
	}

	/**
	 * Stops background auto-retry loop.
	 */
	public static stopAutoRetryLoop(): void {
		if (this.autoRetryTimer) {
			clearInterval(this.autoRetryTimer);
			this.autoRetryTimer = null;
		}
		if (typeof document !== "undefined" && this.visibilityListener) {
			document.removeEventListener("visibilitychange", this.visibilityListener);
			this.visibilityListener = null;
		}
		this.isAutoRetrying = false;
	}

	/**
	 * Resets in-memory queue state (useful for tests).
	 */
	public static clearQueue(): void {
		this.inMemoryQueue.clear();
		this.queueListeners.clear();
		this.printedListeners.clear();
		safeLocalStorageRemoveItem(this.STORAGE_KEY);
	}
}

// Auto-hydrate pending offline fiscal receipts from persistent storage on module load
FiscalReceiptQueueManager.loadFromStorage();
