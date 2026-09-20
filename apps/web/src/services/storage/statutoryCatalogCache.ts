/**
 * statutoryCatalogCache.ts — High-performance IndexedDB & RAM catalog cache
 * for statutory reference books (Nomenclature 804n, ICD-10, EMR 043/u templates).
 *
 * GOAL (Mandates 8c, 8n):
 * Zero-ms head seek latency on slow mechanical HDDs (5400 RPM) and instant startup
 * on low-spec workstations (Celeron / Atom / 4GB RAM) without blocking doctors or receptionists.
 */

import {
	getCachedStatutoryCatalog,
	cacheStatutoryCatalog,
	deleteCachedClinicalRecord,
} from "./clinicalCacheStorage";
import {
	setCachedApiResponse,
	getCachedApiResponse,
	readCatalogFromPersistentStorage,
} from "../../lib/apiCacheEngine";

// In-memory RAM L1 cache for sub-millisecond synchronous returns
let ram804nCache: unknown[] | null = null;
let ramIcd10Cache: unknown[] | null = null;
let ramTemplatesCache: unknown[] | null = null;

export interface StatutoryCatalogCacheStats {
	readonly has804nInRam: boolean;
	readonly hasIcd10InRam: boolean;
	readonly hasTemplatesInRam: boolean;
	readonly ramItemCount: number;
}

/**
 * Loads or returns cached Nomenclature 804n.
 * Tries: RAM L1 -> IndexedDB L2 -> lazy static presets -> writes to IndexedDB & RAM.
 */
export async function getOrLoadNomenclature804n<T = unknown>(): Promise<T[]> {
	if (ram804nCache && ram804nCache.length > 0) {
		return ram804nCache as T[];
	}

	// Try apiCacheEngine RAM
	const apiCached =
		getCachedApiResponse<T[]>("/api/clinical/804n") ||
		getCachedApiResponse<T[]>("/api/clinical/nomenclature");
	if (apiCached?.data && Array.isArray(apiCached.data) && apiCached.data.length > 0) {
		ram804nCache = apiCached.data;
		return apiCached.data;
	}

	// Try IndexedDB storage (clinicalCacheStorage)
	try {
		const idbCached = await getCachedStatutoryCatalog<T[]>("catalog_804n");
		if (idbCached && Array.isArray(idbCached) && idbCached.length > 0) {
			ram804nCache = idbCached;
			setCachedApiResponse("/api/clinical/804n", idbCached, { ttlMs: 24 * 60 * 60 * 1000 });
			return idbCached;
		}
	} catch {
		// Fallback to next storage layer
	}

	// Try persistent storage (apiCacheEngine)
	try {
		const persistentApi =
			(await readCatalogFromPersistentStorage<T[]>("/api/clinical/804n")) ||
			(await readCatalogFromPersistentStorage<T[]>("/api/clinical/nomenclature"));
		if (persistentApi?.data && Array.isArray(persistentApi.data) && persistentApi.data.length > 0) {
			ram804nCache = persistentApi.data;
			setCachedApiResponse("/api/clinical/804n", persistentApi.data, { ttlMs: 24 * 60 * 60 * 1000 });
			void cacheStatutoryCatalog("catalog_804n", persistentApi.data).catch(() => {});
			return persistentApi.data;
		}
	} catch {
		// Fallback to static presets on storage failure
	}

	// Fallback to statutory presets
	const { STATUTORY_804N_NOMENCLATURE } = await import(
		"../../components/insurance/dmsInsurancePresets"
	);
	const data = (STATUTORY_804N_NOMENCLATURE ?? []) as T[];
	ram804nCache = data;
	setCachedApiResponse("/api/clinical/804n", data, { ttlMs: 24 * 60 * 60 * 1000 });
	void cacheStatutoryCatalog("catalog_804n", data).catch(() => {});
	return data;
}

/**
 * Loads or returns cached ICD-10 Dictionary.
 * Tries: RAM L1 -> IndexedDB L2 -> lazy static presets -> writes to IndexedDB & RAM.
 */
export async function getOrLoadIcd10Dictionary<T = unknown>(): Promise<T[]> {
	if (ramIcd10Cache && ramIcd10Cache.length > 0) {
		return ramIcd10Cache as T[];
	}

	const apiCached =
		getCachedApiResponse<T[]>("/api/clinical/icd10") ||
		getCachedApiResponse<T[]>("/api/icd10");
	if (apiCached?.data && Array.isArray(apiCached.data) && apiCached.data.length > 0) {
		ramIcd10Cache = apiCached.data;
		return apiCached.data;
	}

	try {
		const idbCached = await getCachedStatutoryCatalog<T[]>("catalog_icd10");
		if (idbCached && Array.isArray(idbCached) && idbCached.length > 0) {
			ramIcd10Cache = idbCached;
			setCachedApiResponse("/api/clinical/icd10", idbCached, { ttlMs: 24 * 60 * 60 * 1000 });
			return idbCached;
		}
	} catch {
		// Fallback to next storage layer
	}

	try {
		const persistentApi =
			(await readCatalogFromPersistentStorage<T[]>("/api/clinical/icd10")) ||
			(await readCatalogFromPersistentStorage<T[]>("/api/icd10"));
		if (persistentApi?.data && Array.isArray(persistentApi.data) && persistentApi.data.length > 0) {
			ramIcd10Cache = persistentApi.data;
			setCachedApiResponse("/api/clinical/icd10", persistentApi.data, { ttlMs: 24 * 60 * 60 * 1000 });
			void cacheStatutoryCatalog("catalog_icd10", persistentApi.data).catch(() => {});
			return persistentApi.data;
		}
	} catch {
		// Fallback to static presets on storage failure
	}

	const { ICD10_DICTIONARY } = await import("../../lib/icd10");
	const data = (ICD10_DICTIONARY ?? []) as T[];
	ramIcd10Cache = data;
	setCachedApiResponse("/api/clinical/icd10", data, { ttlMs: 24 * 60 * 60 * 1000 });
	void cacheStatutoryCatalog("catalog_icd10", data).catch(() => {});
	return data;
}

/**
 * Loads or returns cached EMR 043/u clinical templates.
 * Tries: RAM L1 -> IndexedDB L2 -> lazy static presets -> writes to IndexedDB & RAM.
 */
export async function getOrLoadClinical043Templates<T = unknown>(): Promise<T[]> {
	if (ramTemplatesCache && ramTemplatesCache.length > 0) {
		return ramTemplatesCache as T[];
	}

	const apiCached =
		getCachedApiResponse<T[]>("/api/emr/templates") ||
		getCachedApiResponse<T[]>("/api/templates");
	if (apiCached?.data && Array.isArray(apiCached.data) && apiCached.data.length > 0) {
		ramTemplatesCache = apiCached.data;
		return apiCached.data;
	}

	try {
		const idbCached = await getCachedStatutoryCatalog<T[]>("catalog_templates");
		if (idbCached && Array.isArray(idbCached) && idbCached.length > 0) {
			ramTemplatesCache = idbCached;
			setCachedApiResponse("/api/emr/templates", idbCached, { ttlMs: 24 * 60 * 60 * 1000 });
			return idbCached;
		}
	} catch {
		// Fallback to next storage layer
	}

	try {
		const persistentApi =
			(await readCatalogFromPersistentStorage<T[]>("/api/emr/templates")) ||
			(await readCatalogFromPersistentStorage<T[]>("/api/templates"));
		if (persistentApi?.data && Array.isArray(persistentApi.data) && persistentApi.data.length > 0) {
			ramTemplatesCache = persistentApi.data;
			setCachedApiResponse("/api/emr/templates", persistentApi.data, { ttlMs: 24 * 60 * 60 * 1000 });
			void cacheStatutoryCatalog("catalog_templates", persistentApi.data).catch(() => {});
			return persistentApi.data;
		}
	} catch {
		// Fallback to static presets on storage failure
	}

	const { CLINICAL_1CLICK_TEMPLATES_CATALOG } = await import(
		"../../components/emr/templates/clinicalDiaryTemplatesEngine"
	);
	const data = (CLINICAL_1CLICK_TEMPLATES_CATALOG ?? []) as T[];
	ramTemplatesCache = data;
	setCachedApiResponse("/api/emr/templates", data, { ttlMs: 24 * 60 * 60 * 1000 });
	void cacheStatutoryCatalog("catalog_templates", data).catch(() => {});
	return data;
}

/**
 * Seeds all statutory reference catalogs into IndexedDB and RAM on first run
 * or during background warmup, ensuring 0ms head seek on slow 5400 RPM HDDs.
 */
export async function seedAllStatutoryCatalogsInIndexedDb(): Promise<{
	nomenclatureCount: number;
	icd10Count: number;
	templatesCount: number;
}> {
	const [nom, icd, tmpl] = await Promise.all([
		getOrLoadNomenclature804n(),
		getOrLoadIcd10Dictionary(),
		getOrLoadClinical043Templates(),
	]);

	return {
		nomenclatureCount: nom.length,
		icd10Count: icd.length,
		templatesCount: tmpl.length,
	};
}

/**
 * Clears in-memory and persistent statutory catalog caches (e.g. on version upgrade).
 */
export async function clearStatutoryCatalogsCache(): Promise<void> {
	ram804nCache = null;
	ramIcd10Cache = null;
	ramTemplatesCache = null;

	await Promise.all([
		deleteCachedClinicalRecord("catalog_804n", "canonical").catch(() => {}),
		deleteCachedClinicalRecord("catalog_icd10", "canonical").catch(() => {}),
		deleteCachedClinicalRecord("catalog_templates", "canonical").catch(() => {}),
	]);
}

/**
 * Sets or updates the in-memory RAM L1 cache for a statutory catalog synchronously.
 */
export function setStatutoryCatalogInRam(
	catalogKind: "804n" | "icd10" | "templates",
	data: unknown[],
): void {
	if (catalogKind === "804n") {
		ram804nCache = data;
	} else if (catalogKind === "icd10") {
		ramIcd10Cache = data;
	} else if (catalogKind === "templates") {
		ramTemplatesCache = data;
	}
}

/**
 * Returns current RAM cache status for statutory catalogs.
 */
export function getStatutoryCatalogCacheStats(): StatutoryCatalogCacheStats {
	if (!ram804nCache) getCached804nSync();
	if (!ramIcd10Cache) getCachedIcd10Sync();
	if (!ramTemplatesCache) getCachedTemplatesSync();

	return {
		has804nInRam: Boolean(ram804nCache && ram804nCache.length > 0),
		hasIcd10InRam: Boolean(ramIcd10Cache && ramIcd10Cache.length > 0),
		hasTemplatesInRam: Boolean(ramTemplatesCache && ramTemplatesCache.length > 0),
		ramItemCount:
			(ram804nCache?.length ?? 0) +
			(ramIcd10Cache?.length ?? 0) +
			(ramTemplatesCache?.length ?? 0),
	};
}

/**
 * Synchronous RAM L1 getter for 804n nomenclature.
 * Returns items immediately (0 ms) if already loaded into memory.
 */
export function getCached804nSync<T = unknown>(): T[] | null {
	if (ram804nCache && ram804nCache.length > 0) {
		return ram804nCache as T[];
	}
	const apiCached =
		getCachedApiResponse<T[]>("/api/clinical/804n") ||
		getCachedApiResponse<T[]>("/api/clinical/nomenclature");
	if (apiCached?.data && Array.isArray(apiCached.data) && apiCached.data.length > 0) {
		ram804nCache = apiCached.data;
		return apiCached.data;
	}
	return null;
}

/**
 * Synchronous RAM L1 getter for ICD-10 dictionary.
 * Returns items immediately (0 ms) if already loaded into memory.
 */
export function getCachedIcd10Sync<T = unknown>(): T[] | null {
	if (ramIcd10Cache && ramIcd10Cache.length > 0) {
		return ramIcd10Cache as T[];
	}
	const apiCached =
		getCachedApiResponse<T[]>("/api/clinical/icd10") ||
		getCachedApiResponse<T[]>("/api/icd10");
	if (apiCached?.data && Array.isArray(apiCached.data) && apiCached.data.length > 0) {
		ramIcd10Cache = apiCached.data;
		return apiCached.data;
	}
	return null;
}

/**
 * Synchronous RAM L1 getter for EMR 043/u templates.
 * Returns items immediately (0 ms) if already loaded into memory.
 */
export function getCachedTemplatesSync<T = unknown>(): T[] | null {
	if (ramTemplatesCache && ramTemplatesCache.length > 0) {
		return ramTemplatesCache as T[];
	}
	const apiCached =
		getCachedApiResponse<T[]>("/api/emr/templates") ||
		getCachedApiResponse<T[]>("/api/templates");
	if (apiCached?.data && Array.isArray(apiCached.data) && apiCached.data.length > 0) {
		ramTemplatesCache = apiCached.data;
		return apiCached.data;
	}
	return null;
}

/**
 * Instant 0 ms synchronous search across in-memory 804n nomenclature.
 */
export function searchCached804nSync<T extends { code?: string; name?: string; serviceName?: string } = any>(
	query: string,
	limit = 50,
): T[] {
	const items = getCached804nSync<T>();
	if (!items || items.length === 0) return [];
	const q = query.trim().toLowerCase();
	if (!q) return items.slice(0, limit);

	const results: T[] = [];
	for (const item of items) {
		const code = (item.code || "").toLowerCase();
		const name = (item.name || item.serviceName || "").toLowerCase();
		if (code.includes(q) || name.includes(q)) {
			results.push(item);
			if (results.length >= limit) break;
		}
	}
	return results;
}

/**
 * Instant 0 ms synchronous search across in-memory ICD-10 catalog.
 */
export function searchCachedIcd10Sync<T extends { code?: string; name?: string; description?: string } = any>(
	query: string,
	limit = 50,
): T[] {
	const items = getCachedIcd10Sync<T>();
	if (!items || items.length === 0) return [];
	const q = query.trim().toLowerCase();
	if (!q) return items.slice(0, limit);

	const results: T[] = [];
	for (const item of items) {
		const code = (item.code || "").toLowerCase();
		const name = (item.name || item.description || "").toLowerCase();
		if (code.includes(q) || name.includes(q)) {
			results.push(item);
			if (results.length >= limit) break;
		}
	}
	return results;
}

