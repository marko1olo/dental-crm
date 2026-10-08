import { logger } from "../../../utils/logger";
import {
	CLINICAL_CACHE_STORE_NAME,
	LOCAL_STORAGE_CLINICAL_CACHE_PREFIX,
	LOCAL_STORAGE_PATIENTS_PREFIX,
	LOCAL_STORAGE_SCHEDULES_PREFIX,
	PATIENTS_CACHE_STORE_NAME,
	SCHEDULES_CACHE_STORE_NAME,
} from "./constants";
import { queueBatchedStorePut } from "./idbBatchBuffer";
import { withIdbTransactionRetry } from "./idbDatabase";
import {
	getFromLocalStorageSafe,
	parseJsonNonBlocking,
	removeFromLocalStorageSafe,
	removeLocalStorageClinicalCache,
	saveLocalStorageClinicalCache,
	saveToLocalStorageSafe,
} from "./idbLocalStorageFallback";
import {
	inMemoryClinicalCacheMap,
	inMemoryPatientsMap,
	inMemorySchedulesMap,
	setBoundedInMemoryMap,
} from "./idbMemory";
import type {
	CachedActiveSchedule,
	CachedPatientCard,
	PatientClinicalCacheRecord,
} from "./types";

export { removeLocalStorageClinicalCache, saveLocalStorageClinicalCache };

// ─────────────────────────────────────────────────────────────────────────────
// 9. Patient Data Fast Cache in IndexedDB (Zero Blank Screen / Instant Offline Retrieval)
// ─────────────────────────────────────────────────────────────────────────────

export function getLocalStorageClinicalCache<T>(cacheKey: string): PatientClinicalCacheRecord<T> | null {
	const raw = getFromLocalStorageSafe(`${LOCAL_STORAGE_CLINICAL_CACHE_PREFIX}${cacheKey}`);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch {
		return null;
	}
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

	// 1. L1 Instant 0ms RAM cache hit
	setBoundedInMemoryMap(inMemoryClinicalCacheMap, cacheKey, record as PatientClinicalCacheRecord<unknown>);

	// 2. Queue for coalesced batched write to IndexedDB / localStorage (Low-Spec HDD Saver)
	queueBatchedStorePut({
		storeName: CLINICAL_CACHE_STORE_NAME,
		key: cacheKey,
		record,
		localStorageKey: `${LOCAL_STORAGE_CLINICAL_CACHE_PREFIX}${record.cacheKey}`,
		serializedValue: JSON.stringify(record),
	});

	return record;
}

/**
 * Загрузка снапшота данных пациента из быстрого IndexedDB кэша (< 500 мс холодный старт)
 */
export async function getPatientClinicalCache<T = unknown>(
	cacheKey: string,
): Promise<T | null> {
	// 1. L1 In-Memory fast RAM hit (0 ms, zero 5400 RPM HDD disk seek)
	const memRecord = inMemoryClinicalCacheMap.get(cacheKey) as PatientClinicalCacheRecord<T> | undefined;
	if (memRecord?.data !== undefined && memRecord?.data !== null) {
		return memRecord.data;
	}

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
		setBoundedInMemoryMap(inMemoryClinicalCacheMap, cacheKey, {
			cacheKey,
			entityKind: "clinical",
			entityId: cacheKey,
			data: idbResult,
			cachedAtMs: Date.now(),
			cachedAtIso: new Date().toISOString(),
		} as PatientClinicalCacheRecord<unknown>);
		return idbResult;
	}

	const localRecord = getLocalStorageClinicalCache<T>(cacheKey);
	if (localRecord?.data !== undefined && localRecord?.data !== null) {
		setBoundedInMemoryMap(inMemoryClinicalCacheMap, cacheKey, localRecord as PatientClinicalCacheRecord<unknown>);
		return localRecord.data;
	}

	return null;
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
	} catch (err: unknown) {
		logger.warn("[OfflineStorage] Failed to list clinical cache from IDB, falling back to memory:", err);
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

	queueBatchedStorePut({
		storeName: SCHEDULES_CACHE_STORE_NAME,
		key: scheduleKey,
		record,
		localStorageKey: `${LOCAL_STORAGE_SCHEDULES_PREFIX}${scheduleKey}`,
		serializedValue: JSON.stringify(record),
	});

	return record;
}

export async function getCachedActiveSchedule(
	date: string,
	organizationId?: string | undefined,
): Promise<CachedActiveSchedule | null> {
	const orgKey = organizationId || "default";
	const scheduleKey = `schedule_${orgKey}_${date}`;

	// 1. Fast L1 In-Memory RAM hit (0 ms, zero 5400 RPM HDD seek)
	const mem = inMemorySchedulesMap.get(scheduleKey);
	if (mem) {
		if (!organizationId || !mem.organizationId || mem.organizationId === organizationId) {
			return mem;
		}
	}

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
	} catch (err: unknown) {
		logger.warn("[OfflineStorage] Failed to read cached schedule from IDB:", err);
	}

	if (idbResult) {
		inMemorySchedulesMap.set(scheduleKey, idbResult);
		return idbResult;
	}

	const rawLocal = getFromLocalStorageSafe(`${LOCAL_STORAGE_SCHEDULES_PREFIX}${scheduleKey}`);
	if (rawLocal) {
		try {
			const parsed = await parseJsonNonBlocking(rawLocal);
			if (parsed && typeof parsed === "object") {
				const record = parsed as CachedActiveSchedule;
				inMemorySchedulesMap.set(scheduleKey, record);
				return record;
			}
		} catch (err: unknown) {
			logger.warn("[OfflineStorage] Failed to parse schedule from local storage:", err);
		}
	}

	return null;
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
	} catch (err: unknown) {
		logger.warn("[OfflineStorage] Failed to clear schedules store in IDB:", err);
	}
	return deletedCount;
}

// ─────────────────────────────────────────────────────────────────────────────
// 11. Patient Cards & Form 043/u Offline IndexedDB Cache
// ─────────────────────────────────────────────────────────────────────────────

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

	queueBatchedStorePut({
		storeName: PATIENTS_CACHE_STORE_NAME,
		key: card.patientId,
		record,
		localStorageKey: `${LOCAL_STORAGE_PATIENTS_PREFIX}${card.patientId}`,
		serializedValue: JSON.stringify(record),
	});

	return record;
}

export async function getCachedPatientCard(
	patientId: string,
	organizationId?: string | undefined,
): Promise<CachedPatientCard | null> {
	// 1. Fast L1 In-Memory RAM hit (0 ms, zero 5400 RPM HDD seek)
	const mem = inMemoryPatientsMap.get(patientId);
	if (mem) {
		if (!organizationId || !mem.organizationId || mem.organizationId === organizationId) {
			return mem;
		}
	}

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
	} catch (err: unknown) {
		logger.warn(`[OfflineStorage] Failed to read cached patient card from IDB for ${patientId}:`, err);
	}

	if (idbResult) {
		if (!organizationId || !idbResult.organizationId || idbResult.organizationId === organizationId) {
			inMemoryPatientsMap.set(patientId, idbResult);
			return idbResult;
		}
	}

	const rawLocal = getFromLocalStorageSafe(`${LOCAL_STORAGE_PATIENTS_PREFIX}${patientId}`);
	if (rawLocal) {
		try {
			const parsed = (await parseJsonNonBlocking<CachedPatientCard>(rawLocal)) as CachedPatientCard;
			if (parsed && typeof parsed === "object") {
				if (!organizationId || !parsed.organizationId || parsed.organizationId === organizationId) {
					inMemoryPatientsMap.set(patientId, parsed);
					return parsed;
				}
			}
		} catch (err: unknown) {
			logger.warn(`[OfflineStorage] Failed to parse cached patient card from local storage for ${patientId}:`, err);
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
	} catch (err: unknown) {
		logger.warn(`[OfflineStorage] Failed to delete patient card from IDB for ${patientId}:`, err);
	}
}
