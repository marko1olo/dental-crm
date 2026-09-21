/**
 * DENTE CRM — Clinical Entity Cache Storage (IndexedDB + Fallback)
 *
 * Provides offline caching for clinical records:
 * - Patients & clinical history
 * - Visit records & odontogram state
 * - Appointment schedule & clinic calendar
 * - Pricelist & services catalog
 * - Storage quota monitoring and persistent storage acquisition
 */

import { logger } from "../../utils/logger";
import {
	isIndexedDbAvailable,
	openOfflineOutboxDb,
	CLINICAL_CACHE_STORE_NAME,
	formatBytesHuman,
	type StorageEstimateInfo,
	queueBatchedStorePut,
	yieldToMainThread,
} from "../offline/offlineStorage";
import type {
	CachedEntityKind,
	ClinicalCachedEntity,
} from "./storageTypes";

export const LOCAL_STORAGE_CACHE_PREFIX = "dente_cached_entity_v1:";

// L1 Fast RAM Cache (0 ms, zero 5400 RPM HDD seek time)
const inMemoryEntityCacheMap = new Map<string, ClinicalCachedEntity<unknown>>();

function buildCacheKey(entityKind: string, entityId: string): string {
	return `${entityKind}:${entityId}`;
}

function getLocalStorageCachedEntity<T>(
	cacheKey: string,
): ClinicalCachedEntity<T> | null {
	if (typeof window === "undefined" || !window.localStorage) return null;
	try {
		const raw = window.localStorage.getItem(
			`${LOCAL_STORAGE_CACHE_PREFIX}${cacheKey}`,
		);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch (err) {
		logger.error(
			`[ClinicalCacheStorage] Error reading localStorage cache ${cacheKey}`,
			err,
		);
		return null;
	}
}

function saveLocalStorageCachedEntity<T>(
	entity: ClinicalCachedEntity<T>,
): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		const storageKey = `${LOCAL_STORAGE_CACHE_PREFIX}${entity.cacheKey}`;
		const serialized = JSON.stringify(entity);
		const existing = window.localStorage.getItem(storageKey);
		if (existing === serialized) return;
		window.localStorage.setItem(storageKey, serialized);
	} catch (err) {
		logger.error(
			`[ClinicalCacheStorage] Error saving localStorage cache ${entity.cacheKey}`,
			err,
		);
	}
}

function removeLocalStorageCachedEntity(cacheKey: string): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	try {
		window.localStorage.removeItem(`${LOCAL_STORAGE_CACHE_PREFIX}${cacheKey}`);
	} catch (err) {
		logger.error(
			`[ClinicalCacheStorage] Error removing localStorage cache ${cacheKey}`,
			err,
		);
	}
}

/**
 * Caches a clinical entity in IndexedDB (with LocalStorage mirror and write coalescing)
 */
export async function cacheClinicalRecord<T = unknown>(
	entityKind: CachedEntityKind | string,
	entityId: string,
	data: T,
	organizationId?: string | undefined,
	version = 1,
): Promise<ClinicalCachedEntity<T>> {
	const now = new Date();
	const cacheKey = buildCacheKey(entityKind, entityId);
	const record: ClinicalCachedEntity<T> = {
		cacheKey,
		entityKind,
		entityId,
		data,
		cachedAt: now.toISOString(),
		cachedAtMs: now.getTime(),
		organizationId,
		version,
	};

	// 1. L1 RAM Hit (0 ms, zero HDD seek)
	inMemoryEntityCacheMap.set(cacheKey, record as ClinicalCachedEntity<unknown>);

	// 2. Coalesced batched write to IndexedDB / localStorage (prevents disk thrashing)
	queueBatchedStorePut({
		storeName: CLINICAL_CACHE_STORE_NAME,
		key: cacheKey,
		record,
		localStorageKey: `${LOCAL_STORAGE_CACHE_PREFIX}${record.cacheKey}`,
		serializedValue: JSON.stringify(record),
	});

	return record;
}

/**
 * Loads a cached clinical entity (L1 RAM -> IndexedDB -> LocalStorage)
 */
export async function getCachedClinicalRecord<T = unknown>(
	entityKind: CachedEntityKind | string,
	entityId: string,
): Promise<ClinicalCachedEntity<T> | null> {
	const cacheKey = buildCacheKey(entityKind, entityId);

	// 1. Fast L1 RAM Hit (0 ms)
	const memHit = inMemoryEntityCacheMap.get(cacheKey) as ClinicalCachedEntity<T> | undefined;
	if (memHit) return memHit;

	try {
		const db = await openOfflineOutboxDb();
		if (db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME)) {
			const result = await new Promise<ClinicalCachedEntity<T> | null>(
				(resolve, reject) => {
					const tx = db.transaction(CLINICAL_CACHE_STORE_NAME, "readonly");
					const store = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
					const request = store.get(cacheKey);
					request.onsuccess = () =>
						resolve((request.result as ClinicalCachedEntity<T>) ?? null);
					request.onerror = () =>
						reject(request.error ?? new Error("Failed to get cached entity from IDB"));
				},
			);
			if (result) {
				inMemoryEntityCacheMap.set(cacheKey, result as ClinicalCachedEntity<unknown>);
				return result;
			}
		}
		const localRecord = getLocalStorageCachedEntity<T>(cacheKey);
		if (localRecord) {
			inMemoryEntityCacheMap.set(cacheKey, localRecord as ClinicalCachedEntity<unknown>);
		}
		return localRecord;
	} catch (err) {
		logger.debug(
			`[ClinicalCacheStorage] IDB get cache failed for ${cacheKey}, checking localStorage`,
			err,
		);
		const localRecord = getLocalStorageCachedEntity<T>(cacheKey);
		if (localRecord) {
			inMemoryEntityCacheMap.set(cacheKey, localRecord as ClinicalCachedEntity<unknown>);
		}
		return localRecord;
	}
}

/**
 * Lists all cached clinical records of a specific entity kind
 */
export async function listCachedClinicalRecords<T = unknown>(
	entityKind?: CachedEntityKind | string | undefined,
	organizationId?: string | undefined,
): Promise<ClinicalCachedEntity<T>[]> {
	try {
		const db = await openOfflineOutboxDb();
		let list: ClinicalCachedEntity<T>[] = [];

		if (db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME)) {
			list = await new Promise<ClinicalCachedEntity<T>[]>((resolve, reject) => {
				const tx = db.transaction(CLINICAL_CACHE_STORE_NAME, "readonly");
				const store = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
				const request = store.getAll();
				request.onsuccess = () => {
					const records = Array.isArray(request.result)
						? (request.result as ClinicalCachedEntity<T>[])
						: [];
					resolve(records);
				};
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to list cached entities from IDB"));
			});
		}

		if (list.length === 0 && typeof window !== "undefined" && window.localStorage) {
			for (let i = 0; i < window.localStorage.length; i++) {
				const key = window.localStorage.key(i);
				if (key?.startsWith(LOCAL_STORAGE_CACHE_PREFIX)) {
					const cacheKey = key.slice(LOCAL_STORAGE_CACHE_PREFIX.length);
					const cached = getLocalStorageCachedEntity<T>(cacheKey);
					if (cached) list.push(cached);
				}
			}
		}

		return list
			.filter((item) => {
				if (entityKind && item.entityKind !== entityKind) return false;
				if (
					organizationId &&
					item.organizationId &&
					item.organizationId !== organizationId
				)
					return false;
				return true;
			})
			.sort((a, b) => b.cachedAtMs - a.cachedAtMs);
	} catch (err) {
		logger.warn("[ClinicalCacheStorage] List cached entities failed, reading localStorage", err);
		const list: ClinicalCachedEntity<T>[] = [];
		if (typeof window !== "undefined" && window.localStorage) {
			for (let i = 0; i < window.localStorage.length; i++) {
				const key = window.localStorage.key(i);
				if (key?.startsWith(LOCAL_STORAGE_CACHE_PREFIX)) {
					const cacheKey = key.slice(LOCAL_STORAGE_CACHE_PREFIX.length);
					const cached = getLocalStorageCachedEntity<T>(cacheKey);
					if (cached) list.push(cached);
				}
			}
		}
		return list
			.filter((item) => {
				if (entityKind && item.entityKind !== entityKind) return false;
				if (
					organizationId &&
					item.organizationId &&
					item.organizationId !== organizationId
				)
					return false;
				return true;
			})
			.sort((a, b) => b.cachedAtMs - a.cachedAtMs);
	}
}

/**
 * Deletes a cached clinical record
 */
export async function deleteCachedClinicalRecord(
	entityKind: CachedEntityKind | string,
	entityId: string,
): Promise<void> {
	const cacheKey = buildCacheKey(entityKind, entityId);
	inMemoryEntityCacheMap.delete(cacheKey);
	removeLocalStorageCachedEntity(cacheKey);

	try {
		const db = await openOfflineOutboxDb();
		if (db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME)) {
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(CLINICAL_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
				const request = store.delete(cacheKey);
				request.onsuccess = () => resolve();
				request.onerror = () =>
					reject(request.error ?? new Error("Failed to delete cached entity from IDB"));
			});
		}
	} catch (err) {
		logger.warn(`[ClinicalCacheStorage] Error deleting IDB cached record ${cacheKey}`, err);
	}
}

/**
 * Clears all cached records for a specific entity kind
 */
export async function clearClinicalCacheByKind(
	entityKind: CachedEntityKind | string,
): Promise<number> {
	const list = await listCachedClinicalRecords(entityKind);
	for (const item of list) {
		await deleteCachedClinicalRecord(item.entityKind, item.entityId);
	}
	return list.length;
}

/**
 * Clears all cached clinical records across all kinds
 */
export async function clearAllClinicalCache(): Promise<number> {
	const list = await listCachedClinicalRecords();
	for (const item of list) {
		await deleteCachedClinicalRecord(item.entityKind, item.entityId);
	}
	return list.length;
}

export const setCachedEntity = cacheClinicalRecord;
export const getCachedEntity = getCachedClinicalRecord;
export const removeCachedEntity = deleteCachedClinicalRecord;

/**
 * Caches a statutory catalog (804n nomenclature, ICD-10, clinical 043/u templates)
 * in IndexedDB for instant 0ms seek-time startup on 5400 RPM HDD.
 */
export async function cacheStatutoryCatalog<T = unknown>(
	catalogKind: "catalog_804n" | "catalog_icd10" | "catalog_templates",
	data: T,
	organizationId?: string,
): Promise<ClinicalCachedEntity<T>> {
	return cacheClinicalRecord<T>(catalogKind, "canonical", data, organizationId, 1);
}

/**
 * Retrieves a cached statutory catalog from IndexedDB (or fallback).
 */
export async function getCachedStatutoryCatalog<T = unknown>(
	catalogKind: "catalog_804n" | "catalog_icd10" | "catalog_templates",
): Promise<T | null> {
	const cached = await getCachedClinicalRecord<T>(catalogKind, "canonical");
	return cached?.data ?? null;
}


/**
 * Requests persistent storage from browser (StorageManager.persist)
 */
export async function requestPersistentStorage(): Promise<boolean> {
	if (
		typeof navigator !== "undefined" &&
		navigator.storage &&
		typeof navigator.storage.persist === "function"
	) {
		try {
			const isPersisted = await navigator.storage.persist();
			logger.info(`[Storage] Persistent storage granted: ${isPersisted}`);
			return isPersisted;
		} catch (err) {
			logger.warn("[Storage] Failed to request persistent storage", err);
			return false;
		}
	}
	return false;
}

/**
 * Gets storage quota estimate
 */
export async function getStorageEstimate(): Promise<StorageEstimateInfo> {
	let usageBytes = 0;
	let quotaBytes = 0;
	let isPersistent = false;
	const indexedDbAvailable = isIndexedDbAvailable();

	if (
		typeof navigator !== "undefined" &&
		navigator.storage &&
		typeof navigator.storage.estimate === "function"
	) {
		try {
			const estimate = await navigator.storage.estimate();
			usageBytes = estimate.usage || 0;
			quotaBytes = estimate.quota || 0;
		} catch (err: unknown) {
			logger.warn("[ClinicalCacheStorage] Failed to estimate storage quota", err);
		}

		if (typeof navigator.storage.persisted === "function") {
			try {
				isPersistent = await navigator.storage.persisted();
			} catch (err: unknown) {
				logger.warn("[ClinicalCacheStorage] Failed to check storage persistence", err);
			}
		}
	}

	const percentUsed =
		quotaBytes > 0 ? Math.round((usageBytes / quotaBytes) * 100) : 0;
	const freeBytes = Math.max(0, quotaBytes - usageBytes);

	return {
		usageBytes,
		quotaBytes,
		percentUsed,
		freeBytes,
		freeFormatted: formatBytesHuman(freeBytes),
		usageFormatted: formatBytesHuman(usageBytes),
		isWarning: percentUsed >= 85,
		isPersistent,
		indexedDbAvailable,
	};
}
