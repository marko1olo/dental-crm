/**
 * DENTE CRM — Offline-First Zustand Store
 *
 * Централизованное реактивное управление:
 * - Состоянием сети (Облако / LAN / Офлайн)
 * - Очередью мутаций (Outbox)
 * - Черновиками медицинских форм (043/у, одонтограмма, рецепты 107-1/у, документы, чеки)
 */

import { create } from "zustand";
import {
	INITIAL_NETWORK_STATE,
	type NetworkState,
} from "../utils/networkConnectivity";
import {
	clearSyncedOfflineMutations,
	deleteOfflineDraft,
	deleteOfflineMutation,
	type EnqueueMutationInput,
	enqueueOfflineMutation,
	getOfflineQueueMetrics,
	getPendingOfflineMutations,
	loadOfflineDraft,
	type MutationEntityType,
	type OfflineDraft,
	type OfflineMutation,
	type OfflineQueueMetrics,
	saveOfflineDraft,
	updateOfflineMutationStatus,
} from "../utils/offlineMutationQueue";

export interface OfflineStore {
	networkState: NetworkState;
	setNetworkState: (
		val: NetworkState | ((prev: NetworkState) => NetworkState),
	) => void;

	pendingMutations: OfflineMutation[];
	pendingMutationCount: number;
	isSyncing: boolean;
	lastSyncAt: string | null;
	lastSyncError: string | null;
	draftsByKey: Record<string, OfflineDraft>;
	metrics: OfflineQueueMetrics;

	refreshQueue: (filter?: {
		entityType?: MutationEntityType | undefined;
		organizationId?: string | undefined;
	}) => Promise<void>;

	enqueue: <T = unknown>(
		input: EnqueueMutationInput<T>,
	) => Promise<OfflineMutation<T>>;

	syncOutbox: (
		executor?: (mutation: OfflineMutation) => Promise<boolean>,
	) => Promise<{ syncedCount: number; failedCount: number }>;

	saveDraft: <T = unknown>(
		draftKey: string,
		entityType: MutationEntityType,
		entityId: string,
		data: T,
		organizationId?: string | undefined,
	) => Promise<OfflineDraft<T>>;

	loadDraft: <T = unknown>(
		draftKey: string,
	) => Promise<OfflineDraft<T> | null>;

	deleteDraft: (draftKey: string) => Promise<void>;

	clearSynced: () => Promise<number>;
}

const initialMetrics: OfflineQueueMetrics = {
	pendingCount: 0,
	syncingCount: 0,
	failedCount: 0,
	syncedCount: 0,
	totalDrafts: 0,
};

export const useOfflineStore = create<OfflineStore>((set, get) => ({
	networkState: INITIAL_NETWORK_STATE,
	setNetworkState: (val) =>
		set((state) => ({
			networkState:
				typeof val === "function" ? val(state.networkState) : val,
		})),

	pendingMutations: [],
	pendingMutationCount: 0,
	isSyncing: false,
	lastSyncAt: null,
	lastSyncError: null,
	draftsByKey: {},
	metrics: initialMetrics,

	refreshQueue: async (filter) => {
		try {
			const pending = await getPendingOfflineMutations(filter);
			const metrics = await getOfflineQueueMetrics();
			set({
				pendingMutations: pending,
				pendingMutationCount: pending.length,
				metrics,
			});
		} catch (err) {
			// silent fallback
		}
	},

	enqueue: async <T = unknown>(input: EnqueueMutationInput<T>) => {
		const mutation = await enqueueOfflineMutation<T>(input);
		// Update store state
		set((state) => {
			const pendingMutations = [...state.pendingMutations, mutation as OfflineMutation];
			return {
				pendingMutations,
				pendingMutationCount: pendingMutations.length,
				metrics: {
					...state.metrics,
					pendingCount: state.metrics.pendingCount + 1,
				},
			};
		});
		return mutation;
	},

	syncOutbox: async (executor) => {
		const { isSyncing, networkState } = get();
		if (isSyncing || !networkState.isOnline) {
			return { syncedCount: 0, failedCount: 0 };
		}

		set({ isSyncing: true, lastSyncError: null });
		let syncedCount = 0;
		let failedCount = 0;

		try {
			const pending = await getPendingOfflineMutations();

			for (const mutation of pending) {
				try {
					await updateOfflineMutationStatus(mutation.mutationId, "syncing");

					let success = true;
					if (executor) {
						success = await executor(mutation);
					}

					if (success) {
						await updateOfflineMutationStatus(mutation.mutationId, "synced");
						syncedCount++;
					} else {
						await updateOfflineMutationStatus(
							mutation.mutationId,
							"failed",
							"Sync executor returned false",
						);
						failedCount++;
					}
				} catch (err) {
					const errorMsg =
						err instanceof Error ? err.message : "Sync failure";
					await updateOfflineMutationStatus(
						mutation.mutationId,
						"failed",
						errorMsg,
					);
					failedCount++;
				}
			}

			// Clean synced mutations
			await clearSyncedOfflineMutations();

			const remaining = await getPendingOfflineMutations();
			const metrics = await getOfflineQueueMetrics();

			set({
				pendingMutations: remaining,
				pendingMutationCount: remaining.length,
				metrics,
				lastSyncAt: new Date().toISOString(),
				isSyncing: false,
			});

			return { syncedCount, failedCount };
		} catch (err) {
			const errorMsg =
				err instanceof Error ? err.message : "General sync error";
			set({
				isSyncing: false,
				lastSyncError: errorMsg,
			});
			return { syncedCount, failedCount };
		}
	},

	saveDraft: async <T = unknown>(
		draftKey: string,
		entityType: MutationEntityType,
		entityId: string,
		data: T,
		organizationId?: string | undefined,
	) => {
		const draft = await saveOfflineDraft<T>(
			draftKey,
			entityType,
			entityId,
			data,
			organizationId,
		);
		set((state) => ({
			draftsByKey: {
				...state.draftsByKey,
				[draftKey]: draft as OfflineDraft,
			},
			metrics: {
				...state.metrics,
				totalDrafts: state.metrics.totalDrafts + 1,
			},
		}));
		return draft;
	},

	loadDraft: async <T = unknown>(draftKey: string) => {
		const draft = await loadOfflineDraft<T>(draftKey);
		if (draft) {
			set((state) => ({
				draftsByKey: {
					...state.draftsByKey,
					[draftKey]: draft as OfflineDraft,
				},
			}));
		}
		return draft;
	},

	deleteDraft: async (draftKey: string) => {
		await deleteOfflineDraft(draftKey);
		set((state) => {
			const nextDrafts = { ...state.draftsByKey };
			delete nextDrafts[draftKey];
			return {
				draftsByKey: nextDrafts,
				metrics: {
					...state.metrics,
					totalDrafts: Math.max(0, state.metrics.totalDrafts - 1),
				},
			};
		});
	},

	clearSynced: async () => {
		const count = await clearSyncedOfflineMutations();
		const remaining = await getPendingOfflineMutations();
		const metrics = await getOfflineQueueMetrics();
		set({
			pendingMutations: remaining,
			pendingMutationCount: remaining.length,
			metrics,
		});
		return count;
	},
}));
