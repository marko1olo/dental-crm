import { logger } from "../../../utils/logger";
import {
	openOfflineOutboxDb,
	CLINICAL_CACHE_STORE_NAME,
	queueBatchedStorePut,
	cancelBatchedStorePut,
} from "../../offline/offlineStorage";
import type { CachedEntityKind, ClinicalCachedEntity } from "../storageTypes";
import { writeThroughL2Snapshot } from "../clinicalIndexedDbL2";
import { LOCAL_STORAGE_CACHE_PREFIX, buildCacheKey } from "./types";
import {
	inMemoryEntityCacheMap,
	getLocalStorageCachedEntity,
	saveLocalStorageCachedEntity,
	removeLocalStorageCachedEntity,
} from "./cacheStorageMemory";
import { listCachedClinicalRecords } from "./cacheListRecords";

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
		cacheKey, entityKind, entityId, data, cachedAt: now.toISOString(), cachedAtMs: now.getTime(), organizationId, version,
	};

	inMemoryEntityCacheMap.set(cacheKey, record as ClinicalCachedEntity<unknown>);
	saveLocalStorageCachedEntity(record);
	queueBatchedStorePut({
		storeName: CLINICAL_CACHE_STORE_NAME, key: cacheKey, record,
		localStorageKey: `${LOCAL_STORAGE_CACHE_PREFIX}${record.cacheKey}`, serializedValue: JSON.stringify(record),
	});
	writeThroughL2Snapshot(entityKind, entityId, data, organizationId);
	return record;
}

export async function getCachedClinicalRecord<T = unknown>(
	entityKind: CachedEntityKind | string,
	entityId: string,
): Promise<ClinicalCachedEntity<T> | null> {
	const cacheKey = buildCacheKey(entityKind, entityId);
	const memHit = inMemoryEntityCacheMap.get(cacheKey) as ClinicalCachedEntity<T> | undefined;
	if (memHit) return memHit;

	try {
		const db = await openOfflineOutboxDb();
		if (db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME)) {
			const result = await new Promise<ClinicalCachedEntity<T> | null>((resolve, reject) => {
				const tx = db.transaction(CLINICAL_CACHE_STORE_NAME, "readonly");
				const req = tx.objectStore(CLINICAL_CACHE_STORE_NAME).get(cacheKey);
				req.onsuccess = () => resolve((req.result as ClinicalCachedEntity<T>) ?? null);
				req.onerror = () => reject(req.error ?? new Error("Failed to get cached entity"));
			});
			if (result) {
				inMemoryEntityCacheMap.set(cacheKey, result as ClinicalCachedEntity<unknown>);
				return result;
			}
		}
		const local = getLocalStorageCachedEntity<T>(cacheKey);
		if (local) inMemoryEntityCacheMap.set(cacheKey, local as ClinicalCachedEntity<unknown>);
		return local;
	} catch (err) {
		logger.debug(`[ClinicalCacheStorage] IDB get cache failed for ${cacheKey}`, err);
		const local = getLocalStorageCachedEntity<T>(cacheKey);
		if (local) inMemoryEntityCacheMap.set(cacheKey, local as ClinicalCachedEntity<unknown>);
		return local;
	}
}

export async function deleteCachedClinicalRecord(entityKind: CachedEntityKind | string, entityId: string): Promise<void> {
	const cacheKey = buildCacheKey(entityKind, entityId);
	inMemoryEntityCacheMap.delete(cacheKey);
	cancelBatchedStorePut(CLINICAL_CACHE_STORE_NAME, cacheKey);
	removeLocalStorageCachedEntity(cacheKey);

	try {
		const db = await openOfflineOutboxDb();
		if (db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME)) {
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(CLINICAL_CACHE_STORE_NAME, "readwrite");
				const req = tx.objectStore(CLINICAL_CACHE_STORE_NAME).delete(cacheKey);
				req.onsuccess = () => resolve();
				req.onerror = () => reject(req.error ?? new Error("Failed to delete cached entity"));
			});
		}
	} catch (err) {
		logger.warn(`[ClinicalCacheStorage] Error deleting IDB cached record ${cacheKey}`, err);
	}
}

export async function clearClinicalCacheByKind(entityKind: CachedEntityKind | string): Promise<number> {
	const list = await listCachedClinicalRecords(entityKind);
	for (const item of list) await deleteCachedClinicalRecord(item.entityKind, item.entityId);
	return list.length;
}

export async function clearAllClinicalCache(): Promise<number> {
	const list = await listCachedClinicalRecords();
	inMemoryEntityCacheMap.clear();
	for (const item of list) await deleteCachedClinicalRecord(item.entityKind, item.entityId);
	return list.length;
}

export const setCachedEntity = cacheClinicalRecord;
export const getCachedEntity = getCachedClinicalRecord;
export const removeCachedEntity = deleteCachedClinicalRecord;
