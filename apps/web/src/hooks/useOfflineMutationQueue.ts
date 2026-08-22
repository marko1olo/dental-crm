/**
 * DENTE CRM — Hook for Offline Mutation Queue (Outbox)
 */

import { useCallback, useEffect } from "react";
import { useOfflineStore } from "../store/offlineStore";
import type {
	EnqueueMutationInput,
	MutationEntityType,
	OfflineMutation,
} from "../utils/offlineMutationQueue";

export interface UseOfflineMutationQueueOptions {
	entityType?: MutationEntityType | undefined;
	organizationId?: string | undefined;
	autoRefreshIntervalMs?: number | undefined;
}

export function useOfflineMutationQueue(
	options: UseOfflineMutationQueueOptions = {},
) {
	const { entityType, organizationId, autoRefreshIntervalMs = 15000 } = options;

	const pendingMutations = useOfflineStore((state) => state.pendingMutations);
	const pendingMutationCount = useOfflineStore(
		(state) => state.pendingMutationCount,
	);
	const isSyncing = useOfflineStore((state) => state.isSyncing);
	const lastSyncAt = useOfflineStore((state) => state.lastSyncAt);
	const lastSyncError = useOfflineStore((state) => state.lastSyncError);
	const metrics = useOfflineStore((state) => state.metrics);

	const enqueue = useOfflineStore((state) => state.enqueue);
	const refreshQueue = useOfflineStore((state) => state.refreshQueue);
	const syncOutbox = useOfflineStore((state) => state.syncOutbox);
	const clearSynced = useOfflineStore((state) => state.clearSynced);

	const refresh = useCallback(() => {
		return refreshQueue({ entityType, organizationId });
	}, [refreshQueue, entityType, organizationId]);

	useEffect(() => {
		void refresh();
		if (autoRefreshIntervalMs > 0) {
			const timer = setInterval(() => void refresh(), autoRefreshIntervalMs);
			return () => clearInterval(timer);
		}
	}, [refresh, autoRefreshIntervalMs]);

	const enqueueMutation = useCallback(
		<T = unknown>(input: EnqueueMutationInput<T>) => {
			return enqueue<T>({
				...input,
				organizationId: input.organizationId ?? organizationId,
			});
		},
		[enqueue, organizationId],
	);

	const syncNow = useCallback(
		(executor?: (mutation: OfflineMutation) => Promise<boolean>) => {
			return syncOutbox(executor);
		},
		[syncOutbox],
	);

	return {
		pendingMutations,
		pendingMutationCount,
		isSyncing,
		lastSyncAt,
		lastSyncError,
		metrics,
		enqueueMutation,
		syncNow,
		refresh,
		clearSynced,
	};
}
