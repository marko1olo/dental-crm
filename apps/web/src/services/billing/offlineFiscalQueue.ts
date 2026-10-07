/**
 * offlineFiscalQueue.ts
 *
 * DENTE Dental CRM — 54-FZ Offline Fiscal Resilience & Queue Engine.
 * Mandate 8e: Frictionless Cashier Autonomy & High-Availability Fiscalization.
 *
 * Provides a resilient background queue for 54-FZ fiscal receipts when network connectivity drops,
 * the clinic router is rebooting, or the fiscal provider experiences downtime.
 *
 * Storage tier: Dual IndexedDB + safeLocalStorage persistence layer.
 * Automatic online event listener triggers background sync once connection is restored.
 */

import { generateUuidV7 } from "@dental/shared";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../lib/safeLocalStorage";

export type OfflineFiscalReceiptStatus =
	| "pending_fiscal_sync"
	| "synced"
	| "failed";

export interface OfflineFiscalReceipt {
	id: string;
	visitId?: string | undefined;
	paymentId?: string | undefined;
	// biome-ignore lint/suspicious/noExplicitAny: arbitrary fiscal receipt payload
	payload: any;
	createdAt: string;
	status: OfflineFiscalReceiptStatus;
	retryCount: number;
	lastError?: string | undefined;
	syncedAt?: string | undefined;
	idempotencyKey?: string | undefined;
}

export type OfflineReceiptSyncCallback = (
	receipt: OfflineFiscalReceipt,
) => Promise<boolean | { success: boolean; error?: string }>;

export type OfflineQueueSubscriber = (receipts: OfflineFiscalReceipt[]) => void;

const STORAGE_KEY = "dente_offline_fiscal_queue_v1";
const DB_NAME = "dente_billing_offline_db";
const DB_VERSION = 1;
const STORE_NAME = "offline_fiscal_receipts";

// In-memory cache for ultra-fast synchronous lookup and state distribution
const memoryQueue = new Map<string, OfflineFiscalReceipt>();
const subscribers = new Set<OfflineQueueSubscriber>();
let defaultSyncHandler: OfflineReceiptSyncCallback | null = null;
let isSyncing = false;
let dbPromise: Promise<IDBDatabase | null> | null = null;
let isOnlineListenerAttached = false;

/**
 * Checks whether IndexedDB is available in the current environment.
 */
function isIndexedDbAvailable(): boolean {
	return (
		typeof window !== "undefined" &&
		Boolean(window.indexedDB) &&
		typeof window.indexedDB.open === "function"
	);
}

/**
 * Opens or retrieves the IndexedDB instance for offline fiscal receipts.
 */
function getDb(): Promise<IDBDatabase | null> {
	if (!isIndexedDbAvailable()) {
		return Promise.resolve(null);
	}
	if (dbPromise) {
		return dbPromise;
	}

	dbPromise = new Promise<IDBDatabase | null>((resolve) => {
		try {
			const req = window.indexedDB.open(DB_NAME, DB_VERSION);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(STORE_NAME)) {
					const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
					store.createIndex("status", "status", { unique: false });
					store.createIndex("createdAt", "createdAt", { unique: false });
					store.createIndex("paymentId", "paymentId", { unique: false });
				}
			};
			req.onsuccess = () => {
				resolve(req.result);
			};
			req.onerror = () => {
				console.warn("[offlineFiscalQueue] IndexedDB open error, falling back to localStorage");
				resolve(null);
			};
		} catch (err) {
			console.warn("[offlineFiscalQueue] IndexedDB initialization failed:", err);
			resolve(null);
		}
	});

	return dbPromise;
}

/**
 * Hydrates in-memory queue from localStorage and IndexedDB.
 */
export function hydrateQueueFromStorage(): void {
	try {
		const raw = safeLocalStorageGetItem(STORAGE_KEY);
		if (raw) {
			const parsed = JSON.parse(raw) as OfflineFiscalReceipt[];
			if (Array.isArray(parsed)) {
				for (const item of parsed) {
					if (item && item.id) {
						memoryQueue.set(item.id, item);
					}
				}
			}
		}
	} catch (err) {
		console.warn("[offlineFiscalQueue] Failed to hydrate from localStorage:", err);
	}

	if (isIndexedDbAvailable()) {
		void getDb().then((db) => {
			if (!db) return;
			try {
				const tx = db.transaction(STORE_NAME, "readonly");
				const store = tx.objectStore(STORE_NAME);
				const req = store.getAll();
				req.onsuccess = () => {
					const items = req.result as OfflineFiscalReceipt[];
					if (Array.isArray(items)) {
						let updated = false;
						for (const it of items) {
							if (it && it.id && !memoryQueue.has(it.id)) {
								memoryQueue.set(it.id, it);
								updated = true;
							}
						}
						if (updated) {
							notifySubscribers();
							persistToLocalStorage();
						}
					}
				};
			} catch (idbErr) {
				console.warn("[offlineFiscalQueue] IDB getAll error:", idbErr);
			}
		});
	}
}

/**
 * Persists the current in-memory queue to localStorage and IndexedDB.
 */
function persistToLocalStorage(): void {
	try {
		const allItems = Array.from(memoryQueue.values());
		safeLocalStorageSetItem(STORAGE_KEY, JSON.stringify(allItems), true);
	} catch (err) {
		console.warn("[offlineFiscalQueue] Failed to persist to localStorage:", err);
	}
}

/**
 * Persists a single record into IndexedDB asynchronously.
 */
function persistToIndexedDb(receipt: OfflineFiscalReceipt): void {
	if (!isIndexedDbAvailable()) return;
	void getDb().then((db) => {
		if (!db) return;
		try {
			const tx = db.transaction(STORE_NAME, "readwrite");
			const store = tx.objectStore(STORE_NAME);
			store.put(receipt);
		} catch (err) {
			console.warn("[offlineFiscalQueue] IDB put error:", err);
		}
	});
}

/**
 * Deletes a record from IndexedDB asynchronously.
 */
function deleteFromIndexedDb(id: string): void {
	if (!isIndexedDbAvailable()) return;
	void getDb().then((db) => {
		if (!db) return;
		try {
			const tx = db.transaction(STORE_NAME, "readwrite");
			const store = tx.objectStore(STORE_NAME);
			store.delete(id);
		} catch (err) {
			console.warn("[offlineFiscalQueue] IDB delete error:", err);
		}
	});
}

/**
 * Clears the entire IndexedDB store.
 */
function clearIndexedDb(): void {
	if (!isIndexedDbAvailable()) return;
	void getDb().then((db) => {
		if (!db) return;
		try {
			const tx = db.transaction(STORE_NAME, "readwrite");
			const store = tx.objectStore(STORE_NAME);
			store.clear();
		} catch (err) {
			console.warn("[offlineFiscalQueue] IDB clear error:", err);
		}
	});
}

function notifySubscribers(): void {
	const allItems = Array.from(memoryQueue.values()).sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);
	for (const sub of subscribers) {
		try {
			sub(allItems);
		} catch (err) {
			console.error("[offlineFiscalQueue] Subscriber notification error:", err);
		}
	}
}

/**
 * Subscribes to queue changes.
 */
export function subscribeOfflineFiscalQueue(
	listener: OfflineQueueSubscriber,
): () => void {
	subscribers.add(listener);
	listener(
		Array.from(memoryQueue.values()).sort(
			(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
		),
	);
	return () => {
		subscribers.delete(listener);
	};
}

/**
 * Enqueues a fiscal receipt for deferred synchronization.
 * Applies deduplication by id, paymentId, or payload.idempotencyKey.
 */
export async function enqueueOfflineReceipt(
	receipt: Partial<OfflineFiscalReceipt> & {
		// biome-ignore lint/suspicious/noExplicitAny: arbitrary payload
		payload: any;
	},
): Promise<OfflineFiscalReceipt> {
	hydrateQueueFromStorage();

	const idempotencyKey =
		receipt.idempotencyKey ||
		receipt.payload?.idempotencyKey ||
		receipt.payload?.clientMutationId ||
		undefined;

	// Check for deduplication
	for (const existing of memoryQueue.values()) {
		if (receipt.id && existing.id === receipt.id) {
			return existing;
		}
		if (
			receipt.paymentId &&
			existing.paymentId &&
			existing.paymentId === receipt.paymentId
		) {
			return existing;
		}
		if (
			idempotencyKey &&
			existing.idempotencyKey &&
			existing.idempotencyKey === idempotencyKey
		) {
			return existing;
		}
	}

	const id = receipt.id || generateUuidV7();
	const createdAt = receipt.createdAt || new Date().toISOString();

	const record: OfflineFiscalReceipt = {
		id,
		visitId: receipt.visitId,
		paymentId: receipt.paymentId,
		payload: receipt.payload,
		createdAt,
		status: receipt.status || "pending_fiscal_sync",
		retryCount: receipt.retryCount || 0,
		lastError: receipt.lastError,
		idempotencyKey,
	};

	memoryQueue.set(id, record);
	persistToLocalStorage();
	persistToIndexedDb(record);
	notifySubscribers();

	return record;
}

/**
 * Retrieves all receipts currently pending fiscal synchronization.
 */
export async function getPendingOfflineReceipts(): Promise<OfflineFiscalReceipt[]> {
	hydrateQueueFromStorage();
	return Array.from(memoryQueue.values())
		.filter((r) => r.status === "pending_fiscal_sync")
		.sort(
			(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
		);
}

/**
 * Marks a receipt as successfully synchronized with OFD / fiscal server.
 */
export async function markReceiptSynced(
	id: string,
): Promise<OfflineFiscalReceipt | null> {
	hydrateQueueFromStorage();
	const record = memoryQueue.get(id);
	if (!record) {
		return null;
	}

	const updated: OfflineFiscalReceipt = {
		...record,
		status: "synced",
		syncedAt: new Date().toISOString(),
		lastError: undefined,
	};

	memoryQueue.set(id, updated);
	persistToLocalStorage();
	persistToIndexedDb(updated);
	notifySubscribers();

	return updated;
}

/**
 * Marks a receipt as failed during fiscal synchronization.
 */
export async function markReceiptFailed(
	id: string,
	error: string,
): Promise<OfflineFiscalReceipt | null> {
	hydrateQueueFromStorage();
	const record = memoryQueue.get(id);
	if (!record) {
		return null;
	}

	const nextRetry = (record.retryCount || 0) + 1;
	const updated: OfflineFiscalReceipt = {
		...record,
		status: nextRetry >= 5 ? "failed" : "pending_fiscal_sync",
		retryCount: nextRetry,
		lastError: error,
	};

	memoryQueue.set(id, updated);
	persistToLocalStorage();
	persistToIndexedDb(updated);
	notifySubscribers();

	return updated;
}

/**
 * Returns all offline receipts in the queue regardless of status.
 */
export async function getAllOfflineReceipts(): Promise<OfflineFiscalReceipt[]> {
	hydrateQueueFromStorage();
	return Array.from(memoryQueue.values()).sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
	);
}

/**
 * Finds a specific receipt by id.
 */
export async function getOfflineReceiptById(
	id: string,
): Promise<OfflineFiscalReceipt | null> {
	hydrateQueueFromStorage();
	return memoryQueue.get(id) || null;
}

/**
 * Deletes a receipt from the queue.
 */
export async function deleteOfflineReceipt(id: string): Promise<boolean> {
	hydrateQueueFromStorage();
	const existed = memoryQueue.delete(id);
	if (existed) {
		persistToLocalStorage();
		deleteFromIndexedDb(id);
		notifySubscribers();
	}
	return existed;
}

/**
 * Clears the entire offline fiscal queue (useful for testing and reset).
 */
export async function clearOfflineFiscalQueue(): Promise<void> {
	memoryQueue.clear();
	safeLocalStorageRemoveItem(STORAGE_KEY);
	clearIndexedDb();
	notifySubscribers();
}

/**
 * Synchronizes pending offline receipts using a given sync callback.
 */
export async function syncPendingReceipts(
	syncCallback: OfflineReceiptSyncCallback,
): Promise<{
	syncedCount: number;
	failedCount: number;
	total: number;
}> {
	if (isSyncing) {
		return { syncedCount: 0, failedCount: 0, total: 0 };
	}

	isSyncing = true;
	try {
		const pending = await getPendingOfflineReceipts();
		let syncedCount = 0;
		let failedCount = 0;

		for (const item of pending) {
			try {
				const result = await syncCallback(item);
				const isSuccess =
					result === true || (typeof result === "object" && result.success === true);

				if (isSuccess) {
					await markReceiptSynced(item.id);
					syncedCount++;
				} else {
					const errorMsg =
						typeof result === "object" && result.error
							? result.error
							: "Fiscal server rejected receipt";
					await markReceiptFailed(item.id, errorMsg);
					failedCount++;
				}
			} catch (err) {
				const errMsg =
					err instanceof Error ? err.message : "Network failure during fiscal sync";
				await markReceiptFailed(item.id, errMsg);
				failedCount++;
			}
		}

		return {
			syncedCount,
			failedCount,
			total: pending.length,
		};
	} finally {
		isSyncing = false;
	}
}

/**
 * Registers a default background sync handler for automatic trigger on 'online' events.
 */
export function registerDefaultSyncHandler(
	handler: OfflineReceiptSyncCallback | null,
): void {
	defaultSyncHandler = handler;
}

/**
 * Triggers synchronization using the default handler if available.
 */
export async function triggerAutoSync(): Promise<{
	syncedCount: number;
	failedCount: number;
	total: number;
}> {
	if (!defaultSyncHandler) {
		return { syncedCount: 0, failedCount: 0, total: 0 };
	}
	return syncPendingReceipts(defaultSyncHandler);
}

/**
 * Attaches the automatic online event listener.
 */
export function initOnlineAutoSync(): void {
	if (typeof window !== "undefined" && !isOnlineListenerAttached) {
		window.addEventListener("online", () => {
			void triggerAutoSync();
		});
		isOnlineListenerAttached = true;
	}
}

// Initial hydration and listener attachment
hydrateQueueFromStorage();
initOnlineAutoSync();
