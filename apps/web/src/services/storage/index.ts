/**
 * DENTE CRM — Client Storage & Offline Resilience Facade
 *
 * Re-exports:
 * - IndexedDB Outbox & Mutations Storage
 * - Drafts Persistence (043/у, 107-1/у, odontogram, documents, receipts)
 * - Clinical Entity Cache
 * - Storage Quota & Persistence Manager
 */

export * from "../offline/offlineStorage";
export type {
	CachedEntityKind,
	ClinicalCachedEntity,
} from "./storageTypes";
export {
	setCachedEntity,
	getCachedEntity,
	removeCachedEntity,
	clearClinicalCacheByKind,
	clearAllClinicalCache,
	requestPersistentStorage,
	cacheStatutoryCatalog,
	getCachedStatutoryCatalog,
} from "./clinicalCacheStorage";

export {
	getOrLoadNomenclature804n,
	getOrLoadIcd10Dictionary,
	getOrLoadClinical043Templates,
	seedAllStatutoryCatalogsInIndexedDb,
	clearStatutoryCatalogsCache,
	getStatutoryCatalogCacheStats,
	type StatutoryCatalogCacheStats,
} from "./statutoryCatalogCache";

