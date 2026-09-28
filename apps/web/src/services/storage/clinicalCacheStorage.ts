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
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
	safeLocalStorageRemoveItem,
} from "../../lib/safeLocalStorage";
import {
	isIndexedDbAvailable,
	openOfflineOutboxDb,
	CLINICAL_CACHE_STORE_NAME,
	DRAFTS_STORE_NAME,
	MUTATIONS_STORE_NAME,
	SCHEDULES_CACHE_STORE_NAME,
	formatBytesHuman,
	type StorageEstimateInfo,
	queueBatchedStorePut,
	cancelBatchedStorePut,
	yieldToMainThread,
} from "../offline/offlineStorage";
import type {
	CachedEntityKind,
	ClinicalCachedEntity,
	StoragePruneReport,
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
	try {
		const raw = safeLocalStorageGetItem(
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
	try {
		const storageKey = `${LOCAL_STORAGE_CACHE_PREFIX}${entity.cacheKey}`;
		const serialized = JSON.stringify(entity);
		safeLocalStorageSetItem(storageKey, serialized);
	} catch (err) {
		logger.error(
			`[ClinicalCacheStorage] Error saving localStorage cache ${entity.cacheKey}`,
			err,
		);
	}
}

function removeLocalStorageCachedEntity(cacheKey: string): void {
	try {
		safeLocalStorageRemoveItem(`${LOCAL_STORAGE_CACHE_PREFIX}${cacheKey}`);
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
 * Clears the in-memory L1 clinical entity cache (0 ms)
 */
export function clearInMemoryClinicalCache(): void {
	inMemoryEntityCacheMap.clear();
}

/**
 * Lists all cached clinical records of a specific entity kind
 * Merges L1 in-memory cache, IndexedDB, and localStorage to guarantee 0ms instant display.
 */
export async function listCachedClinicalRecords<T = unknown>(
	entityKind?: CachedEntityKind | string | undefined,
	organizationId?: string | undefined,
): Promise<ClinicalCachedEntity<T>[]> {
	const mapByKey = new Map<string, ClinicalCachedEntity<T>>();

	// 1. First populate from L1 RAM cache (0 ms seek, includes freshly cached records before IDB flush)
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

		for (const record of list) {
			if (!mapByKey.has(record.cacheKey)) {
				mapByKey.set(record.cacheKey, record);
			}
		}

		if (typeof window !== "undefined" && window.localStorage) {
			for (let i = 0; i < window.localStorage.length; i++) {
				const key = window.localStorage.key(i);
				if (key?.startsWith(LOCAL_STORAGE_CACHE_PREFIX)) {
					const cacheKey = key.slice(LOCAL_STORAGE_CACHE_PREFIX.length);
					if (!mapByKey.has(cacheKey)) {
						const cached = getLocalStorageCachedEntity<T>(cacheKey);
						if (cached) mapByKey.set(cacheKey, cached);
					}
				}
			}
		}
	} catch (err) {
		logger.warn("[ClinicalCacheStorage] List cached entities failed, reading localStorage", err);
		if (typeof window !== "undefined" && window.localStorage) {
			for (let i = 0; i < window.localStorage.length; i++) {
				const key = window.localStorage.key(i);
				if (key?.startsWith(LOCAL_STORAGE_CACHE_PREFIX)) {
					const cacheKey = key.slice(LOCAL_STORAGE_CACHE_PREFIX.length);
					if (!mapByKey.has(cacheKey)) {
						const cached = getLocalStorageCachedEntity<T>(cacheKey);
						if (cached) mapByKey.set(cacheKey, cached);
					}
				}
			}
		}
	}

	return Array.from(mapByKey.values())
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

/**
 * Deletes a cached clinical record
 */
export async function deleteCachedClinicalRecord(
	entityKind: CachedEntityKind | string,
	entityId: string,
): Promise<void> {
	const cacheKey = buildCacheKey(entityKind, entityId);
	inMemoryEntityCacheMap.delete(cacheKey);
	cancelBatchedStorePut(CLINICAL_CACHE_STORE_NAME, cacheKey);
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
	inMemoryEntityCacheMap.clear();
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

export const DEFAULT_STALE_SNAPSHOT_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Background Housekeeping: Prunes stale offline snapshots older than 30 days
 * from IndexedDB and LocalStorage to prevent boundless storage growth.
 *
 * Guaranteed Invariants:
 * 1. Statutory reference catalogs (804n nomenclature, ICD-10, 043/u templates) are NEVER pruned.
 * 2. Uncommitted or in-flight dirty drafts are NEVER pruned.
 * 3. Non-blocking asynchronous chunking yields to main thread to prevent UI freezing on low-spec PCs.
 * 4. In-memory L1 cache maps are cleared alongside disk records.
 */
export async function pruneStaleOfflineSnapshots(
	maxAgeMs: number = DEFAULT_STALE_SNAPSHOT_TTL_MS,
): Promise<StoragePruneReport> {
	const nowMs = Date.now();
	let prunedClinicalCacheCount = 0;
	let prunedDraftsCount = 0;
	let prunedMutationsCount = 0;
	let prunedSchedulesCount = 0;
	let prunedLocalStorageCount = 0;

	const statutoryCatalogKeys = new Set([
		"catalog_804n:canonical",
		"catalog_icd10:canonical",
		"catalog_templates:canonical",
	]);

	try {
		const db = await openOfflineOutboxDb();

		// 1. Prune Clinical Cache Store
		if (db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME)) {
			try {
				const tx = db.transaction(CLINICAL_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
				const req = store.getAll();
				const records = await new Promise<ClinicalCachedEntity[]>((resolve, reject) => {
					req.onsuccess = () => resolve((req.result as ClinicalCachedEntity[]) || []);
					req.onerror = () => reject(req.error);
				});

				let opCount = 0;
				for (const rec of records) {
					if (!rec || !rec.cacheKey) continue;
					if (statutoryCatalogKeys.has(rec.cacheKey)) continue;

					const age = nowMs - (rec.cachedAtMs || (rec.cachedAt ? Date.parse(rec.cachedAt) : 0));
					if (age > maxAgeMs) {
						store.delete(rec.cacheKey);
						inMemoryEntityCacheMap.delete(rec.cacheKey);
						cancelBatchedStorePut(CLINICAL_CACHE_STORE_NAME, rec.cacheKey);
						removeLocalStorageCachedEntity(rec.cacheKey);
						prunedClinicalCacheCount++;
					}
					if (++opCount % 50 === 0) await yieldToMainThread();
				}
			} catch (err) {
				logger.warn("[ClinicalCacheStorage] Prune clinical_cache failed:", err);
			}
		}

		// 2. Prune Saved Stale Drafts Store (>30 days)
		if (db.objectStoreNames.contains(DRAFTS_STORE_NAME)) {
			try {
				const tx = db.transaction(DRAFTS_STORE_NAME, "readwrite");
				const store = tx.objectStore(DRAFTS_STORE_NAME);
				const req = store.getAll();
				const drafts = await new Promise<any[]>((resolve, reject) => {
					req.onsuccess = () => resolve((req.result as any[]) || []);
					req.onerror = () => reject(req.error);
				});

				let opCount = 0;
				for (const draft of drafts) {
					if (!draft || !draft.draftKey) continue;
					const timestamp = draft.updatedAtMs || (draft.updatedAt ? Date.parse(draft.updatedAt) : 0);
					const age = nowMs - timestamp;
					if (age > maxAgeMs && draft.isSaved !== false) {
						store.delete(draft.draftKey);
						safeLocalStorageRemoveItem(`dente_offline_draft_v1:${draft.draftKey}`);
						prunedDraftsCount++;
					}
					if (++opCount % 50 === 0) await yieldToMainThread();
				}
			} catch (err) {
				logger.warn("[ClinicalCacheStorage] Prune drafts failed:", err);
			}
		}

		// 3. Prune Synced/Duplicate Mutations (>30 days)
		if (db.objectStoreNames.contains(MUTATIONS_STORE_NAME)) {
			try {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const req = store.getAll();
				const mutations = await new Promise<any[]>((resolve, reject) => {
					req.onsuccess = () => resolve((req.result as any[]) || []);
					req.onerror = () => reject(req.error);
				});

				let opCount = 0;
				for (const m of mutations) {
					if (!m || !m.mutationId) continue;
					const isFinished =
						m.status === "synced" ||
						m.status === "duplicate" ||
						m.status === "conflict_resolved";
					if (isFinished) {
						const timestamp = m.createdAtMs || (m.createdAt ? Date.parse(m.createdAt) : 0);
						if (nowMs - timestamp > maxAgeMs) {
							store.delete(m.mutationId);
							prunedMutationsCount++;
						}
					}
					if (++opCount % 50 === 0) await yieldToMainThread();
				}
			} catch (err) {
				logger.warn("[ClinicalCacheStorage] Prune mutations failed:", err);
			}
		}

		// 4. Prune Stale Schedule Caches (>30 days)
		if (db.objectStoreNames.contains(SCHEDULES_CACHE_STORE_NAME)) {
			try {
				const tx = db.transaction(SCHEDULES_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(SCHEDULES_CACHE_STORE_NAME);
				const req = store.getAll();
				const schedules = await new Promise<any[]>((resolve, reject) => {
					req.onsuccess = () => resolve((req.result as any[]) || []);
					req.onerror = () => reject(req.error);
				});

				let opCount = 0;
				for (const sch of schedules) {
					if (!sch || !sch.scheduleKey) continue;
					const timestamp = sch.cachedAtMs || (sch.cachedAt ? Date.parse(sch.cachedAt) : 0);
					if (nowMs - timestamp > maxAgeMs) {
						store.delete(sch.scheduleKey);
						safeLocalStorageRemoveItem(`dente_schedule_cache_v1:${sch.scheduleKey}`);
						prunedSchedulesCount++;
					}
					if (++opCount % 50 === 0) await yieldToMainThread();
				}
			} catch (err) {
				logger.warn("[ClinicalCacheStorage] Prune schedules failed:", err);
			}
		}
	} catch (err) {
		logger.debug("[ClinicalCacheStorage] IDB not accessible during prune, proceeding with localStorage", err);
	}

	// 5. Sweep LocalStorage for stale entries
	if (typeof window !== "undefined" && window.localStorage) {
		try {
			const keysToRemove: string[] = [];
			for (let i = 0; i < window.localStorage.length; i++) {
				const key = window.localStorage.key(i);
				if (!key) continue;

				if (key.startsWith(LOCAL_STORAGE_CACHE_PREFIX)) {
					const cacheKey = key.slice(LOCAL_STORAGE_CACHE_PREFIX.length);
					if (statutoryCatalogKeys.has(cacheKey)) continue;

					const raw = safeLocalStorageGetItem(key);
					if (raw) {
						try {
							const parsed = JSON.parse(raw);
							const timestamp =
								parsed?.cachedAtMs || (parsed?.cachedAt ? Date.parse(parsed.cachedAt) : 0);
							if (timestamp > 0 && nowMs - timestamp > maxAgeMs) {
								keysToRemove.push(key);
							}
						} catch {
							// skip unparseable
						}
					}
				}
			}

			for (const key of keysToRemove) {
				safeLocalStorageRemoveItem(key);
				prunedLocalStorageCount++;
			}
		} catch (err) {
			logger.warn("[ClinicalCacheStorage] LocalStorage prune error:", err);
		}
	}

	const totalPrunedCount =
		prunedClinicalCacheCount +
		prunedDraftsCount +
		prunedMutationsCount +
		prunedSchedulesCount +
		prunedLocalStorageCount;

	const report: StoragePruneReport = {
		prunedAt: new Date(nowMs).toISOString(),
		ttlDays: Math.round(maxAgeMs / (24 * 60 * 60 * 1000)),
		prunedClinicalCacheCount,
		prunedDraftsCount,
		prunedMutationsCount,
		prunedSchedulesCount,
		prunedLocalStorageCount,
		totalPrunedCount,
	};

	if (totalPrunedCount > 0) {
		logger.info(
			`[ClinicalCacheStorage] Housekeeping pruned ${totalPrunedCount} stale offline snapshots (> ${report.ttlDays} days)`,
		);
	}

	return report;
}

let isPruneScheduled = false;

/**
 * Schedules background idle housekeeping to run during browser idle time.
 */
export function scheduleStoragePruneIdle(maxAgeMs?: number): void {
	if (isPruneScheduled || typeof window === "undefined") return;
	isPruneScheduled = true;
	const runPrune = () => {
		void pruneStaleOfflineSnapshots(maxAgeMs).catch((err) => {
			logger.debug("[ClinicalCacheStorage] Idle prune warning:", err);
		});
	};

	const win = window as unknown as { requestIdleCallback?: (cb: () => void, opt: { timeout: number }) => number };
	if (typeof win.requestIdleCallback === "function") {
		win.requestIdleCallback(() => runPrune(), { timeout: 10_000 });
	} else {
		setTimeout(runPrune, 5_000);
	}
}

