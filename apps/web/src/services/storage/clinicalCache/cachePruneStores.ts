import {
	CLINICAL_CACHE_STORE_NAME,
	DRAFTS_STORE_NAME,
	MUTATIONS_STORE_NAME,
	SCHEDULES_CACHE_STORE_NAME,
	cancelBatchedStorePut,
	openOfflineOutboxDb,
	yieldToMainThread,
} from "../../offline/offlineStorage";
import { safeLocalStorageRemoveItem } from "../../../lib/safeLocalStorage";
import type { ClinicalCachedEntity } from "../storageTypes";
import { inMemoryEntityCacheMap, removeLocalStorageCachedEntity } from "./cacheStorageMemory";

export async function pruneIdbStores(nowMs: number, maxAgeMs: number, statutoryKeys: Set<string>) {
	let clinical = 0, drafts = 0, mutations = 0, schedules = 0;
	try {
		const db = await openOfflineOutboxDb();
		if (db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME)) {
			try {
				const tx = db.transaction(CLINICAL_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
				const req = store.getAll();
				const records = await new Promise<ClinicalCachedEntity[]>((res, rej) => {
					req.onsuccess = () => res((req.result as ClinicalCachedEntity[]) || []);
					req.onerror = () => rej(req.error);
				});
				let op = 0;
				for (const rec of records) {
					if (!rec?.cacheKey || statutoryKeys.has(rec.cacheKey)) continue;
					const age = nowMs - (rec.cachedAtMs || (rec.cachedAt ? Date.parse(rec.cachedAt) : 0));
					if (age > maxAgeMs) {
						store.delete(rec.cacheKey);
						inMemoryEntityCacheMap.delete(rec.cacheKey);
						cancelBatchedStorePut(CLINICAL_CACHE_STORE_NAME, rec.cacheKey);
						removeLocalStorageCachedEntity(rec.cacheKey);
						clinical++;
					}
					if (++op % 50 === 0) await yieldToMainThread();
				}
			} catch {}
		}

		if (db.objectStoreNames.contains(DRAFTS_STORE_NAME)) {
			try {
				const tx = db.transaction(DRAFTS_STORE_NAME, "readwrite");
				const store = tx.objectStore(DRAFTS_STORE_NAME);
				const req = store.getAll();
				const list = await new Promise<any[]>((res, rej) => {
					req.onsuccess = () => res((req.result as any[]) || []);
					req.onerror = () => rej(req.error);
				});
				let op = 0;
				for (const d of list) {
					if (!d?.draftKey) continue;
					const age = nowMs - (d.updatedAtMs || (d.updatedAt ? Date.parse(d.updatedAt) : 0));
					if (age > maxAgeMs && d.isSaved !== false) {
						store.delete(d.draftKey);
						safeLocalStorageRemoveItem(`dente_offline_draft_v1:${d.draftKey}`);
						drafts++;
					}
					if (++op % 50 === 0) await yieldToMainThread();
				}
			} catch {}
		}

		if (db.objectStoreNames.contains(MUTATIONS_STORE_NAME)) {
			try {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const req = store.getAll();
				const list = await new Promise<any[]>((res, rej) => {
					req.onsuccess = () => res((req.result as any[]) || []);
					req.onerror = () => rej(req.error);
				});
				let op = 0;
				for (const m of list) {
					if (!m?.mutationId) continue;
					if (m.status === "synced" || m.status === "duplicate" || m.status === "conflict_resolved") {
						const age = nowMs - (m.createdAtMs || (m.createdAt ? Date.parse(m.createdAt) : 0));
						if (age > maxAgeMs) { store.delete(m.mutationId); mutations++; }
					}
					if (++op % 50 === 0) await yieldToMainThread();
				}
			} catch {}
		}

		if (db.objectStoreNames.contains(SCHEDULES_CACHE_STORE_NAME)) {
			try {
				const tx = db.transaction(SCHEDULES_CACHE_STORE_NAME, "readwrite");
				const store = tx.objectStore(SCHEDULES_CACHE_STORE_NAME);
				const req = store.getAll();
				const list = await new Promise<any[]>((res, rej) => {
					req.onsuccess = () => res((req.result as any[]) || []);
					req.onerror = () => rej(req.error);
				});
				let op = 0;
				for (const s of list) {
					if (!s?.scheduleKey) continue;
					const age = nowMs - (s.cachedAtMs || (s.cachedAt ? Date.parse(s.cachedAt) : 0));
					if (age > maxAgeMs) {
						store.delete(s.scheduleKey);
						safeLocalStorageRemoveItem(`dente_schedule_cache_v1:${s.scheduleKey}`);
						schedules++;
					}
					if (++op % 50 === 0) await yieldToMainThread();
				}
			} catch {}
		}
	} catch {}
	return { clinical, drafts, mutations, schedules };
}
