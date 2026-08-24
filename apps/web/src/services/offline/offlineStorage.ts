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

			request.onupgradeneeded = () => {
				const db = request.result;

				if (!db.objectStoreNames.contains(MUTATIONS_STORE_NAME)) {
					const mutStore = db.createObjectStore(MUTATIONS_STORE_NAME, {
						keyPath: "mutationId",
					});
					mutStore.createIndex("timestamp", "timestamp");
					mutStore.createIndex("timestampMs", "timestampMs");
					mutStore.createIndex("entityType", "entityType");
					mutStore.createIndex("entityId", "entityId");
					mutStore.createIndex("status", "status");
					mutStore.createIndex("organizationId", "organizationId");
				}

				if (!db.objectStoreNames.contains(DRAFTS_STORE_NAME)) {
					const draftStore = db.createObjectStore(DRAFTS_STORE_NAME, {
						keyPath: "draftKey",
					});
					draftStore.createIndex("entityType", "entityType");
					draftStore.createIndex("entityId", "entityId");
					draftStore.createIndex("updatedAt", "updatedAt");
					draftStore.createIndex("updatedAtMs", "updatedAtMs");
					draftStore.createIndex("organizationId", "organizationId");
				}

				if (!db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME)) {
					const cacheStore = db.createObjectStore(CLINICAL_CACHE_STORE_NAME, {
						keyPath: "cacheKey",
					});
					cacheStore.createIndex("entityKind", "entityKind");
					cacheStore.createIndex("entityId", "entityId");
					cacheStore.createIndex("cachedAtMs", "cachedAtMs");
					cacheStore.createIndex("organizationId", "organizationId");
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

// ─────────────────────────────────────────────────────────────────────────────
// LocalStorage Fallback Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getLocalStorageMutations(): OfflineMutation[] {
	if (typeof window === "undefined" || !window.localStorage) return [];
	try {
		const raw = window.localStorage.getItem(LOCAL_STORAGE_MUTATIONS_KEY);
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (err) {
		logger.error("[OfflineStorage] Error reading localStorage mutations", err);
		return [];
	}
}

function saveLocalStorageMutations(mutations: OfflineMutation[]): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		window.localStorage.setItem(
			LOCAL_STORAGE_MUTATIONS_KEY,
			JSON.stringify(mutations),
		);
	} catch (err) {
		logger.error("[OfflineStorage] Error saving localStorage mutations", err);
	}
}

function getLocalStorageDraft<T>(draftKey: string): OfflineDraft<T> | null {
	if (typeof window === "undefined" || !window.localStorage) return null;
	try {
		const raw = window.localStorage.getItem(
			`${LOCAL_STORAGE_DRAFTS_PREFIX}${draftKey}`,
		);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch (err) {
		logger.error(`[OfflineStorage] Error reading localStorage draft ${draftKey}`, err);
		return null;
	}
}

function saveLocalStorageDraft<T>(draft: OfflineDraft<T>): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		window.localStorage.setItem(
			`${LOCAL_STORAGE_DRAFTS_PREFIX}${draft.draftKey}`,
			JSON.stringify(draft),
		);
	} catch (err) {
		logger.error(
			`[OfflineStorage] Error saving localStorage draft ${draft.draftKey}`,
			err,
		);
	}
}

function removeLocalStorageDraft(draftKey: string): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		window.localStorage.removeItem(`${LOCAL_STORAGE_DRAFTS_PREFIX}${draftKey}`);
	} catch (err) {
		logger.error(
			`[OfflineStorage] Error removing localStorage draft ${draftKey}`,
			err,
		);
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations Operations (Outbox)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Добавление мутации в очередь (IndexedDB с fallback на LocalStorage)
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


	try {
		const db = await openOfflineOutboxDb();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
			const store = tx.objectStore(MUTATIONS_STORE_NAME);
			const request = store.put(mutation);
			request.onsuccess = () => resolve();
			request.onerror = () =>
				reject(request.error ?? new Error("Failed to put mutation to IDB"));
			tx.onerror = () =>
				reject(tx.error ?? new Error("Transaction error while putting mutation"));
		});
		return mutation;
	} catch (err) {
		logger.warn(
			"[OfflineStorage] IndexedDB enqueue failed, using localStorage fallback",
			err,
		);
		const list = getLocalStorageMutations();
		const withoutCurrent = list.filter((m) => m.mutationId !== mutationId);
		withoutCurrent.push(mutation);
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
		const db = await openOfflineOutboxDb();
		const mutations = await new Promise<OfflineMutation[]>((resolve, reject) => {
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
		const db = await openOfflineOutboxDb();
		return await new Promise<OfflineMutation | null>((resolve, reject) => {
			const tx = db.transaction(MUTATIONS_STORE_NAME, "readonly");
			const store = tx.objectStore(MUTATIONS_STORE_NAME);
			const request = store.get(mutationId);
			request.onsuccess = () => resolve(request.result ?? null);
			request.onerror = () =>
				reject(request.error ?? new Error("Failed to get mutation by id"));
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
	try {
		const db = await openOfflineOutboxDb();
		await new Promise<void>((resolve, reject) => {
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
 * Удаление мутации из очереди
 */
export async function deleteOfflineMutation(mutationId: string): Promise<void> {
	try {
		const db = await openOfflineOutboxDb();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
			const store = tx.objectStore(MUTATIONS_STORE_NAME);
			const request = store.delete(mutationId);
			request.onsuccess = () => resolve();
			request.onerror = () =>
				reject(request.error ?? new Error("Failed to delete mutation from IDB"));
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
	try {
		const db = await openOfflineOutboxDb();
		return await new Promise<number>((resolve, reject) => {
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

	try {
		const db = await openOfflineOutboxDb();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(DRAFTS_STORE_NAME, "readwrite");
			const store = tx.objectStore(DRAFTS_STORE_NAME);
			const request = store.put(draft);
			request.onsuccess = () => resolve();
			request.onerror = () =>
				reject(request.error ?? new Error("Failed to save draft to IDB"));
		});
		saveLocalStorageDraft(draft);
		return draft;
	} catch (err) {
		logger.warn(
			`[OfflineStorage] IDB save draft failed for ${draftKey}, falling back to localStorage`,
			err,
		);
		saveLocalStorageDraft(draft);
		return draft;
	}
}

/**
 * Загрузка черновика по ключу (IndexedDB с fallback на LocalStorage)
 */
export async function loadOfflineDraft<T = unknown>(
	draftKey: string,
): Promise<OfflineDraft<T> | null> {
	try {
		const db = await openOfflineOutboxDb();
		const result = await new Promise<OfflineDraft<T> | null>((resolve, reject) => {
			const tx = db.transaction(DRAFTS_STORE_NAME, "readonly");
			const store = tx.objectStore(DRAFTS_STORE_NAME);
			const request = store.get(draftKey);
			request.onsuccess = () => resolve((request.result as OfflineDraft<T>) ?? null);
			request.onerror = () =>
				reject(request.error ?? new Error("Failed to load draft from IDB"));
		});
		if (result) return result;
		return getLocalStorageDraft<T>(draftKey);
	} catch (err) {
		logger.warn(
			`[OfflineStorage] IDB load draft failed for ${draftKey}, checking localStorage`,
			err,
		);
		return getLocalStorageDraft<T>(draftKey);
	}
}

/**
 * Удаление сохранённого черновика
 */
export async function deleteOfflineDraft(draftKey: string): Promise<void> {
	removeLocalStorageDraft(draftKey);
	try {
		const db = await openOfflineOutboxDb();
		await new Promise<void>((resolve, reject) => {
			const tx = db.transaction(DRAFTS_STORE_NAME, "readwrite");
			const store = tx.objectStore(DRAFTS_STORE_NAME);
			const request = store.delete(draftKey);
			request.onsuccess = () => resolve();
			request.onerror = () =>
				reject(request.error ?? new Error("Failed to delete draft from IDB"));
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
		const db = await openOfflineOutboxDb();
		const drafts = await new Promise<OfflineDraft[]>((resolve, reject) => {
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
		const db = await openOfflineOutboxDb();
		await new Promise<void>((resolve, reject) => {
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

