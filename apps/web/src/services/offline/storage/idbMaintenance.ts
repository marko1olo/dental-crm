import { logger } from "../../../utils/logger";
import {
	CLINICAL_CACHE_STORE_NAME,
	DRAFTS_STORE_NAME,
	ICD10_CACHE_STORE_NAME,
	LOCAL_STORAGE_DRAFTS_PREFIX,
	MUTATIONS_STORE_NAME,
	ODONTOGRAM_CACHE_STORE_NAME,
	PATIENTS_CACHE_STORE_NAME,
	PRICELIST_CACHE_STORE_NAME,
	SCHEDULES_CACHE_STORE_NAME,
} from "./constants";
import { yieldToMainThread } from "./idbBatchBuffer";
import { removeLocalStorageClinicalCache } from "./idbClinicalCache";
import {
	isIndexedDbAvailable,
	openOfflineOutboxDb,
	withIdbTransactionRetry,
} from "./idbDatabase";
import { getLocalStorageMutations } from "./idbLocalStorageFallback";
import {
	inMemoryClinicalCacheMap,
	inMemoryDraftsMap,
	inMemoryIcd10Map,
	inMemoryOdontogramsMap,
	inMemoryPatientsMap,
	inMemoryPriceListsMap,
	inMemorySchedulesMap,
	setBoundedInMemoryMap,
} from "./idbMemory";
import { clearSyncedOfflineMutations } from "./idbSyncQueue";
import type {
	CachedActiveSchedule,
	CachedIcd10Dictionary,
	CachedOdontogram,
	CachedPatientCard,
	CachedPriceList804n,
	OfflineDraft,
	OfflineMutation,
	OfflineQueueMetrics,
	PatientClinicalCacheRecord,
	StorageEstimateInfo,
} from "./types";

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
	} catch {
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
					const entries = (allCacheReq.result || []) as Array<
						Partial<PatientClinicalCacheRecord> & { key?: string; cachedAt?: number }
					>;
					for (const entry of entries) {
						const key = entry.cacheKey ?? entry.key;
						const cachedTime = entry.cachedAtMs ?? entry.cachedAt;
						if (key && cachedTime && cachedTime < sevenDaysAgo) {
							cacheStore.delete(key);
							removeLocalStorageClinicalCache(key);
							inMemoryClinicalCacheMap.delete(key);
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

/**
 * 0-Seek RAM Pre-warming for slow laptop HDDs (5400 RPM / low-spec PCs).
 * Asynchronously loads pending drafts, active schedules, price lists, and dictionaries
 * into L1 in-memory Maps during browser idle. Once pre-warmed, subsequent queries
 * execute in 0ms without disk I/O or IndexedDB transaction overhead.
 */
let isPrewarmComplete = false;
let prewarmPromise: Promise<void> | null = null;

export function prewarmOfflineCachesToRam(): Promise<void> {
	if (isPrewarmComplete) {
		return Promise.resolve();
	}
	if (prewarmPromise) {
		return prewarmPromise;
	}

	prewarmPromise = (async () => {
		try {
			if (!isIndexedDbAvailable()) return;
			const db = await openOfflineOutboxDb();

			// 1. Pre-warm drafts
			if (db.objectStoreNames.contains(DRAFTS_STORE_NAME)) {
				try {
					const tx = db.transaction(DRAFTS_STORE_NAME, "readonly");
					const store = tx.objectStore(DRAFTS_STORE_NAME);
					const req = store.getAll();
					const drafts = await new Promise<OfflineDraft<unknown>[]>((resolve, reject) => {
						req.onsuccess = () => resolve((req.result as OfflineDraft<unknown>[]) || []);
						req.onerror = () => reject(req.error);
					});
					let draftCount = 0;
					for (const draft of drafts) {
						if (draft && draft.draftKey && !inMemoryDraftsMap.has(draft.draftKey)) {
							setBoundedInMemoryMap(inMemoryDraftsMap, draft.draftKey, draft);
						}
						if (++draftCount % 40 === 0) await yieldToMainThread();
					}
				} catch (err) {
					logger.warn("[OfflineStorage] Prewarm drafts warning:", err);
				}
			}
			await yieldToMainThread();

			// 2. Pre-warm active schedules
			if (db.objectStoreNames.contains(SCHEDULES_CACHE_STORE_NAME)) {
				try {
					const tx = db.transaction(SCHEDULES_CACHE_STORE_NAME, "readonly");
					const store = tx.objectStore(SCHEDULES_CACHE_STORE_NAME);
					const req = store.getAll();
					const schedules = await new Promise<CachedActiveSchedule[]>((resolve, reject) => {
						req.onsuccess = () => resolve((req.result as CachedActiveSchedule[]) || []);
						req.onerror = () => reject(req.error);
					});
					let schedCount = 0;
					for (const sched of schedules) {
						if (sched && sched.scheduleKey && !inMemorySchedulesMap.has(sched.scheduleKey)) {
							inMemorySchedulesMap.set(sched.scheduleKey, sched);
						}
						if (++schedCount % 40 === 0) await yieldToMainThread();
					}
				} catch (err) {
					logger.warn("[OfflineStorage] Prewarm schedules warning:", err);
				}
			}
			await yieldToMainThread();

			// 3. Pre-warm price lists
			if (db.objectStoreNames.contains(PRICELIST_CACHE_STORE_NAME)) {
				try {
					const tx = db.transaction(PRICELIST_CACHE_STORE_NAME, "readonly");
					const store = tx.objectStore(PRICELIST_CACHE_STORE_NAME);
					const req = store.getAll();
					const priceLists = await new Promise<CachedPriceList804n[]>((resolve, reject) => {
						req.onsuccess = () => resolve((req.result as CachedPriceList804n[]) || []);
						req.onerror = () => reject(req.error);
					});
					let plCount = 0;
					for (const pl of priceLists) {
						if (pl && pl.catalogKey && !inMemoryPriceListsMap.has(pl.catalogKey)) {
							inMemoryPriceListsMap.set(pl.catalogKey, pl);
						}
						if (++plCount % 40 === 0) await yieldToMainThread();
					}
				} catch (err) {
					logger.warn("[OfflineStorage] Prewarm price lists warning:", err);
				}
			}
			await yieldToMainThread();

			// 4. Pre-warm ICD-10 dictionary
			if (db.objectStoreNames.contains(ICD10_CACHE_STORE_NAME)) {
				try {
					const tx = db.transaction(ICD10_CACHE_STORE_NAME, "readonly");
					const store = tx.objectStore(ICD10_CACHE_STORE_NAME);
					const req = store.getAll();
					const icd10List = await new Promise<CachedIcd10Dictionary[]>((resolve, reject) => {
						req.onsuccess = () => resolve((req.result as CachedIcd10Dictionary[]) || []);
						req.onerror = () => reject(req.error);
					});
					let icdCount = 0;
					for (const dict of icd10List) {
						if (dict && dict.dictionaryKey && !inMemoryIcd10Map.has(dict.dictionaryKey)) {
							inMemoryIcd10Map.set(dict.dictionaryKey, dict);
						}
						if (++icdCount % 40 === 0) await yieldToMainThread();
					}
				} catch (err) {
					logger.warn("[OfflineStorage] Prewarm ICD-10 warning:", err);
				}
			}
			await yieldToMainThread();

			// 5. Pre-warm patients cache
			if (db.objectStoreNames.contains(PATIENTS_CACHE_STORE_NAME)) {
				try {
					const tx = db.transaction(PATIENTS_CACHE_STORE_NAME, "readonly");
					const store = tx.objectStore(PATIENTS_CACHE_STORE_NAME);
					const req = store.getAll();
					const patients = await new Promise<CachedPatientCard[]>((resolve, reject) => {
						req.onsuccess = () => resolve((req.result as CachedPatientCard[]) || []);
						req.onerror = () => reject(req.error);
					});
					let ptCount = 0;
					for (const pt of patients) {
						if (pt && pt.patientId && !inMemoryPatientsMap.has(pt.patientId)) {
							inMemoryPatientsMap.set(pt.patientId, pt);
						}
						if (++ptCount % 40 === 0) await yieldToMainThread();
					}
				} catch (err) {
					logger.warn("[OfflineStorage] Prewarm patients warning:", err);
				}
			}
			await yieldToMainThread();

			// 6. Pre-warm odontograms cache
			if (db.objectStoreNames.contains(ODONTOGRAM_CACHE_STORE_NAME)) {
				try {
					const tx = db.transaction(ODONTOGRAM_CACHE_STORE_NAME, "readonly");
					const store = tx.objectStore(ODONTOGRAM_CACHE_STORE_NAME);
					const req = store.getAll();
					const odontograms = await new Promise<CachedOdontogram[]>((resolve, reject) => {
						req.onsuccess = () => resolve((req.result as CachedOdontogram[]) || []);
						req.onerror = () => reject(req.error);
					});
					let odCount = 0;
					for (const od of odontograms) {
						if (od && od.patientId && !inMemoryOdontogramsMap.has(od.patientId)) {
							inMemoryOdontogramsMap.set(od.patientId, od);
						}
						if (++odCount % 40 === 0) await yieldToMainThread();
					}
				} catch (err) {
					logger.warn("[OfflineStorage] Prewarm odontograms warning:", err);
				}
			}
			await yieldToMainThread();

			isPrewarmComplete = true;
			logger.info("[OfflineStorage] 0-seek L1 RAM pre-warming completed successfully.");
		} catch (err) {
			logger.warn("[OfflineStorage] Prewarm general error:", err);
		} finally {
			prewarmPromise = null;
		}
	})();

	return prewarmPromise;
}

export function isOfflineCachePrewarmed(): boolean {
	return isPrewarmComplete;
}
