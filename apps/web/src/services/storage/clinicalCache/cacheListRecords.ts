import { logger } from "../../../utils/logger";
import { openOfflineOutboxDb, CLINICAL_CACHE_STORE_NAME } from "../../offline/offlineStorage";
import type { CachedEntityKind, ClinicalCachedEntity } from "../storageTypes";
import { LOCAL_STORAGE_CACHE_PREFIX } from "./types";
import { inMemoryEntityCacheMap, getLocalStorageCachedEntity } from "./cacheStorageMemory";

export async function listCachedClinicalRecords<T = unknown>(
	entityKind?: CachedEntityKind | string | undefined,
	organizationId?: string | undefined,
): Promise<ClinicalCachedEntity<T>[]> {
	const mapByKey = new Map<string, ClinicalCachedEntity<T>>();

	for (const [key, memVal] of inMemoryEntityCacheMap.entries()) {
		mapByKey.set(key, memVal as ClinicalCachedEntity<T>);
	}

	try {
		const db = await openOfflineOutboxDb();
		let list: ClinicalCachedEntity<T>[] = [];

		if (db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME)) {
			list = await new Promise<ClinicalCachedEntity<T>[]>((resolve, reject) => {
				const tx = db.transaction(CLINICAL_CACHE_STORE_NAME, "readonly");
				const store = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
				const req = store.getAll();
				req.onsuccess = () => resolve(Array.isArray(req.result) ? (req.result as ClinicalCachedEntity<T>[]) : []);
				req.onerror = () => reject(req.error ?? new Error("Failed to list cached entities"));
			});
		}

		for (const record of list) {
			if (!mapByKey.has(record.cacheKey)) mapByKey.set(record.cacheKey, record);
		}
		sweepLocalStorage(mapByKey);
	} catch (err) {
		logger.warn("[ClinicalCacheStorage] List cached entities failed, reading localStorage", err);
		sweepLocalStorage(mapByKey);
	}

	return Array.from(mapByKey.values())
		.filter((item) => {
			if (entityKind && item.entityKind !== entityKind) return false;
			if (organizationId && item.organizationId && item.organizationId !== organizationId) return false;
			return true;
		})
		.sort((a, b) => b.cachedAtMs - a.cachedAtMs);
}

function sweepLocalStorage<T>(map: Map<string, ClinicalCachedEntity<T>>): void {
	if (typeof window === "undefined" || !window.localStorage) return;
	for (let i = 0; i < window.localStorage.length; i++) {
		const key = window.localStorage.key(i);
		if (key?.startsWith(LOCAL_STORAGE_CACHE_PREFIX)) {
			const cacheKey = key.slice(LOCAL_STORAGE_CACHE_PREFIX.length);
			if (!map.has(cacheKey)) {
				const cached = getLocalStorageCachedEntity<T>(cacheKey);
				if (cached) map.set(cacheKey, cached);
			}
		}
	}
}
