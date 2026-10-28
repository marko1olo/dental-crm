import { logger } from "../../../../utils/logger";
import { MUTATIONS_STORE_NAME } from "../constants";
import { inMemoryMutationsMap } from "../idbMemory";
import { getLocalStorageMutations, saveLocalStorageMutations } from "../idbLocalStorageFallback";
import { withIdbTransactionRetry } from "../idbDatabase";
import type { OfflineMutation } from "./types";

export async function recoverStaleSyncingMutations(staleTimeoutMs = 60000): Promise<number> {
	let recoveredCount = 0;
	const now = Date.now();

	for (const m of inMemoryMutationsMap.values()) {
		if (m.status === "syncing" && (now - (m.timestampMs || 0) > staleTimeoutMs)) {
			m.status = "pending";
			recoveredCount++;
		}
	}

	try {
		await withIdbTransactionRetry(async (db) => new Promise<void>((resolve, reject) => {
			const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
			const store = tx.objectStore(MUTATIONS_STORE_NAME);
			const req = store.getAll();
			req.onsuccess = () => {
				const all = (req.result as OfflineMutation[]) || [];
				for (const mut of all) {
					if (mut.status === "syncing" && (now - (mut.timestampMs || 0) > staleTimeoutMs)) {
						mut.status = "pending";
						store.put(mut);
						recoveredCount++;
					}
				}
				resolve();
			};
			req.onerror = () => reject(req.error);
		}));
	} catch (err) {
		const list = getLocalStorageMutations();
		let changed = false;
		for (const m of list) {
			if (m.status === "syncing" && (now - (m.timestampMs || 0) > staleTimeoutMs)) {
				m.status = "pending";
				recoveredCount++;
				changed = true;
			}
		}
		if (changed) saveLocalStorageMutations(list);
	}

	if (recoveredCount > 0) {
		logger.info(`[OfflineStorage] Recovered ${recoveredCount} stale "syncing" mutations back to "pending"`);
	}
	return recoveredCount;
}
