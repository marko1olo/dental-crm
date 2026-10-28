import { logger } from "../../../../utils/logger";
import { MUTATIONS_STORE_NAME } from "../constants";
import { inMemoryMutationsMap, setBoundedInMemoryMap } from "../idbMemory";
import { getLocalStorageMutations, saveLocalStorageMutations } from "../idbLocalStorageFallback";
import { withIdbTransactionRetry } from "../idbDatabase";
import { createMutationEnvelope } from "./idbQueueDedup";
import { getPendingOfflineMutations } from "./idbMutationCrud";
import type { EnqueueMutationInput, OfflineMutation } from "./types";

export async function enqueueOfflineMutation<T = unknown>(input: EnqueueMutationInput<T>): Promise<OfflineMutation<T>> {
	const mutation = createMutationEnvelope(input);
	setBoundedInMemoryMap(inMemoryMutationsMap, mutation.mutationId, mutation as OfflineMutation<unknown>);

	try {
		const existingPending = await getPendingOfflineMutations({ entityType: input.entityType, organizationId: input.organizationId });
		const duplicate = existingPending.find((m) =>
			m.mutationId !== mutation.mutationId && m.entityId === input.entityId &&
			m.action === (input.action || "update") && m.payloadHash === mutation.payloadHash && m.status === "pending"
		);
		if (duplicate) {
			logger.info(`[OfflineStorage] Deduplicated rapid double-click mutation for ${input.entityType}/${input.entityId}`);
			return duplicate as OfflineMutation<T>;
		}
	} catch (err) { logger.warn("[OfflineStorage] Failed to check for duplicate pending mutations:", err); }

	try {
		await withIdbTransactionRetry(async (db) => new Promise<void>((resolve, reject) => {
			const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
			const req = tx.objectStore(MUTATIONS_STORE_NAME).put(mutation);
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error ?? new Error("Failed to put mutation to IDB"));
		}));
		return mutation;
	} catch (err) {
		logger.warn("[OfflineStorage] IDB enqueue failed, using LocalStorage fallback", err);
		const list = getLocalStorageMutations().filter((m) => m.mutationId !== mutation.mutationId);
		list.push(mutation as OfflineMutation<unknown>);
		saveLocalStorageMutations(list);
		return mutation;
	}
}

export async function enqueueOfflineMutationsBatch<T = unknown>(inputs: EnqueueMutationInput<T>[]): Promise<OfflineMutation<T>[]> {
	if (!inputs || inputs.length === 0) return [];
	if (inputs.length === 1) return [await enqueueOfflineMutation(inputs[0]!)];

	const created: OfflineMutation<T>[] = [];
	const toWrite: OfflineMutation<T>[] = [];

	for (const input of inputs) {
		const m = createMutationEnvelope(input);
		setBoundedInMemoryMap(inMemoryMutationsMap, m.mutationId, m as OfflineMutation<unknown>);
		created.push(m);
	}

	try {
		const existingPending = await getPendingOfflineMutations();
		for (const m of created) {
			const dup = existingPending.find((ex) =>
				ex.entityId === m.entityId && ex.action === m.action && ex.payloadHash === m.payloadHash &&
				ex.status === "pending" && ex.mutationId !== m.mutationId
			);
			if (!dup) toWrite.push(m);
		}
	} catch { toWrite.push(...created); }

	if (toWrite.length === 0) return created;

	try {
		await withIdbTransactionRetry(async (db) => new Promise<void>((resolve, reject) => {
			const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
			const store = tx.objectStore(MUTATIONS_STORE_NAME);
			for (const mut of toWrite) store.put(mut);
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error ?? new Error("Batch put to IDB failed"));
		}));
		return created;
	} catch (err) {
		logger.warn("[OfflineStorage] IDB batch enqueue failed, using LocalStorage fallback", err);
		const list = getLocalStorageMutations();
		const ids = new Set(toWrite.map((m) => m.mutationId));
		const rest = list.filter((m) => !ids.has(m.mutationId));
		for (const mut of toWrite) rest.push(mut as OfflineMutation<unknown>);
		saveLocalStorageMutations(rest);
		return created;
	}
}
