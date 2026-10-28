import { logger } from "../../../utils/logger";
import { clearSyncedOfflineMutations, getPendingOfflineMutations } from "./syncStorageBridge";
import { getOrCreateClientId } from "./syncMetricsTracker";
import { processBatchWithRetry } from "./syncBatchProcessor";
import { flushOfflinePatientBookings } from "../../../pwa/patientOfflineStorage";
import type { SyncBatchDrainOptions, SyncBatchDrainResult } from "../types";

export async function executeDrainOutbox(
	options: SyncBatchDrainOptions,
	emit: (type: "progress" | "complete" | "conflict" | "error" | "slow_drain", data: unknown) => void,
): Promise<SyncBatchDrainResult> {
	const {
		batchSize = 25, maxRetries = 3, baseBackoffMs = 400, maxBackoffMs = 8000,
		jitter = true, organizationId, gatewayUrl = "/api/sync/gateway", headers = {},
		fetchImpl = typeof fetch !== "undefined" ? fetch : undefined,
	} = options;

	const totalResult: SyncBatchDrainResult = {
		processedCount: 0, appliedCount: 0, duplicateCount: 0, mergedCount: 0,
		rejectedCount: 0, failedCount: 0, conflicts: [], errors: [],
	};

	const pending = await getPendingOfflineMutations({ organizationId });
	if (pending.length === 0) return totalResult;

	const clientId = getOrCreateClientId();

	for (let i = 0; i < pending.length; i += batchSize) {
		const batch = pending.slice(i, i + batchSize);
		const batchResult = await processBatchWithRetry({
			batch, clientId, gatewayUrl, headers, maxRetries, baseBackoffMs, maxBackoffMs, jitter, fetchImpl, emit,
		});

		totalResult.processedCount += batchResult.processedCount;
		totalResult.appliedCount += batchResult.appliedCount;
		totalResult.duplicateCount += batchResult.duplicateCount;
		totalResult.mergedCount += batchResult.mergedCount;
		totalResult.rejectedCount += batchResult.rejectedCount;
		totalResult.failedCount += batchResult.failedCount;
		totalResult.conflicts.push(...batchResult.conflicts);
		totalResult.errors.push(...batchResult.errors);
		if (batchResult.serverTime) totalResult.serverTime = batchResult.serverTime;

		emit("progress", { processed: totalResult.processedCount, total: pending.length, batchResult });
	}

	await clearSyncedOfflineMutations();
	try { await flushOfflinePatientBookings(); } catch (err) { logger.warn("[OfflineSyncService] Flush PWA err:", err); }

	emit("complete", totalResult);
	return totalResult;
}
