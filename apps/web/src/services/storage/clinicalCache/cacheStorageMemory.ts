import { logger } from "../../../utils/logger";
import {
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import type { CachedEntityKind, ClinicalCachedEntity } from "../storageTypes";
import { LOCAL_STORAGE_CACHE_PREFIX, buildCacheKey } from "./types";

export const inMemoryEntityCacheMap = new Map<string, ClinicalCachedEntity<unknown>>();

export function getLocalStorageCachedEntity<T>(cacheKey: string): ClinicalCachedEntity<T> | null {
	try {
		const raw = safeLocalStorageGetItem(`${LOCAL_STORAGE_CACHE_PREFIX}${cacheKey}`);
		if (!raw) return null;
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch (err) {
		logger.error(`[ClinicalCacheStorage] Error reading localStorage cache ${cacheKey}`, err);
		return null;
	}
}

export function saveLocalStorageCachedEntity<T>(entity: ClinicalCachedEntity<T>): void {
	try {
		safeLocalStorageSetItem(`${LOCAL_STORAGE_CACHE_PREFIX}${entity.cacheKey}`, JSON.stringify(entity));
	} catch (err) {
		logger.error(`[ClinicalCacheStorage] Error saving localStorage cache ${entity.cacheKey}`, err);
	}
}

export function removeLocalStorageCachedEntity(cacheKey: string): void {
	try {
		safeLocalStorageRemoveItem(`${LOCAL_STORAGE_CACHE_PREFIX}${cacheKey}`);
	} catch (err) {
		logger.error(`[ClinicalCacheStorage] Error removing localStorage cache ${cacheKey}`, err);
	}
}

export function getCachedClinicalRecordSync<T = unknown>(
	entityKind: CachedEntityKind | string,
	entityId: string,
): ClinicalCachedEntity<T> | null {
	const cacheKey = buildCacheKey(entityKind, entityId);
	const memHit = inMemoryEntityCacheMap.get(cacheKey) as ClinicalCachedEntity<T> | undefined;
	if (memHit) return memHit;

	const localRecord = getLocalStorageCachedEntity<T>(cacheKey);
	if (localRecord) inMemoryEntityCacheMap.set(cacheKey, localRecord as ClinicalCachedEntity<unknown>);
	return localRecord;
}

export const getCachedEntitySync = getCachedClinicalRecordSync;

export function clearInMemoryClinicalCache(): void {
	inMemoryEntityCacheMap.clear();
}
