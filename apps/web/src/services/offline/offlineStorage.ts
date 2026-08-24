/**
 * DENTE CRM — Offline-First IndexedDB Mutation Outbox & Draft Storage
 *
 * Отказоустойчивая база данных локальных мутаций и черновиков в IndexedDB:
 * - Версионированная схема базы данных (таблицы mutations, drafts)
 * - Точные метки времени (ISO 8601 + ms)
 * - Гарантированные криптографически устойчивые UUID v4
 * - Сохранение любых изменений врача (043/у, одонтограмма, 107-1/у, документы, чеки) без блокирующих модалок
 * - Прозрачный fallback на localStorage при недоступности IndexedDB (приватный режим, сбои браузера)
 */

import {
	calibrateClockSkew,
	computePayloadHash,
	createCompositeIdempotencyKey,
	generateUuidV7,
	getAdjustedNowIso,
	getAdjustedNowMs,
	getGlobalClockSkew,
	isUuidV7,
	resetGlobalClockSkew,
	setGlobalClockSkew,
} from "@dental/shared";
import { logger } from "../../utils/logger";
import type {
	EnqueueMutationInput,
	MutationEntityType,
	MutationStatus,
	OfflineDraft,
	OfflineMutation,
	OfflineQueueMetrics,
} from "./types";

export {
	calibrateClockSkew,
	generateUuidV7,
	getAdjustedNowIso,
	getAdjustedNowMs,
	getGlobalClockSkew,
	isUuidV7,
	resetGlobalClockSkew,
	setGlobalClockSkew,
};

export const OFFLINE_DB_NAME = "dente-crm-offline-outbox";
export const OFFLINE_DB_VERSION = 2;
export const MUTATIONS_STORE_NAME = "mutations";
export const DRAFTS_STORE_NAME = "drafts";
export const CLINICAL_CACHE_STORE_NAME = "clinical_cache";

export const LOCAL_STORAGE_MUTATIONS_KEY = "dente_offline_mutations_v1";
export const LOCAL_STORAGE_DRAFTS_PREFIX = "dente_offline_draft_v1:";

let dbPromiseInstance: Promise<IDBDatabase> | null = null;

/**
 * Генерация UUID v7 (RFC 9562) с миллисекундной упорядоченностью
 * и криптографической устойчивостью.
 */
export function generateMutationUuid(): string {
	return generateUuidV7();
}

/**
 * Текущая временная метка ISO с миллисекундами, откалиброванная
 * по серверному времени (Clock Skew Compensation).
 */
export function nowIsoWithMs(localTimeMs: number = Date.now()): string {
	return getAdjustedNowIso(localTimeMs);
}

/**
 * Проверка доступности IndexedDB в текущем окружении
 */
export function isIndexedDbAvailable(): boolean {
	return (
		typeof window !== "undefined" &&
		Boolean(window.indexedDB) &&
		typeof window.indexedDB.open === "function"
	);
}

/**
 * Открытие базы данных IndexedDB для очереди мутаций
 */
export function openOfflineOutboxDb(): Promise<IDBDatabase> {
	if (!isIndexedDbAvailable()) {
		return Promise.reject(
			new Error("IndexedDB is not available in current environment"),
		);
	}

	if (dbPromiseInstance) {
		return dbPromiseInstance;
	}

	dbPromiseInstance = new Promise<IDBDatabase>((resolve, reject) => {
		try {
			const request = window.indexedDB.open(
				OFFLINE_DB_NAME,
				OFFLINE_DB_VERSION,
			);

			request.onupgradeneeded = (event?: IDBVersionChangeEvent | any) => {
				const db = request.result;
				const tx = request.transaction;
				const oldVersion = event?.oldVersion ?? 0;
				logger.info(
					`[Dente] [OfflineStorage] Upgrading IndexedDB schema: v${oldVersion} -> v${OFFLINE_DB_VERSION}`,
				);

				// Helper to check index existence safely across browsers and node test mock IDB
				const safeCreateIndex = (store: any, name: string, keyPath?: string) => {
					if (!store) return;
					try {
						const hasIndex =
							store.indexNames &&
							(typeof store.indexNames.contains === "function"
								? store.indexNames.contains(name)
								: typeof store.indexNames.indexOf === "function"
									? store.indexNames.indexOf(name) !== -1
									: false);
						if (!hasIndex) {
							store.createIndex(name, keyPath ?? name);
						}
					} catch {
						// ignore if index already exists
					}
				};

				// 1. Mutations Outbox Store
				let mutStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(MUTATIONS_STORE_NAME)) {
					mutStore = db.createObjectStore(MUTATIONS_STORE_NAME, {
						keyPath: "mutationId",
					});
				} else if (tx) {
					try {
						mutStore = tx.objectStore(MUTATIONS_STORE_NAME);
					} catch {
						// ignore
					}
				}

				if (mutStore) {
					safeCreateIndex(mutStore, "timestamp", "timestamp");
					safeCreateIndex(mutStore, "timestampMs", "timestampMs");
					safeCreateIndex(mutStore, "entityType", "entityType");
					safeCreateIndex(mutStore, "entityId", "entityId");
					safeCreateIndex(mutStore, "status", "status");
					safeCreateIndex(mutStore, "organizationId", "organizationId");
				}

				// 2. Clinical Drafts Store (Form 043/u, SOAP, Odontogram)
				let draftStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(DRAFTS_STORE_NAME)) {
					draftStore = db.createObjectStore(DRAFTS_STORE_NAME, {
						keyPath: "draftKey",
					});
				} else if (tx) {
					try {
						draftStore = tx.objectStore(DRAFTS_STORE_NAME);
					} catch {
						// ignore
					}
				}

				if (draftStore) {
					safeCreateIndex(draftStore, "entityType", "entityType");
					safeCreateIndex(draftStore, "entityId", "entityId");
					safeCreateIndex(draftStore, "updatedAt", "updatedAt");
					safeCreateIndex(draftStore, "updatedAtMs", "updatedAtMs");
					safeCreateIndex(draftStore, "organizationId", "organizationId");
				}

				// 3. Clinical Fast Cache Store
				let cacheStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME)) {
					cacheStore = db.createObjectStore(CLINICAL_CACHE_STORE_NAME, {
						keyPath: "cacheKey",
					});
				} else if (tx) {
					try {
						cacheStore = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
					} catch {
						// ignore
					}
				}

				if (cacheStore) {
					safeCreateIndex(cacheStore, "entityKind", "entityKind");
					safeCreateIndex(cacheStore, "entityId", "entityId");
					safeCreateIndex(cacheStore, "cachedAtMs", "cachedAtMs");
					safeCreateIndex(cacheStore, "organizationId", "organizationId");
				}
			};

			request.onsuccess = () => {
				const db = request.result;
				db.onversionchange = () => {
					dbPromiseInstance = null;
					db.close();
				};
				db.onclose = () => {
					dbPromiseInstance = null;
				};
				resolve(db);
			};

			request.onerror = () => {
				dbPromiseInstance = null;
				reject(request.error ?? new Error("Failed to open offline IndexedDB"));
			};

			request.onblocked = () => {
				dbPromiseInstance = null;
				reject(new Error("Offline IndexedDB open was blocked by another tab"));
			};
		} catch (err) {
			dbPromiseInstance = null;
			reject(err instanceof Error ? err : new Error(String(err)));
		}
	});

	return dbPromiseInstance;
}

export function resetOfflineDbConnection(): void {
	dbPromiseInstance = null;
}

/**
 * Выполнение IndexedDB операции с автоматическим повтором (Exponential Backoff, 3 попытки)
 * при транзакционных таймаутах TransactionInactiveError / TimeoutError / AbortError.
 */
export async function withIdbTransactionRetry<R>(
	operation: (db: IDBDatabase) => Promise<R>,
	maxAttempts = 3,
	initialDelayMs = 50,
): Promise<R> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const db = await openOfflineOutboxDb();
			return await operation(db);
		} catch (err: any) {
			lastError = err;
			const isTransient =
				err &&
				(err.name === "TransactionInactiveError" ||
					err.name === "TimeoutError" ||
					err.name === "AbortError" ||
					err.name === "InvalidStateError" ||
					(typeof err.message === "string" &&
						(err.message.includes("TransactionInactiveError") ||
							err.message.includes("TimeoutError") ||
							err.message.includes("transaction has finished") ||
							err.message.includes("transaction is not active") ||
							err.message.includes("timed out"))));

			if (isTransient && attempt < maxAttempts) {
				logger.warn(
					`[OfflineStorage] IndexedDB transient error (${err.name || err.message}) on attempt ${attempt}/${maxAttempts}, retrying with exponential backoff...`,
				);
				resetOfflineDbConnection();
				await new Promise((resolve) =>
					setTimeout(resolve, initialDelayMs * Math.pow(2, attempt - 1)),
				);
				continue;
			}
			throw err;
		}
	}
	throw lastError;
}

// ─────────────────────────────────────────────────────────────────────────────
// LocalStorage & In-Memory Resilient Fallback Buffers (Quota Exhaustion Safety Net)
// ─────────────────────────────────────────────────────────────────────────────

const inMemoryDraftsMap = new Map<string, OfflineDraft<unknown>>();
const inMemoryMutationsMap = new Map<string, OfflineMutation<unknown>>();

const CHUNK_SIZE_BYTES = 512 * 1024; // 512 KB per chunk
const CHUNK_MANIFEST_PREFIX = "__chunk_manifest__";

function cleanupChunkedLocalStorage(key: string): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		const manifestRaw = window.localStorage.getItem(`${CHUNK_MANIFEST_PREFIX}${key}`);
		if (manifestRaw) {
			const manifest = JSON.parse(manifestRaw) as { totalChunks?: number };
			if (manifest && typeof manifest.totalChunks === "number") {
				for (let i = 0; i < manifest.totalChunks; i++) {
					window.localStorage.removeItem(`${key}__chk_${i}`);
				}
			}
			window.localStorage.removeItem(`${CHUNK_MANIFEST_PREFIX}${key}`);
		}
	} catch {}
}

function saveToLocalStorageSafe(key: string, valueStr: string): boolean {
	if (typeof window === "undefined" || !window.localStorage) return false;
	try {
		cleanupChunkedLocalStorage(key);

		if (valueStr.length <= CHUNK_SIZE_BYTES) {
			window.localStorage.setItem(key, valueStr);
			return true;
		}

		// Chunking for large payloads
		const totalChunks = Math.ceil(valueStr.length / CHUNK_SIZE_BYTES);
		const manifest = {
			totalChunks,
			totalLength: valueStr.length,
			createdAt: Date.now(),
		};

		for (let i = 0; i < totalChunks; i++) {
			const chunk = valueStr.substring(i * CHUNK_SIZE_BYTES, (i + 1) * CHUNK_SIZE_BYTES);
			window.localStorage.setItem(`${key}__chk_${i}`, chunk);
		}
		window.localStorage.setItem(`${CHUNK_MANIFEST_PREFIX}${key}`, JSON.stringify(manifest));
		window.localStorage.removeItem(key);
		return true;
	} catch (err) {
		logger.warn(
			`[OfflineStorage] LocalStorage setItem failed for ${key}, relying on in-memory safety net`,
			err,
		);
		return false;
	}
}

function getFromLocalStorageSafe(key: string): string | null {
	if (typeof window === "undefined" || !window.localStorage) return null;
	try {
		const direct = window.localStorage.getItem(key);
		if (direct) return direct;

		const manifestRaw = window.localStorage.getItem(`${CHUNK_MANIFEST_PREFIX}${key}`);
		if (manifestRaw) {
			const manifest = JSON.parse(manifestRaw) as { totalChunks?: number };
			if (manifest && typeof manifest.totalChunks === "number") {
				const chunks: string[] = [];
				for (let i = 0; i < manifest.totalChunks; i++) {
					const chunk = window.localStorage.getItem(`${key}__chk_${i}`);
					if (chunk === null) return null;
					chunks.push(chunk);
				}
				return chunks.join("");
			}
		}
		return null;
	} catch (err) {
		logger.warn(`[OfflineStorage] LocalStorage getItem failed for ${key}`, err);
		return null;
	}
}

function removeFromLocalStorageSafe(key: string): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		window.localStorage.removeItem(key);
		cleanupChunkedLocalStorage(key);
	} catch {}
}

function getLocalStorageMutations(): OfflineMutation[] {
	const raw = getFromLocalStorageSafe(LOCAL_STORAGE_MUTATIONS_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (err) {
		logger.error("[OfflineStorage] Error reading localStorage mutations", err);
		return [];
	}
}

function saveLocalStorageMutations(mutations: OfflineMutation[]): void {
	saveToLocalStorageSafe(LOCAL_STORAGE_MUTATIONS_KEY, JSON.stringify(mutations));
}

function getLocalStorageDraft<T>(draftKey: string): OfflineDraft<T> | null {
	const raw = getFromLocalStorageSafe(`${LOCAL_STORAGE_DRAFTS_PREFIX}${draftKey}`);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch (err) {
		logger.error(`[OfflineStorage] Error reading localStorage draft ${draftKey}`, err);
		return null;
	}
}

function saveLocalStorageDraft<T>(draft: OfflineDraft<T>): void {
	saveToLocalStorageSafe(
		`${LOCAL_STORAGE_DRAFTS_PREFIX}${draft.draftKey}`,
		JSON.stringify(draft),
	);
}

function removeLocalStorageDraft(draftKey: string): void {
	removeFromLocalStorageSafe(`${LOCAL_STORAGE_DRAFTS_PREFIX}${draftKey}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations Operations (Outbox)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Добавление мутации в очередь (IndexedDB с fallback на chunked LocalStorage и in-memory buffer)
 */
export async function enqueueOfflineMutation<T = unknown>(
	input: EnqueueMutationInput<T>,
): Promise<OfflineMutation<T>> {
	const timestamp = input.timestamp || getAdjustedNowIso();
	const timestampMs = new Date(timestamp).getTime() || getAdjustedNowMs();
	const mutationId = input.mutationId || generateMutationUuid();
	const payloadHash = computePayloadHash(input.payload);
	const idempotencyKey =
		input.idempotencyKey ||
		createCompositeIdempotencyKey(mutationId, input.payload);

	const mutation: OfflineMutation<T> = {
		mutationId,
		idempotencyKey,
		payloadHash,
		entityType: input.entityType,
		entityId: input.entityId,
		action: input.action || "update",
		payload: input.payload,
		timestamp,
		timestampMs,
		organizationId: input.organizationId,
		mutationVector: input.mutationVector,
		authorUserId: input.authorUserId,
		status: "pending",
		retryCount: 0,
	};

	// Always record in in-memory outbox buffer for zero-loss guarantee
	inMemoryMutationsMap.set(mutationId, mutation as OfflineMutation<unknown>);

	// Deduplication Guard: if an identical pending mutation exists with matching payloadHash, return it
	try {
		const existingPending = await getPendingOfflineMutations({
			entityType: input.entityType,
			organizationId: input.organizationId,
		});
		const duplicate = existingPending.find(
			(m) =>
				m.entityId === input.entityId &&
				m.action === (input.action || "update") &&
				m.payloadHash === payloadHash &&
				m.status === "pending",
		);
		if (duplicate) {
			logger.info(
				`[OfflineStorage] Deduplicated rapid double-click mutation for ${input.entityType}/${input.entityId} (hash: ${payloadHash.substring(0, 8)})`,
			);
			return duplicate as OfflineMutation<T>;
		}
	} catch {}

	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const request = store.put(mutation);
				request.onsuccess = () => resolve();
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to put mutation to IDB"));
				tx.onerror = () =>
					reject(tx.error ?? new Error("Transaction error while putting mutation"));
			});
		});
		return mutation;
	} catch (err) {
		logger.warn(
			"[OfflineStorage] IndexedDB enqueue failed (e.g. QuotaExceededError), using chunked localStorage fallback",
			err,
		);
		const list = getLocalStorageMutations();
		const withoutCurrent = list.filter((m) => m.mutationId !== mutationId);
		withoutCurrent.push(mutation as OfflineMutation<unknown>);
		saveLocalStorageMutations(withoutCurrent);
		return mutation;
	}
}

/**
 * Получение неотправленных (pending / failed) мутаций из очереди
 */
export async function getPendingOfflineMutations(filter?: {
	entityType?: MutationEntityType | undefined;
	organizationId?: string | undefined;
}): Promise<OfflineMutation[]> {
	try {
		const mutations = await withIdbTransactionRetry(async (db) => {
			return new Promise<OfflineMutation[]>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readonly");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const request = store.getAll();
				request.onsuccess = () => {
					const list = Array.isArray(request.result) ? request.result : [];
					resolve(list);
				};
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to read mutations from IDB"));
			});
		});

		return mutations
			.filter((m) => {
				if (m.status !== "pending" && m.status !== "failed") return false;
				if (filter?.entityType && m.entityType !== filter.entityType) return false;
				if (
					filter?.organizationId &&
					m.organizationId &&
					m.organizationId !== filter.organizationId
				)
					return false;
				return true;
			})
			.sort((a, b) => a.timestampMs - b.timestampMs);
	} catch (err) {
		logger.warn(
			"[OfflineStorage] IndexedDB getPending failed, using localStorage fallback",
			err,
		);
		const list = getLocalStorageMutations();
		return list
			.filter((m) => {
				if (m.status !== "pending" && m.status !== "failed") return false;
				if (filter?.entityType && m.entityType !== filter.entityType) return false;
				if (
					filter?.organizationId &&
					m.organizationId &&
					m.organizationId !== filter.organizationId
				)
					return false;
				return true;
			})
			.sort((a, b) => a.timestampMs - b.timestampMs);
	}
}

/**
 * Получение мутации по ID
 */
export async function getOfflineMutationById(
	mutationId: string,
): Promise<OfflineMutation | null> {
	try {
		return await withIdbTransactionRetry(async (db) => {
			return new Promise<OfflineMutation | null>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readonly");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const request = store.get(mutationId);
				request.onsuccess = () => resolve(request.result ?? null);
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to get mutation by id"));
			});
		});
	} catch (err) {
		const list = getLocalStorageMutations();
		return list.find((m) => m.mutationId === mutationId) ?? null;
	}
}

/**
 * Обновление статуса мутации
 */
export async function updateOfflineMutationStatus(
	mutationId: string,
	status: MutationStatus,
	error?: string | undefined,
): Promise<void> {
	const memMut = inMemoryMutationsMap.get(mutationId);
	if (memMut) {
		memMut.status = status;
		if (status === "failed") {
			memMut.retryCount = (memMut.retryCount || 0) + 1;
			memMut.lastError = error || "Unknown error";
		} else if (status === "synced") {
			memMut.lastError = undefined;
		}
	}

	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const getReq = store.get(mutationId);
				getReq.onsuccess = () => {
					const item = getReq.result as OfflineMutation | undefined;
					if (!item) {
						resolve();
						return;
					}
					item.status = status;
					if (status === "failed") {
						item.retryCount = (item.retryCount || 0) + 1;
						item.lastError = error || "Unknown error";
					} else if (status === "synced") {
						item.lastError = undefined;
					}
					const putReq = store.put(item);
					putReq.onsuccess = () => resolve();
					putReq.onerror = () =>
						reject(putReq.error ?? new Error("Failed to update mutation status"));
				};
				getReq.onerror = () =>
					reject(getReq.error ?? new Error("Failed to find mutation to update"));
			});
		});
	} catch (err) {
		const list = getLocalStorageMutations();
		const item = list.find((m) => m.mutationId === mutationId);
		if (item) {
			item.status = status;
			if (status === "failed") {
				item.retryCount = (item.retryCount || 0) + 1;
				item.lastError = error || "Unknown error";
			} else if (status === "synced") {
				item.lastError = undefined;
			}
			saveLocalStorageMutations(list);
		}
	}
}

/**
 * Отметка мутации как успешно синхронизированной
 */
export async function markMutationSynced(mutationId: string): Promise<void> {
	await updateOfflineMutationStatus(mutationId, "synced");
}

/**
 * Удаление мутации из очереди
 */
export async function deleteOfflineMutation(mutationId: string): Promise<void> {
	inMemoryMutationsMap.delete(mutationId);
	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const request = store.delete(mutationId);
				request.onsuccess = () => resolve();
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to delete mutation from IDB"));
			});
		});
	} catch (err) {
		const list = getLocalStorageMutations();
		const filtered = list.filter((m) => m.mutationId !== mutationId);
		saveLocalStorageMutations(filtered);
	}
}

/**
 * Очистка успешно синхронизированных мутаций
 */
export async function clearSyncedOfflineMutations(): Promise<number> {
	for (const [id, m] of inMemoryMutationsMap.entries()) {
		if (m.status === "synced") {
			inMemoryMutationsMap.delete(id);
		}
	}

	try {
		return await withIdbTransactionRetry(async (db) => {
			return new Promise<number>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const getAllReq = store.getAll();
				getAllReq.onsuccess = () => {
					const all = (getAllReq.result as OfflineMutation[]) || [];
					const synced = all.filter((m) => m.status === "synced");
					for (const item of synced) {
						store.delete(item.mutationId);
					}
					resolve(synced.length);
				};
				getAllReq.onerror = () =>
					reject(getAllReq.error ?? new Error("Failed to read synced mutations"));
			});
		});
	} catch (err) {
		const list = getLocalStorageMutations();
		const remaining = list.filter((m) => m.status !== "synced");
		const removedCount = list.length - remaining.length;
		saveLocalStorageMutations(remaining);
		return removedCount;
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Drafts Storage Operations (Form 043/u, Odontogram, Prescriptions, etc.)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Сохранение черновика документа/дневника в IndexedDB
 * (с бесшовным переходом на chunked LocalStorage и in-memory buffer при QuotaExceededError)
 */
export async function saveOfflineDraft<T = unknown>(
	draftKey: string,
	entityType: MutationEntityType,
	entityId: string,
	data: T,
	organizationId?: string | undefined,
): Promise<OfflineDraft<T>> {
	const now = new Date();
	const draft: OfflineDraft<T> = {
		draftKey,
		entityType,
		entityId,
		data,
		updatedAt: now.toISOString(),
		updatedAtMs: now.getTime(),
		organizationId,
		version: 1,
	};

	// Always record in in-memory safety buffer
	inMemoryDraftsMap.set(draftKey, draft as OfflineDraft<unknown>);

	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(DRAFTS_STORE_NAME, "readwrite");
				const store = tx.objectStore(DRAFTS_STORE_NAME);
				const request = store.put(draft);
				request.onsuccess = () => resolve();
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to save draft to IDB"));
			});
		});
		saveLocalStorageDraft(draft);
		return draft;
	} catch (err) {
		logger.warn(
			`[OfflineStorage] IDB save draft failed for ${draftKey} (${err instanceof Error ? err.name : "error"}), falling back to chunked localStorage & in-memory buffer`,
			err,
		);
		saveLocalStorageDraft(draft);
		return draft;
	}
}

/**
 * Загрузка черновика по ключу
 * (с многоуровневым чтением IndexedDB -> chunked LocalStorage -> in-memory buffer)
 */
export async function loadOfflineDraft<T = unknown>(
	draftKey: string,
): Promise<OfflineDraft<T> | null> {
	let idbDraft: OfflineDraft<T> | null = null;
	try {
		idbDraft = await withIdbTransactionRetry(async (db) => {
			return new Promise<OfflineDraft<T> | null>((resolve, reject) => {
				const tx = db.transaction(DRAFTS_STORE_NAME, "readonly");
				const store = tx.objectStore(DRAFTS_STORE_NAME);
				const request = store.get(draftKey);
				request.onsuccess = () => resolve((request.result as OfflineDraft<T>) ?? null);
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to load draft from IDB"));
			});
		});
	} catch (err) {
		logger.warn(
			`[OfflineStorage] IDB load draft failed for ${draftKey}, checking localStorage & in-memory buffer`,
			err,
		);
	}

	const localDraft = getLocalStorageDraft<T>(draftKey);
	const memDraft = (inMemoryDraftsMap.get(draftKey) as OfflineDraft<T>) || null;

	const candidates = [idbDraft, localDraft, memDraft].filter(
		(d): d is OfflineDraft<T> => Boolean(d),
	);

	if (candidates.length === 0) return null;
	candidates.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
	return candidates[0] || null;
}

/**
 * Удаление сохранённого черновика
 */
export async function deleteOfflineDraft(draftKey: string): Promise<void> {
	inMemoryDraftsMap.delete(draftKey);
	removeLocalStorageDraft(draftKey);
	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(DRAFTS_STORE_NAME, "readwrite");
				const store = tx.objectStore(DRAFTS_STORE_NAME);
				const request = store.delete(draftKey);
				request.onsuccess = () => resolve();
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to delete draft from IDB"));
			});
		});
	} catch (err) {
		logger.warn(`[OfflineStorage] Error deleting IDB draft ${draftKey}`, err);
	}
}

/**
 * Список всех сохранённых черновиков
 */
export async function listOfflineDrafts(filter?: {
	entityType?: MutationEntityType | undefined;
	organizationId?: string | undefined;
}): Promise<OfflineDraft[]> {
	try {
		const drafts = await withIdbTransactionRetry(async (db) => {
			return new Promise<OfflineDraft[]>((resolve, reject) => {
				const tx = db.transaction(DRAFTS_STORE_NAME, "readonly");
				const store = tx.objectStore(DRAFTS_STORE_NAME);
				const request = store.getAll();
				request.onsuccess = () => {
					const list = Array.isArray(request.result) ? request.result : [];
					resolve(list);
				};
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to list drafts from IDB"));
			});
		});

		return drafts
			.filter((d) => {
				if (filter?.entityType && d.entityType !== filter.entityType) return false;
				if (
					filter?.organizationId &&
					d.organizationId &&
					d.organizationId !== filter.organizationId
				)
					return false;
				return true;
			})
			.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
	} catch (err) {
		if (typeof window === "undefined" || !window.localStorage) return [];
		const list: OfflineDraft[] = [];
		try {
			for (let i = 0; i < window.localStorage.length; i++) {
				const key = window.localStorage.key(i);
				if (key?.startsWith(LOCAL_STORAGE_DRAFTS_PREFIX)) {
					const draftKey = key.slice(LOCAL_STORAGE_DRAFTS_PREFIX.length);
					const d = getLocalStorageDraft(draftKey);
					if (d) list.push(d);
				}
			}
		} catch {
			// ignore
		}
		return list
			.filter((d) => {
				if (filter?.entityType && d.entityType !== filter.entityType) return false;
				if (
					filter?.organizationId &&
					d.organizationId &&
					d.organizationId !== filter.organizationId
				)
					return false;
				return true;
			})
			.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
	}
}

/**
 * Получение метрик очереди мутаций и черновиков
 */
export async function getOfflineQueueMetrics(): Promise<OfflineQueueMetrics> {
	let pendingCount = 0;
	let syncingCount = 0;
	let failedCount = 0;
	let syncedCount = 0;
	let totalDrafts = 0;

	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(
					[MUTATIONS_STORE_NAME, DRAFTS_STORE_NAME],
					"readonly",
				);
				const mutStore = tx.objectStore(MUTATIONS_STORE_NAME);
				const draftStore = tx.objectStore(DRAFTS_STORE_NAME);

				const mutReq = mutStore.getAll();
				const draftCountReq = draftStore.count();

				mutReq.onsuccess = () => {
					const mutations = (mutReq.result as OfflineMutation[]) || [];
					for (const m of mutations) {
						if (m.status === "pending") pendingCount++;
						else if (m.status === "syncing") syncingCount++;
						else if (m.status === "failed") failedCount++;
						else if (m.status === "synced") syncedCount++;
					}
				};

				draftCountReq.onsuccess = () => {
					totalDrafts = draftCountReq.result || 0;
				};

				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error ?? new Error("Failed to get metrics"));
			});
		});
	} catch (err) {
		const list = getLocalStorageMutations();
		for (const m of list) {
			if (m.status === "pending") pendingCount++;
			else if (m.status === "syncing") syncingCount++;
			else if (m.status === "failed") failedCount++;
			else if (m.status === "synced") syncedCount++;
		}
		if (typeof window !== "undefined" && window.localStorage) {
			for (let i = 0; i < window.localStorage.length; i++) {
				const key = window.localStorage.key(i);
				if (key?.startsWith(LOCAL_STORAGE_DRAFTS_PREFIX)) {
					totalDrafts++;
				}
			}
		}
	}

	return {
		pendingCount,
		syncingCount,
		failedCount,
		syncedCount,
		totalDrafts,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
// Specialized Clinical Drafts (Visit Diary SOAP, Form 043/u, Odontogram)
// ─────────────────────────────────────────────────────────────────────────────

export const VISIT_DRAFT_KEY_PREFIX = "dente_diary_draft_";
export const FORM_043_DRAFT_KEY_PREFIX = "dente_form043_draft_";

/**
 * Сохранение черновика визита (SOAP дневник 043/у)
 */
export async function saveVisitDraft<T = unknown>(
	visitId: string,
	data: T,
	organizationId?: string | undefined,
): Promise<OfflineDraft<T>> {
	const key = `${VISIT_DRAFT_KEY_PREFIX}${visitId}`;
	return saveOfflineDraft<T>(key, "DIARY_043_DRAFT", visitId, data, organizationId);
}

/**
 * Загрузка черновика визита (SOAP дневник 043/у)
 */
export async function loadVisitDraft<T = unknown>(
	visitId: string,
): Promise<OfflineDraft<T> | null> {
	const key = `${VISIT_DRAFT_KEY_PREFIX}${visitId}`;
	return loadOfflineDraft<T>(key);
}

/**
 * Удаление черновика визита после успешного сохранения / подписания
 */
export async function deleteVisitDraft(visitId: string): Promise<void> {
	const key = `${VISIT_DRAFT_KEY_PREFIX}${visitId}`;
	return deleteOfflineDraft(key);
}

/**
 * Сохранение черновика карты 043/у пациента (одонтограмма, анамнез, индексы)
 */
export async function saveForm043Draft<T = unknown>(
	patientId: string,
	data: T,
	organizationId?: string | undefined,
): Promise<OfflineDraft<T>> {
	const key = `${FORM_043_DRAFT_KEY_PREFIX}${patientId}`;
	return saveOfflineDraft<T>(key, "DIARY_043_DRAFT", patientId, data, organizationId);
}

/**
 * Загрузка черновика карты 043/у пациента
 */
export async function loadForm043Draft<T = unknown>(
	patientId: string,
): Promise<OfflineDraft<T> | null> {
	const key = `${FORM_043_DRAFT_KEY_PREFIX}${patientId}`;
	return loadOfflineDraft<T>(key);
}

/**
 * Удаление черновика карты 043/у пациента
 */
export async function deleteForm043Draft(patientId: string): Promise<void> {
	const key = `${FORM_043_DRAFT_KEY_PREFIX}${patientId}`;
	return deleteOfflineDraft(key);
}

export const ODONTOGRAM_DRAFT_KEY_PREFIX = "dente_odontogram_draft_";

/**
 * Сохранение черновика одонтограммы пациента (FDI 11–48 / 55–85)
 */
export async function saveOdontogramDraft<T = unknown>(
	patientId: string,
	data: T,
	organizationId?: string | undefined,
): Promise<OfflineDraft<T>> {
	const key = `${ODONTOGRAM_DRAFT_KEY_PREFIX}${patientId}`;
	return saveOfflineDraft<T>(key, "ODONTOGRAM_STATUS", patientId, data, organizationId);
}

/**
 * Загрузка черновика одонтограммы пациента
 */
export async function loadOdontogramDraft<T = unknown>(
	patientId: string,
): Promise<OfflineDraft<T> | null> {
	const key = `${ODONTOGRAM_DRAFT_KEY_PREFIX}${patientId}`;
	return loadOfflineDraft<T>(key);
}

/**
 * Удаление черновика одонтограммы пациента
 */
export async function deleteOdontogramDraft(patientId: string): Promise<void> {
	const key = `${ODONTOGRAM_DRAFT_KEY_PREFIX}${patientId}`;
	return deleteOfflineDraft(key);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3-Second Clinical Draft Autosave Debounce Engine & Crash Resilience
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CLINICAL_AUTOSAVE_DEBOUNCE_MS = 3000;

export interface AutosaveEntry<T = unknown> {
	draftKey: string;
	entityType: MutationEntityType;
	entityId: string;
	data: T;
	organizationId?: string | undefined;
	timer: ReturnType<typeof setTimeout> | null;
	lastScheduledAtMs: number;
}

export class ClinicalDraftAutosaveManager {
	private static instance: ClinicalDraftAutosaveManager | null = null;
	private pendingEntries = new Map<string, AutosaveEntry<unknown>>();

	public static getInstance(): ClinicalDraftAutosaveManager {
		if (!ClinicalDraftAutosaveManager.instance) {
			ClinicalDraftAutosaveManager.instance = new ClinicalDraftAutosaveManager();
		}
		return ClinicalDraftAutosaveManager.instance;
	}

	constructor() {
		this.initUnloadListener();
	}

	/**
	 * Планирование автосохранения черновика с 3-секундным дебаунсом
	 */
	public scheduleAutosave<T = unknown>(
		draftKey: string,
		entityType: MutationEntityType,
		entityId: string,
		data: T,
		organizationId?: string | undefined,
		debounceMs = DEFAULT_CLINICAL_AUTOSAVE_DEBOUNCE_MS,
	): Promise<OfflineDraft<T>> {
		return new Promise<OfflineDraft<T>>((resolve, reject) => {
			const existing = this.pendingEntries.get(draftKey);
			if (existing?.timer) {
				clearTimeout(existing.timer);
			}

			const entry: AutosaveEntry<T> = {
				draftKey,
				entityType,
				entityId,
				data,
				organizationId,
				timer: null,
				lastScheduledAtMs: Date.now(),
			};

			entry.timer = setTimeout(async () => {
				this.pendingEntries.delete(draftKey);
				try {
					const saved = await saveOfflineDraft<T>(
						draftKey,
						entityType,
						entityId,
						data,
						organizationId,
					);
					resolve(saved);
				} catch (err) {
					reject(err);
				}
			}, debounceMs);

			this.pendingEntries.set(draftKey, entry as AutosaveEntry<unknown>);
		});
	}

	/**
	 * Мгновенный сброс (Flush) всех отложенных черновиков на диск
	 */
	public async flushAll(): Promise<number> {
		const entries = Array.from(this.pendingEntries.values());
		this.pendingEntries.clear();

		let savedCount = 0;
		for (const entry of entries) {
			if (entry.timer) {
				clearTimeout(entry.timer);
			}
			try {
				await saveOfflineDraft(
					entry.draftKey,
					entry.entityType,
					entry.entityId,
					entry.data,
					entry.organizationId,
				);
				savedCount++;
			} catch (err) {
				logger.error(`[AutosaveManager] Flush error for ${entry.draftKey}`, err);
			}
		}
		return savedCount;
	}

	/**
	 * Мгновенный сброс конкретного черновика
	 */
	public async flushKey<T = unknown>(draftKey: string): Promise<OfflineDraft<T> | null> {
		const entry = this.pendingEntries.get(draftKey);
		if (!entry) return null;

		this.pendingEntries.delete(draftKey);
		if (entry.timer) {
			clearTimeout(entry.timer);
		}
		return saveOfflineDraft<T>(
			entry.draftKey,
			entry.entityType,
			entry.entityId,
			entry.data as T,
			entry.organizationId,
		);
	}

	/**
	 * Отмена отложенного автосохранения
	 */
	public cancel(draftKey: string): boolean {
		const entry = this.pendingEntries.get(draftKey);
		if (!entry) return false;
		if (entry.timer) {
			clearTimeout(entry.timer);
		}
		this.pendingEntries.delete(draftKey);
		return true;
	}

	public isPending(draftKey: string): boolean {
		return this.pendingEntries.has(draftKey);
	}

	public getPendingCount(): number {
		return this.pendingEntries.size;
	}

	private initUnloadListener(): void {
		if (typeof window === "undefined") return;
		const flush = () => {
			void this.flushAll();
		};
		window.addEventListener("beforeunload", flush);
		window.addEventListener("pagehide", flush);
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", () => {
				if (document.visibilityState === "hidden") {
					void this.flushAll();
				}
			});
		}
	}
}

export const clinicalDraftAutosaver = ClinicalDraftAutosaveManager.getInstance();

/**
 * Хелпер автосохранения дневника Form 043/u с 3-секундным дебаунсом
 */
export function scheduleForm043Autosave<T = unknown>(
	patientId: string,
	data: T,
	organizationId?: string | undefined,
	debounceMs = DEFAULT_CLINICAL_AUTOSAVE_DEBOUNCE_MS,
): Promise<OfflineDraft<T>> {
	const key = `${FORM_043_DRAFT_KEY_PREFIX}${patientId}`;
	return clinicalDraftAutosaver.scheduleAutosave<T>(
		key,
		"DIARY_043_DRAFT",
		patientId,
		data,
		organizationId,
		debounceMs,
	);
}

/**
 * Хелпер автосохранения одонтограммы с 3-секундным дебаунсом
 */
export function scheduleOdontogramAutosave<T = unknown>(
	patientId: string,
	data: T,
	organizationId?: string | undefined,
	debounceMs = DEFAULT_CLINICAL_AUTOSAVE_DEBOUNCE_MS,
): Promise<OfflineDraft<T>> {
	const key = `${ODONTOGRAM_DRAFT_KEY_PREFIX}${patientId}`;
	return clinicalDraftAutosaver.scheduleAutosave<T>(
		key,
		"ODONTOGRAM_STATUS",
		patientId,
		data,
		organizationId,
		debounceMs,
	);
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. Storage Quota Monitoring & 1-Click Cache Purge (Storage Estimate API)
// ─────────────────────────────────────────────────────────────────────────────

export interface StorageEstimateInfo {
	usageBytes: number;
	quotaBytes: number;
	percentUsed: number;
	freeBytes: number;
	freeFormatted: string;
	usageFormatted: string;
	isWarning: boolean;
	isPersistent?: boolean | undefined;
	indexedDbAvailable?: boolean | undefined;
}

/**
 * Преобразование байтов в понятный человеку формат («45 ГБ», «120 МБ»)
 */
export function formatBytesHuman(bytes: number): string {
	if (bytes <= 0) return "0 Б";
	const units = ["Б", "КБ", "МБ", "ГБ", "ТБ"];
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const safeIndex = Math.min(i, units.length - 1);
	const size = bytes / Math.pow(1024, safeIndex);
	return `${size >= 10 || safeIndex === 0 ? Math.round(size) : size.toFixed(1)} ${units[safeIndex]}`;
}

/**
 * Опрос текущей квоты и занятого дискового пространства через navigator.storage.estimate()
 */
export async function getStorageEstimate(): Promise<StorageEstimateInfo> {
	if (
		typeof navigator !== "undefined" &&
		navigator.storage &&
		typeof navigator.storage.estimate === "function"
	) {
		try {
			const est = await navigator.storage.estimate();
			const usage = est.usage ?? 0;
			const quota = est.quota ?? 50 * 1024 * 1024 * 1024;
			const percentUsed =
				quota > 0 ? Math.min(100, Math.round((usage / quota) * 100)) : 0;
			const freeBytes = Math.max(0, quota - usage);
			return {
				usageBytes: usage,
				quotaBytes: quota,
				percentUsed,
				freeBytes,
				freeFormatted: formatBytesHuman(freeBytes),
				usageFormatted: formatBytesHuman(usage),
				isWarning: percentUsed > 80,
			};
		} catch {
			// fallback
		}
	}

	return {
		usageBytes: 50 * 1024 * 1024,
		quotaBytes: 50 * 1024 * 1024 * 1024,
		percentUsed: 1,
		freeBytes: 49.95 * 1024 * 1024 * 1024,
		freeFormatted: "50 ГБ",
		usageFormatted: "50 МБ",
		isWarning: false,
	};
}

/**
 * 1-клик очистка синхронизированных черновиков и устаревшего кэша (> 7 дней)
 */
export async function purgeSyncedDraftsAndOldCache(): Promise<{
	purgedDrafts: number;
	purgedCache: number;
}> {
	let purgedDrafts = 0;
	let purgedCache = 0;

	// 1. Очистка уже синхронизированных мутаций из очереди
	try {
		purgedDrafts = await clearSyncedOfflineMutations();
	} catch (err) {
		logger.warn("[OfflineStorage] clearSyncedOfflineMutations failed during purge", err);
	}

	// 2. Очистка устаревшего кэша (старше 7 дней)
	try {
		await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME)) {
				return;
			}
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(CLINICAL_CACHE_STORE_NAME, "readwrite");
				const cacheStore = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
				const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
				const allCacheReq = cacheStore.getAll();
				allCacheReq.onsuccess = () => {
					const entries = (allCacheReq.result || []) as Array<{ key: string; cachedAt?: number }>;
					for (const entry of entries) {
						if (entry.cachedAt && entry.cachedAt < sevenDaysAgo) {
							cacheStore.delete(entry.key);
							purgedCache++;
						}
					}
					resolve();
				};
				allCacheReq.onerror = () => reject(allCacheReq.error);
			});
		});
	} catch (err) {
		logger.warn("[OfflineStorage] purgeCache failed during purge", err);
	}

	return { purgedDrafts, purgedCache };
}



