import { logger } from "../../../utils/logger";
import { formatBytesHuman, isIndexedDbAvailable, type StorageEstimateInfo } from "../../offline/offlineStorage";

export async function requestPersistentStorage(): Promise<boolean> {
	if (typeof navigator !== "undefined" && navigator.storage && typeof navigator.storage.persist === "function") {
		try {
			const isPersisted = await navigator.storage.persist();
			logger.info(`[Storage] Persistent storage granted: ${isPersisted}`);
			return isPersisted;
		} catch (err) {
			logger.warn("[Storage] Failed to request persistent storage", err);
			return false;
		}
	}
	return false;
}

export async function getStorageEstimate(): Promise<StorageEstimateInfo> {
	let usageBytes = 0;
	let quotaBytes = 0;
	let isPersistent = false;
	const indexedDbAvailable = isIndexedDbAvailable();

	if (typeof navigator !== "undefined" && navigator.storage && typeof navigator.storage.estimate === "function") {
		try {
			const estimate = await navigator.storage.estimate();
			usageBytes = estimate.usage || 0;
			quotaBytes = estimate.quota || 0;
		} catch (err: unknown) {
			logger.warn("[ClinicalCacheStorage] Failed to estimate storage quota", err);
		}

		if (typeof navigator.storage.persisted === "function") {
			try {
				isPersistent = await navigator.storage.persisted();
			} catch (err: unknown) {
				logger.warn("[ClinicalCacheStorage] Failed to check storage persistence", err);
			}
		}
	}

	const percentUsed = quotaBytes > 0 ? Math.round((usageBytes / quotaBytes) * 100) : 0;
	const freeBytes = Math.max(0, quotaBytes - usageBytes);

	return {
		usageBytes,
		quotaBytes,
		percentUsed,
		freeBytes,
		freeFormatted: formatBytesHuman(freeBytes),
		usageFormatted: formatBytesHuman(usageBytes),
		isWarning: percentUsed >= 85,
		isPersistent,
		indexedDbAvailable,
	};
}
