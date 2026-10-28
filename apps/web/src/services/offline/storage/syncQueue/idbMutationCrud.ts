import { logger } from "../../../../utils/logger";
import { MUTATIONS_STORE_NAME } from "../constants";
import { inMemoryMutationsMap } from "../idbMemory";
import { getLocalStorageMutations, saveLocalStorageMutations } from "../idbLocalStorageFallback";
import { withIdbTransactionRetry } from "../idbDatabase";
import { recoverStaleSyncingMutations } from "./idbMutationRecovery";
import type { MutationEntityType, MutationStatus, OfflineMutation } from "./types";

export async function getPendingOfflineMutations(filter?: {
	entityType?: MutationEntityType | undefined; organizationId?: string | undefined;
}): Promise<OfflineMutation[]> {
	try {
		await recoverStaleSyncingMutations(60000);
		const mutations = await withIdbTransactionRetry(async (db) => new Promise<OfflineMutation[]>((res, rej) => {
			const req = db.transaction(MUTATIONS_STORE_NAME, "readonly").objectStore(MUTATIONS_STORE_NAME).getAll();
			req.onsuccess = () => res(Array.isArray(req.result) ? req.result : []);
			req.onerror = () => rej(req.error ?? new Error("Failed to read mutations from IDB"));
		}));
		return filterMutations(mutations, filter);
	} catch (err) {
		logger.warn("[OfflineStorage] IDB getPending failed, using LocalStorage fallback", err);
		const list = getLocalStorageMutations();
		const mapItems = Array.from(inMemoryMutationsMap.values());
		const combined = list.length > 0 ? [...list, ...mapItems.filter((m) => !list.some((l) => l.mutationId === m.mutationId))] : mapItems;
		return filterMutations(combined, filter);
	}
}

function filterMutations(list: OfflineMutation[], filter?: { entityType?: MutationEntityType; organizationId?: string }): OfflineMutation[] {
	return list.filter((m) => {
		if (m.status !== "pending" && m.status !== "failed") return false;
		if (filter?.entityType && m.entityType !== filter.entityType) return false;
		if (filter?.organizationId && m.organizationId && m.organizationId !== filter.organizationId) return false;
		return true;
	}).sort((a, b) => a.timestampMs - b.timestampMs);
}

export async function getOfflineMutationById(id: string): Promise<OfflineMutation | null> {
	try {
		return await withIdbTransactionRetry(async (db) => new Promise<OfflineMutation | null>((res, rej) => {
			const req = db.transaction(MUTATIONS_STORE_NAME, "readonly").objectStore(MUTATIONS_STORE_NAME).get(id);
			req.onsuccess = () => res(req.result ?? null);
			req.onerror = () => rej(req.error ?? new Error("Failed to get mutation"));
		}));
	} catch {
		return getLocalStorageMutations().find((m) => m.mutationId === id) ?? null;
	}
}

export async function updateOfflineMutationStatus(mutationId: string, status: MutationStatus, error?: string): Promise<void> {
	const memMut = inMemoryMutationsMap.get(mutationId);
	if (memMut) {
		memMut.status = status;
		if (status === "failed") { memMut.retryCount = (memMut.retryCount || 0) + 1; memMut.lastError = error || "Unknown error"; }
		else if (status === "synced") { memMut.lastError = undefined; }
	}
	try {
		await withIdbTransactionRetry(async (db) => new Promise<void>((res, rej) => {
			const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
			const store = tx.objectStore(MUTATIONS_STORE_NAME);
			const req = store.get(mutationId);
			req.onsuccess = () => {
				const item = req.result as OfflineMutation | undefined;
				if (!item) { res(); return; }
				item.status = status;
				if (status === "failed") { item.retryCount = (item.retryCount || 0) + 1; item.lastError = error || "Unknown error"; }
				else if (status === "synced") { item.lastError = undefined; }
				const putReq = store.put(item);
				putReq.onsuccess = () => res();
				putReq.onerror = () => rej(putReq.error);
			};
			req.onerror = () => rej(req.error);
		}));
	} catch {
		const list = getLocalStorageMutations();
		const item = list.find((m) => m.mutationId === mutationId);
		if (item) {
			item.status = status;
			if (status === "failed") { item.retryCount = (item.retryCount || 0) + 1; item.lastError = error || "Unknown error"; }
			else if (status === "synced") { item.lastError = undefined; }
			saveLocalStorageMutations(list);
		}
	}
}

export async function markMutationSynced(id: string): Promise<void> { await updateOfflineMutationStatus(id, "synced"); }

export async function deleteOfflineMutation(id: string): Promise<void> {
	inMemoryMutationsMap.delete(id);
	try {
		await withIdbTransactionRetry(async (db) => new Promise<void>((res, rej) => {
			const req = db.transaction(MUTATIONS_STORE_NAME, "readwrite").objectStore(MUTATIONS_STORE_NAME).delete(id);
			req.onsuccess = () => res();
			req.onerror = () => rej(req.error);
		}));
	} catch {
		saveLocalStorageMutations(getLocalStorageMutations().filter((m) => m.mutationId !== id));
	}
}

export { deleteOfflineMutation as removeOfflineMutation };

export async function clearSyncedOfflineMutations(): Promise<number> {
	for (const [id, m] of inMemoryMutationsMap.entries()) {
		if (m.status === "synced") inMemoryMutationsMap.delete(id);
	}
	try {
		return await withIdbTransactionRetry(async (db) => new Promise<number>((res, rej) => {
			const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
			const store = tx.objectStore(MUTATIONS_STORE_NAME);
			const req = store.getAll();
			req.onsuccess = () => {
				const all = (req.result as OfflineMutation[]) || [];
				const synced = all.filter((m) => m.status === "synced");
				for (const item of synced) store.delete(item.mutationId);
				res(synced.length);
			};
			req.onerror = () => rej(req.error);
		}));
	} catch {
		const list = getLocalStorageMutations();
		const remaining = list.filter((m) => m.status !== "synced");
		const removed = list.length - remaining.length;
		saveLocalStorageMutations(remaining);
		return removed;
	}
}
