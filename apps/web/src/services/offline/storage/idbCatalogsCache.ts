import { logger } from "../../../utils/logger";
import {
	DEFAULT_ICD10_DICTIONARY_ID,
	ICD10_CACHE_STORE_NAME,
	LOCAL_STORAGE_ICD10_PREFIX,
	LOCAL_STORAGE_ODONTOGRAM_PREFIX,
	LOCAL_STORAGE_PRICELIST_PREFIX,
	ODONTOGRAM_CACHE_STORE_NAME,
	PRICELIST_CACHE_STORE_NAME,
} from "./constants";
import { queueBatchedStorePut } from "./idbBatchBuffer";
import { withIdbTransactionRetry } from "./idbDatabase";
import {
	getFromLocalStorageSafe,
	parseJsonNonBlocking,
} from "./idbLocalStorageFallback";
import {
	inMemoryIcd10Map,
	inMemoryOdontogramsMap,
	inMemoryPriceListsMap,
} from "./idbMemory";
import type {
	CachedIcd10Dictionary,
	CachedOdontogram,
	CachedOdontogramTooth,
	CachedPriceList804n,
	Icd10DictionaryItem,
	PriceList804nItem,
} from "./types";

// ─────────────────────────────────────────────────────────────────────────────
// 12. Odontograms & Tooth Surface Maps Offline IndexedDB Cache
// ─────────────────────────────────────────────────────────────────────────────

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

	queueBatchedStorePut({
		storeName: ODONTOGRAM_CACHE_STORE_NAME,
		key: params.patientId,
		record,
		localStorageKey: `${LOCAL_STORAGE_ODONTOGRAM_PREFIX}${params.patientId}`,
		serializedValue: JSON.stringify(record),
	});

	return record;
}

export async function getCachedOdontogramState(
	patientId: string,
	organizationId?: string | undefined,
): Promise<CachedOdontogram | null> {
	// 1. Fast L1 In-Memory RAM hit (0 ms, zero 5400 RPM HDD seek)
	const mem = inMemoryOdontogramsMap.get(patientId);
	if (mem) {
		if (!organizationId || !mem.organizationId || mem.organizationId === organizationId) {
			return mem;
		}
	}

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
	} catch {
		// ignore
	}

	if (idbResult) {
		if (!organizationId || !idbResult.organizationId || idbResult.organizationId === organizationId) {
			inMemoryOdontogramsMap.set(patientId, idbResult);
			return idbResult;
		}
	}

	const rawLocal = getFromLocalStorageSafe(`${LOCAL_STORAGE_ODONTOGRAM_PREFIX}${patientId}`);
	if (rawLocal) {
		try {
			const parsed = (await parseJsonNonBlocking<CachedOdontogram>(rawLocal)) as CachedOdontogram;
			if (parsed && typeof parsed === "object") {
				if (!organizationId || !parsed.organizationId || parsed.organizationId === organizationId) {
					inMemoryOdontogramsMap.set(patientId, parsed);
					return parsed;
				}
			}
		} catch {
			// ignore
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

	queueBatchedStorePut({
		storeName: PRICELIST_CACHE_STORE_NAME,
		key: catalogKey,
		record,
		localStorageKey: `${LOCAL_STORAGE_PRICELIST_PREFIX}${catalogKey}`,
		serializedValue: JSON.stringify(record),
	});

	return record;
}

export async function getCachedPriceList804n(
	organizationId?: string | undefined,
): Promise<CachedPriceList804n | null> {
	const orgKey = organizationId || "default";
	const catalogKey = `pricelist_804n_${orgKey}`;

	// 1. Fast L1 In-Memory RAM hit (0 ms, zero 5400 RPM HDD seek)
	const mem = inMemoryPriceListsMap.get(catalogKey);
	if (mem) return mem;

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
	} catch (err: unknown) {
		logger.warn(`[OfflineStorage] Failed to read cached pricelist from IDB for ${catalogKey}:`, err);
	}

	if (idbResult) {
		inMemoryPriceListsMap.set(catalogKey, idbResult);
		return idbResult;
	}

	const rawLocal = getFromLocalStorageSafe(`${LOCAL_STORAGE_PRICELIST_PREFIX}${catalogKey}`);
	if (rawLocal) {
		try {
			const parsed = (await parseJsonNonBlocking<CachedPriceList804n>(rawLocal)) as CachedPriceList804n;
			if (parsed && typeof parsed === "object") {
				inMemoryPriceListsMap.set(catalogKey, parsed);
				return parsed;
			}
		} catch (err: unknown) {
			logger.warn(`[OfflineStorage] Failed to parse cached pricelist from local storage for ${catalogKey}:`, err);
		}
	}

	return null;
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

	queueBatchedStorePut({
		storeName: ICD10_CACHE_STORE_NAME,
		key: dictionaryKey,
		record,
		localStorageKey: `${LOCAL_STORAGE_ICD10_PREFIX}${dictionaryKey}`,
		serializedValue: JSON.stringify(record),
	});

	return record;
}

export async function getCachedIcd10Dictionary(
	dictionaryKey = DEFAULT_ICD10_DICTIONARY_ID,
): Promise<CachedIcd10Dictionary | null> {
	// 1. Fast L1 In-Memory RAM hit (0 ms, zero 5400 RPM HDD seek)
	const mem = inMemoryIcd10Map.get(dictionaryKey);
	if (mem) return mem;

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
	} catch {
		// ignore
	}

	if (idbResult) {
		inMemoryIcd10Map.set(dictionaryKey, idbResult);
		return idbResult;
	}

	const rawLocal = getFromLocalStorageSafe(`${LOCAL_STORAGE_ICD10_PREFIX}${dictionaryKey}`);
	if (rawLocal) {
		try {
			const parsed = (await parseJsonNonBlocking<CachedIcd10Dictionary>(rawLocal)) as CachedIcd10Dictionary;
			if (parsed && typeof parsed === "object") {
				inMemoryIcd10Map.set(dictionaryKey, parsed);
				return parsed;
			}
		} catch {
			// ignore
		}
	}

	return null;
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
