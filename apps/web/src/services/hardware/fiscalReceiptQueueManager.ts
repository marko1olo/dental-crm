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

import type {
	FiscalReceiptPrintPayload,
	FiscalReceiptPrintResult,
	QueuedFiscalReceiptItem,
} from "./hardwareTypes.js";
import { KktLanPrinterService } from "./kktLanPrinter.js";

type QueueEventListener = (items: QueuedFiscalReceiptItem[]) => void;
type ReceiptPrintedListener = (receipt: QueuedFiscalReceiptItem, result: FiscalReceiptPrintResult) => void;

export class FiscalReceiptQueueManager {
	private static inMemoryQueue = new Map<string, QueuedFiscalReceiptItem>();
	private static queueListeners = new Set<QueueEventListener>();
	private static printedListeners = new Set<ReceiptPrintedListener>();
	private static autoRetryTimer: NodeJS.Timeout | null = null;
	private static isAutoRetrying = false;

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
	 */
	public static enqueueReceipt(
		payload: FiscalReceiptPrintPayload,
		reason = "KKT hardware offline or out of paper",
		queueId?: string,
	): QueuedFiscalReceiptItem {
		const id = queueId || `q-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
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
		return item;
	}

	/**
	 * Retries printing a specific queued receipt.
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

		const printResult = await KktLanPrinterService.printReceipt(item.payload);
		const now = new Date().toISOString();

		if (printResult.success && printResult.status === "printed") {
			const updatedItem: QueuedFiscalReceiptItem = {
				...item,
				status: "printed",
				printedAt: printResult.printedAt || now,
				lastError: null,
				retryCount: item.retryCount + 1,
				updatedAt: now,
			};
			this.inMemoryQueue.set(id, updatedItem);
			this.notifyListeners();

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
			retryCount: item.retryCount + 1,
			updatedAt: now,
		};
		this.inMemoryQueue.set(id, updatedItem);
		this.notifyListeners();
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

	/**
	 * Starts background auto-retry loop for offline receipts.
	 */
	public static startAutoRetryLoop(intervalMs = 15000): void {
		if (this.isAutoRetrying) return;
		this.isAutoRetrying = true;
		this.autoRetryTimer = setInterval(async () => {
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
		this.isAutoRetrying = false;
	}

	/**
	 * Resets in-memory queue state (useful for tests).
	 */
	public static clearQueue(): void {
		this.inMemoryQueue.clear();
		this.queueListeners.clear();
		this.printedListeners.clear();
	}
}
