/**
 * DENTE CRM — Offline Storage Engine & Queue Auto-Sync Hub (Layer 2)
 *
 * Implements UnifiedStorageEngineContract with IndexedDB/LocalStorage fallbacks,
 * automatic storage quota eviction, and background mutation auto-syncing.
 */

import type {
	UnifiedStorageEngineContract,
	OfflineDraftRecord,
	OfflineMutationQueueRecord,
} from "@dental/shared";
import {
	saveOfflineDraft,
	loadOfflineDraft,
	deleteOfflineDraft,
	enqueueOfflineMutation,
	enqueueOfflineMutationsBatch,
	getPendingOfflineMutations,
	updateOfflineMutationStatus,
	isIndexedDbAvailable,
} from "../../services/offline";
import { logger } from "../../utils/logger";

export class WebUnifiedStorageEngine implements UnifiedStorageEngineContract {
	async saveDraft(draft: OfflineDraftRecord): Promise<boolean> {
		try {
			await saveOfflineDraft(
				draft.key,
				"DIARY_043_DRAFT",
				draft.visitId || draft.patientId || draft.key,
				{
					...(draft.visitId ? { visitId: draft.visitId } : {}),
					...(draft.patientId ? { patientId: draft.patientId } : {}),
					...(draft.doctorId ? { doctorId: draft.doctorId } : {}),
					payload: draft.payloadJson,
					version: draft.version,
					updatedAt: draft.updatedAt,
				},
			);
			return true;
		} catch (err: unknown) {
			const isQuota =
				(err as Error)?.name === "QuotaExceededError" ||
				(err as { code?: number })?.code === 22 ||
				String(err).toLowerCase().includes("quota");
			if (isQuota) {
				try {
					const { purgeSyncedDraftsAndOldCache } = await import("../../services/offline/offlineStorage.js");
					await purgeSyncedDraftsAndOldCache();
					await saveOfflineDraft(
						draft.key,
						"DIARY_043_DRAFT",
						draft.visitId || draft.patientId || draft.key,
						{
							...(draft.visitId ? { visitId: draft.visitId } : {}),
							...(draft.patientId ? { patientId: draft.patientId } : {}),
							...(draft.doctorId ? { doctorId: draft.doctorId } : {}),
							payload: draft.payloadJson,
							version: draft.version,
							updatedAt: draft.updatedAt,
						},
					);
					return true;
				} catch {
					return false;
				}
			}
			return false;
		}
	}

	async getDraft(key: string): Promise<OfflineDraftRecord | null> {
		try {
			const res = await loadOfflineDraft<{
				visitId?: string;
				patientId?: string;
				doctorId?: string;
				payload?: string;
				version?: number;
				updatedAt?: string;
			}>(key);
			if (!res) return null;
			return {
				key,
				visitId: res.data?.visitId,
				patientId: res.data?.patientId,
				doctorId: res.data?.doctorId,
				payloadJson: typeof res.data?.payload === "string" ? res.data.payload : JSON.stringify(res.data),
				updatedAt: res.data?.updatedAt || res.updatedAt || new Date().toISOString(),
				version: res.data?.version ?? 1,
			};
		} catch {
			return null;
		}
	}

	async removeDraft(key: string): Promise<boolean> {
		try {
			await deleteOfflineDraft(key);
			return true;
		} catch {
			return false;
		}
	}

	async enqueueMutation(
		mutation: Omit<OfflineMutationQueueRecord, "id" | "createdAt" | "synced" | "retryAttempts">,
	): Promise<OfflineMutationQueueRecord> {
		let res: any;
		try {
			res = await enqueueOfflineMutation({
				entityType: mutation.entityType as any,
				entityId: mutation.entityId,
				action: mutation.action,
				payload: { json: mutation.payloadJson },
				organizationId: mutation.organizationId,
			});
		} catch (err: unknown) {
			const isQuota =
				(err as Error)?.name === "QuotaExceededError" ||
				(err as { code?: number })?.code === 22 ||
				String(err).toLowerCase().includes("quota");
			if (isQuota) {
				try {
					const { purgeSyncedDraftsAndOldCache } = await import("../../services/offline/offlineStorage.js");
					await purgeSyncedDraftsAndOldCache();
					res = await enqueueOfflineMutation({
						entityType: mutation.entityType as any,
						entityId: mutation.entityId,
						action: mutation.action,
						payload: { json: mutation.payloadJson },
						organizationId: mutation.organizationId,
					});
				} catch {
					throw err;
				}
			} else {
				throw err;
			}
		}

		return {
			id: res.mutationId,
			organizationId: res.organizationId || mutation.organizationId,
			entityType: res.entityType,
			entityId: res.entityId,
			action: res.action as "create" | "update" | "delete",
			payloadJson: JSON.stringify(res.payload),
			createdAt: res.timestamp,
			synced: res.status === "synced",
			retryAttempts: res.retryCount ?? 0,
			...(res.lastError ? { lastError: res.lastError } : {}),
		};
	}

	async enqueueMutationsBatch(
		mutations: Array<Omit<OfflineMutationQueueRecord, "id" | "createdAt" | "synced" | "retryAttempts">>,
	): Promise<OfflineMutationQueueRecord[]> {
		if (!mutations || mutations.length === 0) return [];
		let resList: any[];
		try {
			resList = await enqueueOfflineMutationsBatch(
				mutations.map((m) => ({
					entityType: m.entityType as any,
					entityId: m.entityId,
					action: m.action,
					payload: { json: m.payloadJson },
					organizationId: m.organizationId,
				})),
			);
		} catch (err: unknown) {
			const isQuota =
				(err as Error)?.name === "QuotaExceededError" ||
				(err as { code?: number })?.code === 22 ||
				String(err).toLowerCase().includes("quota");
			if (isQuota) {
				try {
					const { purgeSyncedDraftsAndOldCache } = await import("../../services/offline/offlineStorage.js");
					await purgeSyncedDraftsAndOldCache();
					resList = await enqueueOfflineMutationsBatch(
						mutations.map((m) => ({
							entityType: m.entityType as any,
							entityId: m.entityId,
							action: m.action,
							payload: { json: m.payloadJson },
							organizationId: m.organizationId,
						})),
					);
				} catch {
					throw err;
				}
			} else {
				throw err;
			}
		}

		return resList.map((res, i) => ({
			id: res.mutationId,
			organizationId: res.organizationId || mutations[i]?.organizationId || "",
			entityType: res.entityType,
			entityId: res.entityId,
			action: res.action as "create" | "update" | "delete",
			payloadJson: JSON.stringify(res.payload),
			createdAt: res.timestamp,
			synced: res.status === "synced",
			retryAttempts: res.retryCount ?? 0,
			...(res.lastError ? { lastError: res.lastError } : {}),
		}));
	}

	async getPendingMutations(): Promise<OfflineMutationQueueRecord[]> {
		try {
			const pending = await getPendingOfflineMutations();
			return pending.map((m) => ({
				id: m.mutationId,
				organizationId: m.organizationId || "",
				entityType: m.entityType,
				entityId: m.entityId,
				action: m.action as "create" | "update" | "delete",
				payloadJson: JSON.stringify(m.payload),
				createdAt: m.timestamp,
				synced: m.status === "synced",
				retryAttempts: m.retryCount ?? 0,
				...(m.lastError ? { lastError: m.lastError } : {}),
			}));
		} catch {
			return [];
		}
	}

	async markMutationSynced(mutationId: string): Promise<boolean> {
		try {
			await updateOfflineMutationStatus(mutationId, "synced");
			return true;
		} catch {
			return false;
		}
	}

	async getStorageStatus(): Promise<{
		engine: "indexeddb" | "sqlite" | "localstorage";
		isAvailable: boolean;
		pendingCount: number;
		quotaBytes?: number;
		usageBytes?: number;
		percentUsed?: number;
		freeFormatted?: string;
		isQuotaWarning?: boolean;
	}> {
		const isIdb = isIndexedDbAvailable();
		const pending = await this.getPendingMutations();
		let quotaBytes: number | undefined;
		let usageBytes: number | undefined;
		let percentUsed: number | undefined;
		let freeFormatted: string | undefined;
		let isQuotaWarning: boolean | undefined;

		try {
			const { getStorageEstimate } = await import("../../services/offline/offlineStorage.js");
			const est = await getStorageEstimate();
			quotaBytes = est.quotaBytes;
			usageBytes = est.usageBytes;
			percentUsed = est.percentUsed;
			freeFormatted = est.freeFormatted;
			isQuotaWarning = est.isWarning;
		} catch (err: unknown) {
			logger.warn("[OmniPlatformAdapter] Failed to get storage estimate", err);
		}

		return {
			engine: isIdb ? "indexeddb" : "localstorage",
			isAvailable: true,
			pendingCount: pending.length,
			...(quotaBytes !== undefined ? { quotaBytes } : {}),
			...(usageBytes !== undefined ? { usageBytes } : {}),
			...(percentUsed !== undefined ? { percentUsed } : {}),
			...(freeFormatted ? { freeFormatted } : {}),
			...(isQuotaWarning !== undefined ? { isQuotaWarning } : {}),
		};
	}

	async syncPendingMutations() {
		const { offlineSyncService } = await import("../../services/offline/offlineSyncService.js");
		return offlineSyncService.drainOutbox();
	}
}

export const unifiedStorageInstance = new WebUnifiedStorageEngine();

/**
 * Triggers an immediate drain of pending offline mutations across all platforms.
 */
export async function syncOfflineMutations() {
	return unifiedStorageInstance.syncPendingMutations();
}

/**
 * Starts automatic offline mutation queue auto-sync on network reconnection (PWA & Web Browser).
 * Drains pending offline drafts and mutations when transitioning to online or LAN mode.
 */
export function startOfflineQueueAutoSync(intervalMs = 30_000): () => void {
	if (typeof window === "undefined") return () => {};

	let timer: ReturnType<typeof setInterval> | null = null;

	const attemptSync = async () => {
		try {
			const { determineNetworkConnectivity } = await import("../../utils/networkConnectivity.js");
			const net = await determineNetworkConnectivity();
			if (net.isOnline || net.isLan) {
				const { offlineSyncService } = await import("../../services/offline/offlineSyncService.js");
				if (!offlineSyncService.isDrainActive()) {
					await offlineSyncService.drainOutbox();
				}
			}
		} catch {
			// Silent suppression during background sync attempts
		}
	};

	const handleOnline = () => {
		void attemptSync();
	};

	const handleVisibilityChange = () => {
		if (typeof document !== "undefined" && document.visibilityState === "visible") {
			void attemptSync();
		}
	};

	window.addEventListener("online", handleOnline);
	if (typeof document !== "undefined") {
		document.addEventListener("visibilitychange", handleVisibilityChange);
	}

	// Immediate initial drain attempt on startup
	void attemptSync();

	if (intervalMs > 0) {
		timer = setInterval(() => {
			if (typeof document !== "undefined" && document.hidden) return;
			void attemptSync();
		}, intervalMs);
	}

	return () => {
		window.removeEventListener("online", handleOnline);
		if (typeof document !== "undefined") {
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		}
		if (timer) clearInterval(timer);
	};
}
