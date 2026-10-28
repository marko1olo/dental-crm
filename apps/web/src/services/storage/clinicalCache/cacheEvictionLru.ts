import { logger } from "../../../utils/logger";
import { safeLocalStorageGetItem, safeLocalStorageRemoveItem } from "../../../lib/safeLocalStorage";
import type { StoragePruneReport } from "../storageTypes";
import { DEFAULT_STALE_SNAPSHOT_TTL_MS, LOCAL_STORAGE_CACHE_PREFIX } from "./types";
import { pruneIdbStores } from "./cachePruneStores";

const statutoryCatalogKeys = new Set([
	"catalog_804n:canonical",
	"catalog_icd10:canonical",
	"catalog_templates:canonical",
]);

export async function pruneStaleOfflineSnapshots(
	maxAgeMs: number = DEFAULT_STALE_SNAPSHOT_TTL_MS,
): Promise<StoragePruneReport> {
	const nowMs = Date.now();
	const idbResult = await pruneIdbStores(nowMs, maxAgeMs, statutoryCatalogKeys);
	let prunedLocalStorageCount = 0;

	if (typeof window !== "undefined" && window.localStorage) {
		try {
			const keysToRemove: string[] = [];
			for (let i = 0; i < window.localStorage.length; i++) {
				const key = window.localStorage.key(i);
				if (!key?.startsWith(LOCAL_STORAGE_CACHE_PREFIX)) continue;
				const cacheKey = key.slice(LOCAL_STORAGE_CACHE_PREFIX.length);
				if (statutoryCatalogKeys.has(cacheKey)) continue;

				const raw = safeLocalStorageGetItem(key);
				if (raw) {
					try {
						const parsed = JSON.parse(raw);
						const timestamp = parsed?.cachedAtMs || (parsed?.cachedAt ? Date.parse(parsed.cachedAt) : 0);
						if (timestamp > 0 && nowMs - timestamp > maxAgeMs) keysToRemove.push(key);
					} catch {}
				}
			}
			for (const key of keysToRemove) {
				safeLocalStorageRemoveItem(key);
				prunedLocalStorageCount++;
			}
		} catch (err) {
			logger.warn("[ClinicalCacheStorage] LocalStorage prune error:", err);
		}
	}

	const totalPrunedCount =
		idbResult.clinical + idbResult.drafts + idbResult.mutations + idbResult.schedules + prunedLocalStorageCount;

	const report: StoragePruneReport = {
		prunedAt: new Date(nowMs).toISOString(),
		ttlDays: Math.round(maxAgeMs / (24 * 60 * 60 * 1000)),
		prunedClinicalCacheCount: idbResult.clinical,
		prunedDraftsCount: idbResult.drafts,
		prunedMutationsCount: idbResult.mutations,
		prunedSchedulesCount: idbResult.schedules,
		prunedLocalStorageCount,
		totalPrunedCount,
	};

	if (totalPrunedCount > 0) {
		logger.info(`[ClinicalCacheStorage] Housekeeping pruned ${totalPrunedCount} stale offline snapshots (> ${report.ttlDays} days)`);
	}
	return report;
}

let isPruneScheduled = false;

export function scheduleStoragePruneIdle(maxAgeMs?: number): void {
	if (isPruneScheduled || typeof window === "undefined") return;
	isPruneScheduled = true;
	const runPrune = () => {
		void pruneStaleOfflineSnapshots(maxAgeMs).catch((err) => {
			logger.debug("[ClinicalCacheStorage] Idle prune warning:", err);
		});
	};

	const win = window as unknown as { requestIdleCallback?: (cb: () => void, opt: { timeout: number }) => number };
	if (typeof win.requestIdleCallback === "function") {
		win.requestIdleCallback(() => runPrune(), { timeout: 10_000 });
	} else {
		setTimeout(runPrune, 5_000);
	}
}
