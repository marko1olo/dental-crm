import type {
	CachedActiveSchedule,
	CachedIcd10Dictionary,
	CachedOdontogram,
	CachedPatientCard,
	CachedPriceList804n,
	OfflineDraft,
	OfflineMutation,
	PatientClinicalCacheRecord,
} from "./types";

const MAX_IN_MEMORY_MAP_ENTRIES = 500;

export function setBoundedInMemoryMap<K, V>(map: Map<K, V>, key: K, value: V): void {
	if (map.size >= MAX_IN_MEMORY_MAP_ENTRIES && !map.has(key)) {
		const iter = map.keys();
		for (let i = 0; i < 25; i++) {
			const k = iter.next().value;
			if (!k) break;
			map.delete(k);
		}
	}
	map.set(key, value);
}

export const inMemoryDraftsMap = new Map<string, OfflineDraft<unknown>>();
export const inMemoryMutationsMap = new Map<string, OfflineMutation<unknown>>();
export const inMemoryClinicalCacheMap = new Map<string, PatientClinicalCacheRecord<unknown>>();
export const inMemorySchedulesMap = new Map<string, CachedActiveSchedule>();
export const inMemoryPatientsMap = new Map<string, CachedPatientCard>();
export const inMemoryOdontogramsMap = new Map<string, CachedOdontogram>();
export const inMemoryPriceListsMap = new Map<string, CachedPriceList804n>();
export const inMemoryIcd10Map = new Map<string, CachedIcd10Dictionary>();

export function clearInMemoryOfflineStorage(): void {
	inMemoryMutationsMap.clear();
	inMemoryDraftsMap.clear();
	inMemoryClinicalCacheMap.clear();
	inMemorySchedulesMap.clear();
	inMemoryPatientsMap.clear();
	inMemoryOdontogramsMap.clear();
	inMemoryPriceListsMap.clear();
	inMemoryIcd10Map.clear();
}
