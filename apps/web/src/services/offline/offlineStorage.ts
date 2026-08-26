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
	CachedActiveSchedule,
	CachedIcd10Dictionary,
	CachedOdontogram,
	CachedOdontogramTooth,
	CachedPatientCard,
	CachedPriceList804n,
	Card043MutationInput,
	EnqueueMutationInput,
	Icd10DictionaryItem,
	MutationEntityType,
	MutationStatus,
	OdontogramStampMutationInput,
	OfflineDraft,
	OfflineMutation,
	OfflineQueueMetrics,
	PriceList804nItem,
	ServiceAdditionMutationInput,
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
export const OFFLINE_DB_VERSION = 3;
export const MUTATIONS_STORE_NAME = "mutations";
export const DRAFTS_STORE_NAME = "drafts";
export const CLINICAL_CACHE_STORE_NAME = "clinical_cache";
export const SCHEDULES_CACHE_STORE_NAME = "schedules_cache";
export const PATIENTS_CACHE_STORE_NAME = "patients_cache";
export const ODONTOGRAM_CACHE_STORE_NAME = "odontogram_cache";
export const PRICELIST_CACHE_STORE_NAME = "pricelist_804n_cache";
export const ICD10_CACHE_STORE_NAME = "icd10_cache";

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

				// 4. Schedules Cache Store
				let schedulesStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(SCHEDULES_CACHE_STORE_NAME)) {
					schedulesStore = db.createObjectStore(SCHEDULES_CACHE_STORE_NAME, {
						keyPath: "scheduleKey",
					});
				} else if (tx) {
					try {
						schedulesStore = tx.objectStore(SCHEDULES_CACHE_STORE_NAME);
					} catch {}
				}
				if (schedulesStore) {
					safeCreateIndex(schedulesStore, "date", "date");
					safeCreateIndex(schedulesStore, "organizationId", "organizationId");
					safeCreateIndex(schedulesStore, "cachedAtMs", "cachedAtMs");
				}

				// 5. Patients Cache Store
				let patientsStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(PATIENTS_CACHE_STORE_NAME)) {
					patientsStore = db.createObjectStore(PATIENTS_CACHE_STORE_NAME, {
						keyPath: "patientId",
					});
				} else if (tx) {
					try {
						patientsStore = tx.objectStore(PATIENTS_CACHE_STORE_NAME);
					} catch {}
				}
				if (patientsStore) {
					safeCreateIndex(patientsStore, "organizationId", "organizationId");
					safeCreateIndex(patientsStore, "cachedAtMs", "cachedAtMs");
				}

				// 6. Odontogram Cache Store
				let odontogramStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(ODONTOGRAM_CACHE_STORE_NAME)) {
					odontogramStore = db.createObjectStore(ODONTOGRAM_CACHE_STORE_NAME, {
						keyPath: "patientId",
					});
				} else if (tx) {
					try {
						odontogramStore = tx.objectStore(ODONTOGRAM_CACHE_STORE_NAME);
					} catch {}
				}
				if (odontogramStore) {
					safeCreateIndex(odontogramStore, "organizationId", "organizationId");
					safeCreateIndex(odontogramStore, "cachedAtMs", "cachedAtMs");
				}

				// 7. Price List 804n Cache Store
				let priceStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(PRICELIST_CACHE_STORE_NAME)) {
					priceStore = db.createObjectStore(PRICELIST_CACHE_STORE_NAME, {
						keyPath: "catalogKey",
					});
				} else if (tx) {
					try {
						priceStore = tx.objectStore(PRICELIST_CACHE_STORE_NAME);
					} catch {}
				}
				if (priceStore) {
					safeCreateIndex(priceStore, "organizationId", "organizationId");
					safeCreateIndex(priceStore, "cachedAtMs", "cachedAtMs");
				}

				// 8. ICD-10 Dictionary Cache Store
				let icd10Store: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(ICD10_CACHE_STORE_NAME)) {
					icd10Store = db.createObjectStore(ICD10_CACHE_STORE_NAME, {
						keyPath: "dictionaryKey",
					});
				} else if (tx) {
					try {
						icd10Store = tx.objectStore(ICD10_CACHE_STORE_NAME);
					} catch {}
				}
				if (icd10Store) {
					safeCreateIndex(icd10Store, "cachedAtMs", "cachedAtMs");
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
	} catch (err) {
		const list: OfflineDraft[] = Array.from(inMemoryDraftsMap.values());
		if (typeof window !== "undefined" && window.localStorage) {
			try {
				for (let i = 0; i < window.localStorage.length; i++) {
					const key = window.localStorage.key(i);
					if (key?.startsWith(LOCAL_STORAGE_DRAFTS_PREFIX)) {
						const draftKey = key.slice(LOCAL_STORAGE_DRAFTS_PREFIX.length);
						const d = getLocalStorageDraft(draftKey);
						if (d && !list.some((existing) => existing.draftKey === d.draftKey)) {
							list.push(d);
						}
					}
				}
			} catch {
				// ignore
			}
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
			.sort((a, b) => (b.updatedAtMs || 0) - (a.updatedAtMs || 0));
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

// ─────────────────────────────────────────────────────────────────────────────
// 9. Patient Data Fast Cache in IndexedDB (Zero Blank Screen / Instant Offline Retrieval)
// ─────────────────────────────────────────────────────────────────────────────

export interface PatientClinicalCacheRecord<T = unknown> {
	cacheKey: string;
	entityKind: string;
	entityId: string;
	data: T;
	cachedAtMs: number;
	cachedAtIso: string;
	organizationId?: string | undefined;
}

const inMemoryClinicalCacheMap = new Map<string, PatientClinicalCacheRecord<unknown>>();
export const LOCAL_STORAGE_CLINICAL_CACHE_PREFIX = "dente_clinical_cache_v1:";

function getLocalStorageClinicalCache<T>(cacheKey: string): PatientClinicalCacheRecord<T> | null {
	const raw = getFromLocalStorageSafe(`${LOCAL_STORAGE_CLINICAL_CACHE_PREFIX}${cacheKey}`);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch {
		return null;
	}
}

function saveLocalStorageClinicalCache<T>(record: PatientClinicalCacheRecord<T>): void {
	saveToLocalStorageSafe(
		`${LOCAL_STORAGE_CLINICAL_CACHE_PREFIX}${record.cacheKey}`,
		JSON.stringify(record),
	);
}

function removeLocalStorageClinicalCache(cacheKey: string): void {
	removeFromLocalStorageSafe(`${LOCAL_STORAGE_CLINICAL_CACHE_PREFIX}${cacheKey}`);
}

/**
 * Сохранение снапшота данных пациента (карточка 043/у, визиты, одонтограмма, план лечения) в быстрый IndexedDB кэш
 */
export async function savePatientClinicalCache<T = unknown>(
	cacheKey: string,
	entityKind: string,
	entityId: string,
	data: T,
	organizationId?: string | undefined,
): Promise<PatientClinicalCacheRecord<T>> {
	const nowMs = Date.now();
	const record: PatientClinicalCacheRecord<T> = {
		cacheKey,
		entityKind,
		entityId,
		data,
		cachedAtMs: nowMs,
		cachedAtIso: new Date(nowMs).toISOString(),
		organizationId,
	};

	inMemoryClinicalCacheMap.set(cacheKey, record as PatientClinicalCacheRecord<unknown>);
	saveLocalStorageClinicalCache(record);

	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(CLINICAL_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
				const req = store.put(record);
				req.onsuccess = () => resolve();
				req.onerror = () =>
					reject(req.error ?? new Error("Failed to save clinical cache to IDB"));
			});
		});
	} catch (err) {
		logger.warn(`[OfflineStorage] Failed to put clinical cache in IDB for ${cacheKey}`, err);
	}
	return record;
}

/**
 * Загрузка снапшота данных пациента из быстрого IndexedDB кэша (< 500 мс холодный старт)
 */
export async function getPatientClinicalCache<T = unknown>(
	cacheKey: string,
): Promise<T | null> {
	let idbResult: T | null = null;
	try {
		idbResult = await withIdbTransactionRetry(async (db) => {
			return new Promise<T | null>((resolve, reject) => {
				const tx = db.transaction(CLINICAL_CACHE_STORE_NAME, "readonly");
				const store = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
				const req = store.get(cacheKey);
				req.onsuccess = () => {
					const result = req.result as PatientClinicalCacheRecord<T> | undefined;
					resolve(result?.data ?? null);
				};
				req.onerror = () =>
					reject(req.error ?? new Error("Failed to read clinical cache from IDB"));
			});
		});
	} catch {
		// fallback to localStorage & in-memory
	}

	if (idbResult !== null && idbResult !== undefined) {
		return idbResult;
	}

	const localRecord = getLocalStorageClinicalCache<T>(cacheKey);
	if (localRecord?.data !== undefined && localRecord?.data !== null) {
		return localRecord.data;
	}

	const memRecord = inMemoryClinicalCacheMap.get(cacheKey) as PatientClinicalCacheRecord<T> | undefined;
	return memRecord?.data ?? null;
}

/**
 * Получение всех закэшированных записей по типу сущности (например 'patient', 'visit', 'treatment_plan')
 */
export async function listPatientClinicalCache<T = unknown>(
	entityKind?: string,
	organizationId?: string,
): Promise<Array<PatientClinicalCacheRecord<T>>> {
	let all: Array<PatientClinicalCacheRecord<T>> = [];
	try {
		all = await withIdbTransactionRetry(async (db) => {
			return new Promise<Array<PatientClinicalCacheRecord<T>>>((resolve, reject) => {
				const tx = db.transaction(CLINICAL_CACHE_STORE_NAME, "readonly");
				const store = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
				const req = store.getAll();
				req.onsuccess = () => {
					const list = (req.result as Array<PatientClinicalCacheRecord<T>>) || [];
					resolve(list);
				};
				req.onerror = () =>
					reject(req.error ?? new Error("Failed to list clinical cache from IDB"));
			});
		});
	} catch {
		const memRecords = Array.from(inMemoryClinicalCacheMap.values()) as Array<PatientClinicalCacheRecord<T>>;
		all = memRecords;
	}

	return all.filter((item) => {
		if (entityKind && item.entityKind !== entityKind) return false;
		if (organizationId && item.organizationId && item.organizationId !== organizationId) return false;
		return true;
	});
}

/**
 * Удаление записи клинического кэша
 */
export async function deletePatientClinicalCache(cacheKey: string): Promise<void> {
	inMemoryClinicalCacheMap.delete(cacheKey);
	removeLocalStorageClinicalCache(cacheKey);
	try {
		await withIdbTransactionRetry(async (db) => {
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(CLINICAL_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
				const req = store.delete(cacheKey);
				req.onsuccess = () => resolve();
				req.onerror = () =>
					reject(req.error ?? new Error("Failed to delete clinical cache from IDB"));
			});
		});
	} catch (err) {
		logger.warn(`[OfflineStorage] Failed to delete clinical cache for ${cacheKey}`, err);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Active Schedules Offline IndexedDB Cache
// ─────────────────────────────────────────────────────────────────────────────

const inMemorySchedulesMap = new Map<string, CachedActiveSchedule>();
export const LOCAL_STORAGE_SCHEDULES_PREFIX = "dente_schedule_cache_v1:";

export async function cacheActiveSchedule(params: {
	date: string;
	organizationId?: string | undefined;
	appointments: Array<Record<string, unknown>>;
	scheduleKey?: string | undefined;
}): Promise<CachedActiveSchedule> {
	const orgKey = params.organizationId || "default";
	const scheduleKey = params.scheduleKey || `schedule_${orgKey}_${params.date}`;
	const nowMs = Date.now();
	const record: CachedActiveSchedule = {
		scheduleKey,
		date: params.date,
		organizationId: params.organizationId,
		appointments: params.appointments,
		cachedAt: new Date(nowMs).toISOString(),
		cachedAtMs: nowMs,
	};

	inMemorySchedulesMap.set(scheduleKey, record);
	saveToLocalStorageSafe(`${LOCAL_STORAGE_SCHEDULES_PREFIX}${scheduleKey}`, JSON.stringify(record));

	try {
		await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(SCHEDULES_CACHE_STORE_NAME)) return;
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(SCHEDULES_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(SCHEDULES_CACHE_STORE_NAME);
				const req = store.put(record);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		});
	} catch (err) {
		logger.warn(`[OfflineStorage] Failed to put schedule in IDB for ${scheduleKey}`, err);
	}

	return record;
}

export async function getCachedActiveSchedule(
	date: string,
	organizationId?: string | undefined,
): Promise<CachedActiveSchedule | null> {
	const orgKey = organizationId || "default";
	const scheduleKey = `schedule_${orgKey}_${date}`;

	let idbResult: CachedActiveSchedule | null = null;
	try {
		idbResult = await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(SCHEDULES_CACHE_STORE_NAME)) return null;
			return new Promise<CachedActiveSchedule | null>((resolve, reject) => {
				const tx = db.transaction(SCHEDULES_CACHE_STORE_NAME, "readonly");
				const store = tx.objectStore(SCHEDULES_CACHE_STORE_NAME);
				const req = store.get(scheduleKey);
				req.onsuccess = () => resolve((req.result as CachedActiveSchedule) ?? null);
				req.onerror = () => reject(req.error);
			});
		});
	} catch {}

	if (idbResult) return idbResult;

	const rawLocal = getFromLocalStorageSafe(`${LOCAL_STORAGE_SCHEDULES_PREFIX}${scheduleKey}`);
	if (rawLocal) {
		try {
			const parsed = JSON.parse(rawLocal);
			if (parsed && typeof parsed === "object") return parsed as CachedActiveSchedule;
		} catch {}
	}

	return inMemorySchedulesMap.get(scheduleKey) ?? null;
}

export async function listCachedActiveSchedules(
	organizationId?: string | undefined,
): Promise<CachedActiveSchedule[]> {
	let list: CachedActiveSchedule[] = [];
	try {
		list = await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(SCHEDULES_CACHE_STORE_NAME)) return [];
			return new Promise<CachedActiveSchedule[]>((resolve, reject) => {
				const tx = db.transaction(SCHEDULES_CACHE_STORE_NAME, "readonly");
				const store = tx.objectStore(SCHEDULES_CACHE_STORE_NAME);
				const req = store.getAll();
				req.onsuccess = () => resolve((req.result as CachedActiveSchedule[]) || []);
				req.onerror = () => reject(req.error);
			});
		});
	} catch {
		list = Array.from(inMemorySchedulesMap.values());
	}

	if (list.length === 0) {
		list = Array.from(inMemorySchedulesMap.values());
	}

	return list.filter((item) => {
		if (organizationId && item.organizationId && item.organizationId !== organizationId) return false;
		return true;
	});
}

export async function clearCachedActiveSchedules(
	organizationId?: string | undefined,
): Promise<number> {
	let deletedCount = 0;
	for (const [key, item] of Array.from(inMemorySchedulesMap.entries())) {
		if (!organizationId || item.organizationId === organizationId) {
			inMemorySchedulesMap.delete(key);
			removeFromLocalStorageSafe(`${LOCAL_STORAGE_SCHEDULES_PREFIX}${key}`);
			deletedCount++;
		}
	}
	try {
		await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(SCHEDULES_CACHE_STORE_NAME)) return;
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(SCHEDULES_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(SCHEDULES_CACHE_STORE_NAME);
				const req = store.clear();
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		});
	} catch {}
	return deletedCount;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Patient Cards & Form 043/u Offline IndexedDB Cache
// ─────────────────────────────────────────────────────────────────────────────

const inMemoryPatientsMap = new Map<string, CachedPatientCard>();
export const LOCAL_STORAGE_PATIENTS_PREFIX = "dente_patient_cache_v1:";

export async function cachePatientCard(
	card: CachedPatientCard | {
		patientId: string;
		organizationId?: string | undefined;
		personalInfo: CachedPatientCard["personalInfo"];
		card043?: CachedPatientCard["card043"];
		odontogram?: Record<string, unknown> | undefined;
	},
): Promise<CachedPatientCard> {
	const nowMs = Date.now();
	const record: CachedPatientCard = {
		patientId: card.patientId,
		organizationId: card.organizationId,
		personalInfo: card.personalInfo,
		card043: card.card043,
		odontogram: card.odontogram,
		cachedAt: new Date(nowMs).toISOString(),
		cachedAtMs: nowMs,
	};

	inMemoryPatientsMap.set(card.patientId, record);
	saveToLocalStorageSafe(`${LOCAL_STORAGE_PATIENTS_PREFIX}${card.patientId}`, JSON.stringify(record));

	try {
		await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(PATIENTS_CACHE_STORE_NAME)) return;
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(PATIENTS_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(PATIENTS_CACHE_STORE_NAME);
				const req = store.put(record);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		});
	} catch (err) {
		logger.warn(`[OfflineStorage] Failed to put patient card in IDB for ${card.patientId}`, err);
	}

	return record;
}

export async function getCachedPatientCard(
	patientId: string,
	organizationId?: string | undefined,
): Promise<CachedPatientCard | null> {
	let idbResult: CachedPatientCard | null = null;
	try {
		idbResult = await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(PATIENTS_CACHE_STORE_NAME)) return null;
			return new Promise<CachedPatientCard | null>((resolve, reject) => {
				const tx = db.transaction(PATIENTS_CACHE_STORE_NAME, "readonly");
				const store = tx.objectStore(PATIENTS_CACHE_STORE_NAME);
				const req = store.get(patientId);
				req.onsuccess = () => resolve((req.result as CachedPatientCard) ?? null);
				req.onerror = () => reject(req.error);
			});
		});
	} catch {}

	if (idbResult) {
		if (!organizationId || !idbResult.organizationId || idbResult.organizationId === organizationId) {
			return idbResult;
		}
	}

	const rawLocal = getFromLocalStorageSafe(`${LOCAL_STORAGE_PATIENTS_PREFIX}${patientId}`);
	if (rawLocal) {
		try {
			const parsed = JSON.parse(rawLocal) as CachedPatientCard;
			if (parsed && typeof parsed === "object") {
				if (!organizationId || !parsed.organizationId || parsed.organizationId === organizationId) {
					return parsed;
				}
			}
		} catch {}
	}

	const mem = inMemoryPatientsMap.get(patientId);
	if (mem) {
		if (!organizationId || !mem.organizationId || mem.organizationId === organizationId) {
			return mem;
		}
	}

	return null;
}

export async function listCachedPatientCards(
	organizationId?: string | undefined,
): Promise<CachedPatientCard[]> {
	let list: CachedPatientCard[] = [];
	try {
		list = await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(PATIENTS_CACHE_STORE_NAME)) return [];
			return new Promise<CachedPatientCard[]>((resolve, reject) => {
				const tx = db.transaction(PATIENTS_CACHE_STORE_NAME, "readonly");
				const store = tx.objectStore(PATIENTS_CACHE_STORE_NAME);
				const req = store.getAll();
				req.onsuccess = () => resolve((req.result as CachedPatientCard[]) || []);
				req.onerror = () => reject(req.error);
			});
		});
	} catch {
		list = Array.from(inMemoryPatientsMap.values());
	}

	if (list.length === 0) {
		list = Array.from(inMemoryPatientsMap.values());
	}

	return list.filter((item) => {
		if (organizationId && item.organizationId && item.organizationId !== organizationId) return false;
		return true;
	});
}

export async function deleteCachedPatientCard(patientId: string): Promise<void> {
	inMemoryPatientsMap.delete(patientId);
	removeFromLocalStorageSafe(`${LOCAL_STORAGE_PATIENTS_PREFIX}${patientId}`);
	try {
		await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(PATIENTS_CACHE_STORE_NAME)) return;
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(PATIENTS_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(PATIENTS_CACHE_STORE_NAME);
				const req = store.delete(patientId);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		});
	} catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. Odontograms & Tooth Surface Maps Offline IndexedDB Cache
// ─────────────────────────────────────────────────────────────────────────────

const inMemoryOdontogramsMap = new Map<string, CachedOdontogram>();
export const LOCAL_STORAGE_ODONTOGRAM_PREFIX = "dente_odontogram_cache_v1:";

export async function cacheOdontogramState(params: {
	patientId: string;
	organizationId?: string | undefined;
	teeth: CachedOdontogramTooth[];
	adultMode?: boolean | undefined;
}): Promise<CachedOdontogram> {
	const nowMs = Date.now();
	const record: CachedOdontogram = {
		patientId: params.patientId,
		organizationId: params.organizationId,
		teeth: params.teeth,
		adultMode: params.adultMode !== undefined ? params.adultMode : true,
		cachedAt: new Date(nowMs).toISOString(),
		cachedAtMs: nowMs,
	};

	inMemoryOdontogramsMap.set(params.patientId, record);
	saveToLocalStorageSafe(`${LOCAL_STORAGE_ODONTOGRAM_PREFIX}${params.patientId}`, JSON.stringify(record));

	try {
		await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(ODONTOGRAM_CACHE_STORE_NAME)) return;
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(ODONTOGRAM_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(ODONTOGRAM_CACHE_STORE_NAME);
				const req = store.put(record);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		});
	} catch (err) {
		logger.warn(`[OfflineStorage] Failed to put odontogram in IDB for ${params.patientId}`, err);
	}

	return record;
}

export async function getCachedOdontogramState(
	patientId: string,
	organizationId?: string | undefined,
): Promise<CachedOdontogram | null> {
	let idbResult: CachedOdontogram | null = null;
	try {
		idbResult = await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(ODONTOGRAM_CACHE_STORE_NAME)) return null;
			return new Promise<CachedOdontogram | null>((resolve, reject) => {
				const tx = db.transaction(ODONTOGRAM_CACHE_STORE_NAME, "readonly");
				const store = tx.objectStore(ODONTOGRAM_CACHE_STORE_NAME);
				const req = store.get(patientId);
				req.onsuccess = () => resolve((req.result as CachedOdontogram) ?? null);
				req.onerror = () => reject(req.error);
			});
		});
	} catch {}

	if (idbResult) {
		if (!organizationId || !idbResult.organizationId || idbResult.organizationId === organizationId) {
			return idbResult;
		}
	}

	const rawLocal = getFromLocalStorageSafe(`${LOCAL_STORAGE_ODONTOGRAM_PREFIX}${patientId}`);
	if (rawLocal) {
		try {
			const parsed = JSON.parse(rawLocal) as CachedOdontogram;
			if (parsed && typeof parsed === "object") {
				if (!organizationId || !parsed.organizationId || parsed.organizationId === organizationId) {
					return parsed;
				}
			}
		} catch {}
	}

	const mem = inMemoryOdontogramsMap.get(patientId);
	if (mem) {
		if (!organizationId || !mem.organizationId || mem.organizationId === organizationId) {
			return mem;
		}
	}

	return null;
}

export async function updateCachedToothSurface(
	patientId: string,
	toothNumber: number,
	surface: string,
	condition: string,
	organizationId?: string | undefined,
): Promise<CachedOdontogram> {
	const current = (await getCachedOdontogramState(patientId, organizationId)) || {
		patientId,
		organizationId,
		teeth: [],
		adultMode: true,
		cachedAt: new Date().toISOString(),
		cachedAtMs: Date.now(),
	};

	const teeth = [...current.teeth];
	const existingIdx = teeth.findIndex((t) => t.toothNumber === toothNumber);
	const nowIso = new Date().toISOString();

	if (existingIdx >= 0) {
		const existingTooth = teeth[existingIdx]!;
		const currentSurfaces = new Set(existingTooth.surfaces || []);
		if (surface) currentSurfaces.add(surface);

		teeth[existingIdx] = {
			...existingTooth,
			statusCode: condition || existingTooth.statusCode,
			surfaces: Array.from(currentSurfaces),
			updatedAt: nowIso,
		};
	} else {
		teeth.push({
			toothNumber,
			statusCode: condition,
			surfaces: surface ? [surface] : [],
			updatedAt: nowIso,
		});
	}

	return cacheOdontogramState({
		patientId,
		organizationId,
		teeth,
		adultMode: current.adultMode,
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// 13. Order 804n Pricelist Offline IndexedDB Cache
// ─────────────────────────────────────────────────────────────────────────────

const inMemoryPriceListsMap = new Map<string, CachedPriceList804n>();
export const LOCAL_STORAGE_PRICELIST_PREFIX = "dente_pricelist_cache_v1:";

export async function cachePriceList804n(
	items: PriceList804nItem[],
	organizationId?: string | undefined,
	version = "1.0",
): Promise<CachedPriceList804n> {
	const orgKey = organizationId || "default";
	const catalogKey = `pricelist_804n_${orgKey}`;
	const nowMs = Date.now();
	const record: CachedPriceList804n = {
		catalogKey,
		organizationId,
		version,
		items: Array.isArray(items) ? items : [],
		cachedAt: new Date(nowMs).toISOString(),
		cachedAtMs: nowMs,
	};

	inMemoryPriceListsMap.set(catalogKey, record);
	saveToLocalStorageSafe(`${LOCAL_STORAGE_PRICELIST_PREFIX}${catalogKey}`, JSON.stringify(record));

	try {
		await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(PRICELIST_CACHE_STORE_NAME)) return;
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(PRICELIST_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(PRICELIST_CACHE_STORE_NAME);
				const req = store.put(record);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		});
	} catch (err) {
		logger.warn(`[OfflineStorage] Failed to put pricelist in IDB for ${catalogKey}`, err);
	}

	return record;
}

export async function getCachedPriceList804n(
	organizationId?: string | undefined,
): Promise<CachedPriceList804n | null> {
	const orgKey = organizationId || "default";
	const catalogKey = `pricelist_804n_${orgKey}`;

	let idbResult: CachedPriceList804n | null = null;
	try {
		idbResult = await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(PRICELIST_CACHE_STORE_NAME)) return null;
			return new Promise<CachedPriceList804n | null>((resolve, reject) => {
				const tx = db.transaction(PRICELIST_CACHE_STORE_NAME, "readonly");
				const store = tx.objectStore(PRICELIST_CACHE_STORE_NAME);
				const req = store.get(catalogKey);
				req.onsuccess = () => resolve((req.result as CachedPriceList804n) ?? null);
				req.onerror = () => reject(req.error);
			});
		});
	} catch {}

	if (idbResult) return idbResult;

	const rawLocal = getFromLocalStorageSafe(`${LOCAL_STORAGE_PRICELIST_PREFIX}${catalogKey}`);
	if (rawLocal) {
		try {
			const parsed = JSON.parse(rawLocal) as CachedPriceList804n;
			if (parsed && typeof parsed === "object") return parsed;
		} catch {}
	}

	return inMemoryPriceListsMap.get(catalogKey) ?? null;
}

export async function searchCachedPriceList804n(
	query: string,
	organizationId?: string | undefined,
): Promise<PriceList804nItem[]> {
	const catalog = await getCachedPriceList804n(organizationId);
	if (!catalog || !Array.isArray(catalog.items)) return [];

	const q = (query || "").trim().toLowerCase();
	if (!q) return catalog.items;

	return catalog.items.filter((item) => {
		const codeMatch = item.code804n && item.code804n.toLowerCase().includes(q);
		const nameMatch = item.name && item.name.toLowerCase().includes(q);
		const catMatch = item.category && item.category.toLowerCase().includes(q);
		return Boolean(codeMatch || nameMatch || catMatch);
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// 14. ICD-10 Clinical Diagnosis Catalog Offline IndexedDB Cache
// ─────────────────────────────────────────────────────────────────────────────

const inMemoryIcd10Map = new Map<string, CachedIcd10Dictionary>();
export const LOCAL_STORAGE_ICD10_PREFIX = "dente_icd10_cache_v1:";
export const DEFAULT_ICD10_DICTIONARY_ID = "icd10_dental_catalog";

export async function cacheIcd10Dictionary(
	items: Icd10DictionaryItem[],
	dictionaryKey = DEFAULT_ICD10_DICTIONARY_ID,
): Promise<CachedIcd10Dictionary> {
	const nowMs = Date.now();
	const record: CachedIcd10Dictionary = {
		dictionaryKey,
		items: Array.isArray(items) ? items : [],
		cachedAt: new Date(nowMs).toISOString(),
		cachedAtMs: nowMs,
	};

	inMemoryIcd10Map.set(dictionaryKey, record);
	saveToLocalStorageSafe(`${LOCAL_STORAGE_ICD10_PREFIX}${dictionaryKey}`, JSON.stringify(record));

	try {
		await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(ICD10_CACHE_STORE_NAME)) return;
			return new Promise<void>((resolve, reject) => {
				const tx = db.transaction(ICD10_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(ICD10_CACHE_STORE_NAME);
				const req = store.put(record);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error);
			});
		});
	} catch (err) {
		logger.warn(`[OfflineStorage] Failed to put icd10 dictionary in IDB`, err);
	}

	return record;
}

export async function getCachedIcd10Dictionary(
	dictionaryKey = DEFAULT_ICD10_DICTIONARY_ID,
): Promise<CachedIcd10Dictionary | null> {
	let idbResult: CachedIcd10Dictionary | null = null;
	try {
		idbResult = await withIdbTransactionRetry(async (db) => {
			if (!db.objectStoreNames.contains(ICD10_CACHE_STORE_NAME)) return null;
			return new Promise<CachedIcd10Dictionary | null>((resolve, reject) => {
				const tx = db.transaction(ICD10_CACHE_STORE_NAME, "readonly");
				const store = tx.objectStore(ICD10_CACHE_STORE_NAME);
				const req = store.get(dictionaryKey);
				req.onsuccess = () => resolve((req.result as CachedIcd10Dictionary) ?? null);
				req.onerror = () => reject(req.error);
			});
		});
	} catch {}

	if (idbResult) return idbResult;

	const rawLocal = getFromLocalStorageSafe(`${LOCAL_STORAGE_ICD10_PREFIX}${dictionaryKey}`);
	if (rawLocal) {
		try {
			const parsed = JSON.parse(rawLocal) as CachedIcd10Dictionary;
			if (parsed && typeof parsed === "object") return parsed;
		} catch {}
	}

	return inMemoryIcd10Map.get(dictionaryKey) ?? null;
}

export async function searchCachedIcd10Dictionary(
	query: string,
	dictionaryKey = DEFAULT_ICD10_DICTIONARY_ID,
): Promise<Icd10DictionaryItem[]> {
	const dict = await getCachedIcd10Dictionary(dictionaryKey);
	if (!dict || !Array.isArray(dict.items)) return [];

	const q = (query || "").trim().toLowerCase();
	if (!q) return dict.items;

	return dict.items.filter((item) => {
		const codeMatch = item.code && item.code.toLowerCase().includes(q);
		const nameMatch = item.name && item.name.toLowerCase().includes(q);
		const catMatch = item.category && item.category.toLowerCase().includes(q);
		return Boolean(codeMatch || nameMatch || catMatch);
	});
}

// ─────────────────────────────────────────────────────────────────────────────
// 15. Specialized Domain Outbox Mutation Helpers (043/u, Odontogram, Services)
// ─────────────────────────────────────────────────────────────────────────────

export async function enqueueCard043Mutation(
	input: Card043MutationInput,
): Promise<OfflineMutation<Record<string, unknown>>> {
	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "DIARY_043_DRAFT",
		entityId: input.patientId,
		action: input.action || "update",
		payload: input.diaryData,
		organizationId: input.organizationId,
		authorUserId: input.authorUserId,
	});
}

export async function enqueueOdontogramMutation(
	input: OdontogramStampMutationInput,
): Promise<OfflineMutation<Record<string, unknown>>> {
	const payload: Record<string, unknown> = {
		tooth: input.tooth,
		surface: input.surface,
		condition: input.condition,
		...(input.state || {}),
	};
	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "ODONTOGRAM_STATUS",
		entityId: input.patientId,
		action: input.action || "update",
		payload,
		organizationId: input.organizationId,
		authorUserId: input.authorUserId,
	});
}

export async function enqueueServiceAdditionMutation(
	input: ServiceAdditionMutationInput,
): Promise<OfflineMutation<Record<string, unknown>>> {
	const item = input.serviceItem;
	const priceKop =
		item.priceKopecks !== undefined
			? item.priceKopecks
			: Math.round((item.priceRub || 0) * 100);

	const payload: Record<string, unknown> = {
		visitId: input.visitId,
		patientId: input.patientId,
		code804n: item.code804n,
		name: item.name,
		priceRub: item.priceRub,
		priceKopecks: priceKop,
		quantity: item.quantity || 1,
		toothNumber: item.toothNumber,
		discountRub: item.discountRub || 0,
	};

	return enqueueOfflineMutation<Record<string, unknown>>({
		entityType: "TREATMENT_PLAN_DRAFT",
		entityId: input.visitId || input.patientId,
		action: input.action || "create",
		payload,
		organizationId: input.organizationId,
		authorUserId: input.authorUserId,
	});
}






