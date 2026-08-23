/**
 * DENTE CRM — Hook for Comprehensive Offline-First Synchronization
 *
 * Предоставляет полный реактивный интерфейс:
 * - Мониторинг сети (Облако / LAN / Офлайн)
 * - Управление локальной очередью мутаций (Outbox) и черновиками в IndexedDB
 * - Автоматический бесшовный дренаж при восстановлении связи
 * - Ручной запуск синхронизации (syncNow) с экспоненциальным бэкоффом
 * - Отслеживание разрешенных конфликтов Field-Level LWW / CRDT
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
	type EnqueueMutationInput,
	type MutationEntityType,
	type OfflineDraft,
	type OfflineMutation,
	type SyncBatchDrainOptions,
	type SyncBatchDrainResult,
	type SyncConflictEvent,
	offlineSyncService,
} from "../services/offline";
import { useOfflineStore } from "../store/offlineStore";
import { useNetworkConnectivity } from "./useNetworkConnectivity";

export interface UseOfflineSyncOptions extends SyncBatchDrainOptions {
	autoSyncOnReconnect?: boolean | undefined;
	autoRefreshIntervalMs?: number | undefined;
	onConflictResolved?: ((event: SyncConflictEvent) => void) | undefined;
	onSyncCompleted?: ((result: SyncBatchDrainResult) => void) | undefined;
}

export function useOfflineSync(options: UseOfflineSyncOptions = {}) {
	const {
		autoSyncOnReconnect = true,
		autoRefreshIntervalMs = 15000,
		onConflictResolved,
		onSyncCompleted,
		batchSize,
		maxRetries,
		baseBackoffMs,
		maxBackoffMs,
		jitter,
		organizationId,
		gatewayUrl,
		headers,
		fetchImpl,
	} = options;

	const { networkState, mode, label, badgeClass, rttMs, isOnline, isLan } =
		useNetworkConnectivity();

	const pendingMutations = useOfflineStore((state) => state.pendingMutations);
	const pendingMutationCount = useOfflineStore(
		(state) => state.pendingMutationCount,
	);
	const isStoreSyncing = useOfflineStore((state) => state.isSyncing);
	const lastSyncAt = useOfflineStore((state) => state.lastSyncAt);
	const lastSyncError = useOfflineStore((state) => state.lastSyncError);
	const metrics = useOfflineStore((state) => state.metrics);

	const enqueue = useOfflineStore((state) => state.enqueue);
	const refreshQueue = useOfflineStore((state) => state.refreshQueue);
	const saveDraft = useOfflineStore((state) => state.saveDraft);
	const loadDraft = useOfflineStore((state) => state.loadDraft);
	const deleteDraft = useOfflineStore((state) => state.deleteDraft);
	const clearSynced = useOfflineStore((state) => state.clearSynced);

	const [isServiceSyncing, setIsServiceSyncing] = useState(false);
	const [lastDrainResult, setLastDrainResult] =
		useState<SyncBatchDrainResult | null>(null);
	const [recentConflicts, setRecentConflicts] = useState<SyncConflictEvent[]>(
		[],
	);

	const prevOnlineRef = useRef(isOnline);
	const isSyncing = isStoreSyncing || isServiceSyncing;

	// 1. Подписка на события OfflineSyncService
	useEffect(() => {
		const unsubscribe = offlineSyncService.subscribe((event) => {
			if (event.type === "conflict") {
				const conflict = event.data as SyncConflictEvent;
				setRecentConflicts((prev) => [conflict, ...prev].slice(0, 50));
				if (onConflictResolved) {
					onConflictResolved(conflict);
				}
			} else if (event.type === "complete") {
				const result = event.data as SyncBatchDrainResult;
				setLastDrainResult(result);
				if (onSyncCompleted) {
					onSyncCompleted(result);
				}
			}
		});

		return () => {
			unsubscribe();
		};
	}, [onConflictResolved, onSyncCompleted]);

	// 2. Первичное обновление и периодический опрос очереди
	const refresh = useCallback(() => {
		return refreshQueue({ organizationId });
	}, [refreshQueue, organizationId]);

	useEffect(() => {
		void refresh();
		if (autoRefreshIntervalMs > 0) {
			const timer = setInterval(() => void refresh(), autoRefreshIntervalMs);
			return () => clearInterval(timer);
		}
	}, [refresh, autoRefreshIntervalMs]);

	// 3. Выполнение синхронизации
	const syncNow = useCallback(
		async (drainOptions?: SyncBatchDrainOptions): Promise<SyncBatchDrainResult> => {
			if (!isOnline) {
				return {
					processedCount: 0,
					appliedCount: 0,
					duplicateCount: 0,
					mergedCount: 0,
					rejectedCount: 0,
					failedCount: 0,
					conflicts: [],
					errors: [],
				};
			}

			setIsServiceSyncing(true);
			try {
				const mergedOptions: SyncBatchDrainOptions = {
					batchSize,
					maxRetries,
					baseBackoffMs,
					maxBackoffMs,
					jitter,
					organizationId,
					gatewayUrl,
					headers,
					fetchImpl,
					...drainOptions,
				};

				const result = await offlineSyncService.drainOutbox(mergedOptions);
				await refresh();
				return result;
			} finally {
				setIsServiceSyncing(false);
			}
		},
		[
			isOnline,
			batchSize,
			maxRetries,
			baseBackoffMs,
			maxBackoffMs,
			jitter,
			organizationId,
			gatewayUrl,
			headers,
			fetchImpl,
			refresh,
		],
	);

	// 4. Автоматический дренаж очереди при возвращении в сеть (Reconnect)
	useEffect(() => {
		const wasOffline = !prevOnlineRef.current;
		const nowOnline = isOnline;
		prevOnlineRef.current = isOnline;

		if (wasOffline && nowOnline && autoSyncOnReconnect && pendingMutationCount > 0) {
			void syncNow();
		}
	}, [isOnline, autoSyncOnReconnect, pendingMutationCount, syncNow]);

	// 5. Удобные обертки для мутаций и черновиков
	const enqueueMutation = useCallback(
		<T = unknown>(input: EnqueueMutationInput<T>) => {
			return enqueue<T>({
				...input,
				organizationId: input.organizationId ?? organizationId,
			});
		},
		[enqueue, organizationId],
	);

	const saveOfflineDraft = useCallback(
		<T = unknown>(
			draftKey: string,
			entityType: MutationEntityType,
			entityId: string,
			data: T,
		): Promise<OfflineDraft<T>> => {
			return saveDraft<T>(
				draftKey,
				entityType,
				entityId,
				data,
				organizationId,
			);
		},
		[saveDraft, organizationId],
	);

	return {
		networkState,
		mode,
		label,
		badgeClass,
		rttMs,
		isOnline,
		isLan,
		pendingMutations,
		pendingMutationCount,
		isSyncing,
		lastSyncAt,
		lastSyncError,
		lastDrainResult,
		recentConflicts,
		metrics,
		enqueueMutation,
		saveOfflineDraft,
		loadOfflineDraft: loadDraft,
		deleteOfflineDraft: deleteDraft,
		syncNow,
		refresh,
		clearSynced,
	};
}
