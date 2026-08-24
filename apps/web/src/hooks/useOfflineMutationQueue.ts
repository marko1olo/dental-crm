/**
 * DENTE CRM — React Hook for Offline Mutation Queue & Multi-Chair Synchronization
 *
 * Предоставляет React-компонентам доступ к очереди мутаций IndexedDB:
 * - Идемпотентность каждой мутации по UUIDv7/v4 + SHA-256 хэшу полезной нагрузки
 * - Экспоненциальный retry (бэкофф с джиттером) при сбоях локального Wi-Fi в клинике
 * - Разрешение конфликтов версий (Field-Level Last-Write-Wins / ServerTimestamp)
 * - Автоматический drain очереди при восстановлении соединения (isOnline / isLan)
 */

import { useCallback, useEffect } from "react";
import {
	type EnqueueMutationInput,
	type MutationEntityType,
	type OfflineMutation,
	type SyncBatchDrainOptions,
	type SyncBatchDrainResult,
	offlineSyncService,
} from "../services/offline";
import { useOfflineStore } from "../store/offlineStore";

export interface UseOfflineMutationQueueOptions {
	readonly entityType?: MutationEntityType | undefined;
	readonly organizationId?: string | undefined;
	readonly autoDrain?: boolean | undefined;
	readonly drainOptions?: SyncBatchDrainOptions | undefined;
}

export interface UseOfflineMutationQueueReturn {
	readonly pendingMutations: readonly OfflineMutation[];
	readonly pendingCount: number;
	readonly pendingMutationCount: number;
	readonly isSyncing: boolean;
	readonly isSyncingMutations: boolean;
	readonly isOnline: boolean;
	readonly isLan: boolean;
	readonly lastSyncAt: string | null;
	readonly lastSyncError: string | null;
	readonly enqueueMutation: <T = unknown>(
		input: EnqueueMutationInput<T>,
	) => Promise<OfflineMutation<T>>;
	readonly drainQueue: (
		options?: SyncBatchDrainOptions,
	) => Promise<SyncBatchDrainResult>;
	readonly syncNow: (
		options?: SyncBatchDrainOptions,
	) => Promise<SyncBatchDrainResult>;
	readonly syncOfflineMutations: (
		options?: SyncBatchDrainOptions,
	) => Promise<SyncBatchDrainResult>;
	readonly refreshQueue: (filter?: {
		entityType?: MutationEntityType | undefined;
		organizationId?: string | undefined;
	}) => Promise<void>;
}

export function useOfflineMutationQueue(
	options: UseOfflineMutationQueueOptions = {},
): UseOfflineMutationQueueReturn {
	const pendingMutations = useOfflineStore((s) => s.pendingMutations);
	const pendingCount = useOfflineStore((s) => s.pendingMutationCount);
	const isSyncing = useOfflineStore((s) => s.isSyncing);
	const networkState = useOfflineStore((s) => s.networkState);
	const lastSyncAt = useOfflineStore((s) => s.lastSyncAt);
	const lastSyncError = useOfflineStore((s) => s.lastSyncError);
	const storeEnqueue = useOfflineStore((s) => s.enqueue);
	const refreshQueue = useOfflineStore((s) => s.refreshQueue);

	const { entityType, organizationId, autoDrain = true, drainOptions } = options;

	useEffect(() => {
		void refreshQueue({ entityType, organizationId });
	}, [refreshQueue, entityType, organizationId]);

	// Подписка на события OfflineSyncService для синхронизации очереди в реальном времени
	useEffect(() => {
		const unsubscribe = offlineSyncService.subscribe((event) => {
			if (event.type === "complete" || event.type === "progress") {
				void refreshQueue({ entityType, organizationId });
			}
		});
		return () => {
			unsubscribe();
		};
	}, [refreshQueue, entityType, organizationId]);

	const drainQueue = useCallback(
		async (opts?: SyncBatchDrainOptions): Promise<SyncBatchDrainResult> => {
			useOfflineStore.setState({ isSyncing: true, lastSyncError: null });
			try {
				const mergedOptions: SyncBatchDrainOptions = {
					organizationId,
					...drainOptions,
					...opts,
				};
				const res = await offlineSyncService.drainOutbox(mergedOptions);
				await refreshQueue({ entityType, organizationId });
				useOfflineStore.setState({
					lastSyncAt: res.serverTime || new Date().toISOString(),
					lastSyncError: res.errors.length > 0 ? (res.errors[0]?.error ?? "Unknown error") : null,
					isSyncing: false,
				});
				return res;
			} catch (err) {
				const msg = err instanceof Error ? err.message : String(err);
				useOfflineStore.setState({
					lastSyncError: msg,
					isSyncing: false,
				});
				throw err;
			}
		},
		[refreshQueue, entityType, organizationId, drainOptions],
	);

	// Автоматический drain при подключении к сети (isOnline или локальной сети клиники isLan)
	useEffect(() => {
		if (!autoDrain) return;
		const isConnected = networkState.isOnline || networkState.isLan;
		if (isConnected && pendingCount > 0 && !isSyncing && !offlineSyncService.isDrainActive()) {
			void drainQueue();
		}
	}, [
		networkState.isOnline,
		networkState.isLan,
		pendingCount,
		isSyncing,
		autoDrain,
		drainQueue,
	]);

	const enqueueMutation = useCallback(
		async <T = unknown>(input: EnqueueMutationInput<T>): Promise<OfflineMutation<T>> => {
			return storeEnqueue<T>(input);
		},
		[storeEnqueue],
	);

	return {
		pendingMutations,
		pendingCount,
		pendingMutationCount: pendingCount,
		isSyncing,
		isSyncingMutations: isSyncing,
		isOnline: networkState.isOnline,
		isLan: networkState.isLan,
		lastSyncAt,
		lastSyncError,
		enqueueMutation,
		drainQueue,
		syncNow: drainQueue,
		syncOfflineMutations: drainQueue,
		refreshQueue,
	};
}
