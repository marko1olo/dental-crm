import { logger } from "../../../utils/logger";
import { getOptimizedTiming } from "../../../utils/lowSpecHddOptimizer";
import {
	isIndexedDbAvailable,
	openOfflineOutboxDb,
	withIdbTransactionRetry,
} from "./idbDatabase";
import { saveToLocalStorageSafe } from "./idbLocalStorageFallback";

interface PendingStoreWrite {
	storeName: string;
	key: IDBValidKey;
	record: unknown;
	localStorageKey?: string;
	serializedValue?: string;
}

const pendingBatchedStoreWrites = new Map<string, Map<IDBValidKey, PendingStoreWrite>>();
let batchedStoreFlushTimer: ReturnType<typeof setTimeout> | number | null = null;
let isFlushingBatchedStores = false;

export function resetBatchedStoreWrites(): void {
	pendingBatchedStoreWrites.clear();
	if (batchedStoreFlushTimer !== null) {
		if (typeof window !== "undefined" && "cancelIdleCallback" in window && typeof batchedStoreFlushTimer === "number") {
			try {
				window.cancelIdleCallback(batchedStoreFlushTimer);
			} catch {
				clearTimeout(batchedStoreFlushTimer as unknown as ReturnType<typeof setTimeout>);
			}
		} else {
			clearTimeout(batchedStoreFlushTimer as unknown as ReturnType<typeof setTimeout>);
		}
		batchedStoreFlushTimer = null;
	}
}

export function queueBatchedStorePut(params: {
	storeName: string;
	key: IDBValidKey;
	record: unknown;
	localStorageKey?: string;
	serializedValue?: string;
}): void {
	let storeMap = pendingBatchedStoreWrites.get(params.storeName);
	if (!storeMap) {
		storeMap = new Map();
		pendingBatchedStoreWrites.set(params.storeName, storeMap);
	}
	storeMap.set(params.key, params);

	if (batchedStoreFlushTimer === null) {
		const timing = getOptimizedTiming();
		const delayMs = timing.batchFlushDelayMs;
		const idleTimeout = Math.max(120, Math.min(2000, delayMs));

		if (typeof window !== "undefined" && "requestIdleCallback" in window) {
			batchedStoreFlushTimer = window.requestIdleCallback(() => {
				batchedStoreFlushTimer = null;
				void flushBatchedStoreWrites();
			}, { timeout: idleTimeout });
		} else {
			const fallbackTimeout = Math.max(80, Math.round(delayMs / 2));
			batchedStoreFlushTimer = setTimeout(() => {
				batchedStoreFlushTimer = null;
				void flushBatchedStoreWrites();
			}, fallbackTimeout);
		}
	}
}

export function cancelBatchedStorePut(storeName: string, key: IDBValidKey): void {
	const storeMap = pendingBatchedStoreWrites.get(storeName);
	if (storeMap) {
		storeMap.delete(key);
		if (storeMap.size === 0) {
			pendingBatchedStoreWrites.delete(storeName);
		}
	}
}

export function getPendingBatchedStoreWritesCount(): number {
	let count = 0;
	for (const map of pendingBatchedStoreWrites.values()) {
		count += map.size;
	}
	return count;
}

export async function flushBatchedStoreWrites(): Promise<void> {
	if (batchedStoreFlushTimer !== null) {
		if (typeof window !== "undefined" && "cancelIdleCallback" in window && typeof batchedStoreFlushTimer === "number") {
			try {
				window.cancelIdleCallback(batchedStoreFlushTimer);
			} catch {
				clearTimeout(batchedStoreFlushTimer as unknown as ReturnType<typeof setTimeout>);
			}
		} else {
			clearTimeout(batchedStoreFlushTimer as unknown as ReturnType<typeof setTimeout>);
		}
		batchedStoreFlushTimer = null;
	}
	if (isFlushingBatchedStores || pendingBatchedStoreWrites.size === 0) return;
	isFlushingBatchedStores = true;

	const snapshot = new Map(pendingBatchedStoreWrites);
	pendingBatchedStoreWrites.clear();

	try {
		if (isIndexedDbAvailable()) {
			const db = await openOfflineOutboxDb();
			for (const [storeName, itemsMap] of snapshot.entries()) {
				if (!db.objectStoreNames.contains(storeName) || itemsMap.size === 0) continue;
				try {
					await withIdbTransactionRetry(async (activeDb) => {
						return new Promise<void>((resolve, reject) => {
							const tx = activeDb.transaction(storeName, "readwrite");
							const store = tx.objectStore(storeName);
							for (const item of itemsMap.values()) {
								store.put(item.record);
							}
							tx.oncomplete = () => resolve();
							tx.onerror = () => reject(tx.error);
							tx.onabort = () => reject(tx.error ?? new Error("Transaction aborted"));
						});
					});
				} catch (err) {
					logger.warn(`[OfflineStorage] Batched store write failed for ${storeName}, falling back to localStorage`, err);
					for (const item of itemsMap.values()) {
						if (item.localStorageKey && item.serializedValue) {
							saveToLocalStorageSafe(item.localStorageKey, item.serializedValue);
						}
					}
				}
				// Cooperative yielding on low-spec CPUs between object store batches
				await yieldToMainThread();
			}
		} else {
			// IndexedDB not available, write directly to localStorage
			for (const itemsMap of snapshot.values()) {
				for (const item of itemsMap.values()) {
					if (item.localStorageKey && item.serializedValue) {
						saveToLocalStorageSafe(item.localStorageKey, item.serializedValue);
					}
				}
			}
		}
	} catch (err) {
		logger.warn("[OfflineStorage] Error in flushBatchedStoreWrites:", err);
	} finally {
		isFlushingBatchedStores = false;
	}
}

export function flushBatchedStoreWritesSyncToLocalStorage(): void {
	if (pendingBatchedStoreWrites.size === 0) return;
	for (const itemsMap of pendingBatchedStoreWrites.values()) {
		for (const item of itemsMap.values()) {
			if (item.localStorageKey && item.serializedValue) {
				saveToLocalStorageSafe(item.localStorageKey, item.serializedValue);
			}
		}
	}
	pendingBatchedStoreWrites.clear();
}

/**
 * Yield to main thread to prevent UI micro-stutters and main thread blocking on Celeron CPUs.
 */
export function yieldToMainThread(): Promise<void> {
	if (typeof window !== "undefined" && "requestIdleCallback" in window) {
		return new Promise((resolve) => {
			window.requestIdleCallback(() => resolve(), { timeout: 16 });
		});
	}
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}
