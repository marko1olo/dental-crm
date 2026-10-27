/**
 * offlineQueueProcessor.ts — Процессор фоновой синхронизации записей очереди
 */

import type { PendingTranscriptionRecord, VoiceOfflineQueueOptions, OfflineTranscriptionStatus } from "./types";
import { formatRestoredDictationsBadge } from "./badgeFormatter";
import { executeDefaultSyncHandler } from "./offlineQueueNetworkSync";
import type { StorageDriver } from "./storageDriverInterface";

export async function processPendingQueue(
	storage: StorageDriver,
	options: VoiceOfflineQueueOptions,
	updateStatus: (id: string, status: OfflineTranscriptionStatus, extra?: { retryCount?: number; lastError?: string | null }) => Promise<void>,
): Promise<PendingTranscriptionRecord[]> {
	const all = await storage.getAll();
	const maxRetries = options.maxRetries ?? 5;
	const pendingList = all.filter((r) => (r.status === "pending" || r.status === "failed") && r.retryCount < maxRetries);
	if (pendingList.length === 0) return [];

	const syncedRecords: PendingTranscriptionRecord[] = [];
	const total = pendingList.length;

	for (let i = 0; i < pendingList.length; i++) {
		const record = pendingList[i];
		if (!record) continue;

		options.onSyncProgress?.(i + 1, total, record);
		await updateStatus(record.id, "syncing");

		try {
			const syncResult = options.syncHandler
				? await options.syncHandler(record)
				: await executeDefaultSyncHandler(record, options.syncEndpoint ?? "/api/speech/transcribe-chunk");

			if (syncResult.success) {
				const syncedRec: PendingTranscriptionRecord = {
					...record,
					status: "synced",
					syncedAt: Date.now(),
					lastError: null,
					rawText: syncResult.text || record.rawText,
				};
				await storage.put(syncedRec);
				syncedRecords.push(syncedRec);
			} else {
				const nextRetry = record.retryCount + 1;
				const nextStatus: OfflineTranscriptionStatus = nextRetry >= maxRetries ? "failed" : "pending";
				const errorMsg = syncResult.error || "Неизвестная ошибка синхронизации";
				await updateStatus(record.id, nextStatus, { retryCount: nextRetry, lastError: errorMsg });
				options.onSyncError?.(record, errorMsg);
			}
		} catch (err) {
			const errorObj = err instanceof Error ? err : new Error(String(err));
			const nextRetry = record.retryCount + 1;
			const nextStatus: OfflineTranscriptionStatus = nextRetry >= maxRetries ? "failed" : "pending";
			await updateStatus(record.id, nextStatus, { retryCount: nextRetry, lastError: errorObj.message });
			options.onSyncError?.(record, errorObj);
		}
	}

	if (syncedRecords.length > 0) {
		const badgeMsg = formatRestoredDictationsBadge(syncedRecords.length);
		options.onSyncSuccess?.(syncedRecords.length, syncedRecords);
		options.onBadgeMessage?.(badgeMsg);
	}

	const allRemaining = await storage.getAll();
	options.onQueueChange?.(allRemaining);
	return syncedRecords;
}
