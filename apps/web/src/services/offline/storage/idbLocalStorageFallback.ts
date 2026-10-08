import { logger } from "../../../utils/logger";
import {
	parseJsonNonBlocking,
	safeLocalStorageGetItem,
	safeLocalStorageGetJson,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
	safeLocalStorageSetJson,
} from "../../../lib/safeLocalStorage";

export {
	parseJsonNonBlocking,
	safeLocalStorageGetItem,
	safeLocalStorageGetJson,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
	safeLocalStorageSetJson,
};
import {
	LOCAL_STORAGE_CLINICAL_CACHE_PREFIX,
	LOCAL_STORAGE_DRAFTS_PREFIX,
	LOCAL_STORAGE_MUTATIONS_KEY,
} from "./constants";
import type {
	OfflineDraft,
	OfflineMutation,
	PatientClinicalCacheRecord,
} from "./types";

const CHUNK_SIZE_BYTES = 512 * 1024; // 512 KB per chunk
const CHUNK_MANIFEST_PREFIX = "__chunk_manifest__";

export function cleanupChunkedLocalStorage(key: string): void {
	if (typeof window === "undefined") return;
	try {
		const manifestRaw = safeLocalStorageGetItem(`${CHUNK_MANIFEST_PREFIX}${key}`);
		if (manifestRaw) {
			const manifest = JSON.parse(manifestRaw) as { totalChunks?: number };
			if (manifest && typeof manifest.totalChunks === "number") {
				for (let i = 0; i < manifest.totalChunks; i++) {
					safeLocalStorageRemoveItem(`${key}__chk_${i}`);
				}
			}
			safeLocalStorageRemoveItem(`${CHUNK_MANIFEST_PREFIX}${key}`);
		}
	} catch (err: unknown) {
		logger.warn(`[OfflineStorage] Failed to cleanup chunked local storage for key ${key}:`, err);
	}
}

export function saveToLocalStorageSafe(key: string, valueStr: string): boolean {
	if (typeof window === "undefined") return false;
	try {
		cleanupChunkedLocalStorage(key);

		if (valueStr.length <= CHUNK_SIZE_BYTES) {
			return safeLocalStorageSetItem(key, valueStr);
		}

		// Chunking for large payloads
		const totalChunks = Math.ceil(valueStr.length / CHUNK_SIZE_BYTES);
		const manifest = {
			totalChunks,
			totalLength: valueStr.length,
			createdAt: Date.now(),
		};

		for (let i = 0; i < totalChunks; i++) {
			const chunk = valueStr.substring(i * CHUNK_SIZE_BYTES, (i + 1) * CHUNK_SIZE_BYTES);
			safeLocalStorageSetItem(`${key}__chk_${i}`, chunk);
		}
		safeLocalStorageSetItem(`${CHUNK_MANIFEST_PREFIX}${key}`, JSON.stringify(manifest));
		safeLocalStorageRemoveItem(key);
		return true;
	} catch (err) {
		logger.warn(
			`[OfflineStorage] LocalStorage setItem failed for ${key}, relying on in-memory safety net`,
			err,
		);
		return false;
	}
}

export function getFromLocalStorageSafe(key: string): string | null {
	if (typeof window === "undefined") return null;
	try {
		const direct = safeLocalStorageGetItem(key);
		if (direct) return direct;

		const manifestRaw = safeLocalStorageGetItem(`${CHUNK_MANIFEST_PREFIX}${key}`);
		if (manifestRaw) {
			const manifest = JSON.parse(manifestRaw) as { totalChunks?: number };
			if (manifest && typeof manifest.totalChunks === "number") {
				const chunks: string[] = [];
				for (let i = 0; i < manifest.totalChunks; i++) {
					const chunk = safeLocalStorageGetItem(`${key}__chk_${i}`);
					if (chunk === null) return null;
					chunks.push(chunk);
				}
				return chunks.join("");
			}
		}
		return null;
	} catch (err) {
		logger.warn(`[OfflineStorage] LocalStorage getItem failed for ${key}`, err);
		return null;
	}
}

export function removeFromLocalStorageSafe(key: string): void {
	if (typeof window === "undefined") return;
	try {
		safeLocalStorageRemoveItem(key);
		cleanupChunkedLocalStorage(key);
	} catch (err: unknown) {
		logger.warn(`[OfflineStorage] LocalStorage removeItem failed for ${key}:`, err);
	}
}

export function getLocalStorageMutations(): OfflineMutation[] {
	const raw = getFromLocalStorageSafe(LOCAL_STORAGE_MUTATIONS_KEY);
	if (!raw) return [];
	try {
		const parsed = JSON.parse(raw);
		return Array.isArray(parsed) ? parsed : [];
	} catch (err) {
		logger.error("[OfflineStorage] Error reading localStorage mutations", err);
		return [];
	}
}

export function saveLocalStorageMutations(mutations: OfflineMutation[]): void {
	saveToLocalStorageSafe(LOCAL_STORAGE_MUTATIONS_KEY, JSON.stringify(mutations));
}

export function getLocalStorageDraft<T>(draftKey: string): OfflineDraft<T> | null {
	const raw = getFromLocalStorageSafe(`${LOCAL_STORAGE_DRAFTS_PREFIX}${draftKey}`);
	if (!raw) return null;
	try {
		const parsed = JSON.parse(raw);
		return parsed && typeof parsed === "object" ? parsed : null;
	} catch (err) {
		logger.error(`[OfflineStorage] Error reading localStorage draft ${draftKey}`, err);
		return null;
	}
}

export function saveLocalStorageDraft<T>(draft: OfflineDraft<T>): void {
	saveToLocalStorageSafe(
		`${LOCAL_STORAGE_DRAFTS_PREFIX}${draft.draftKey}`,
		JSON.stringify(draft),
	);
}

export function removeLocalStorageDraft(draftKey: string): void {
	removeFromLocalStorageSafe(`${LOCAL_STORAGE_DRAFTS_PREFIX}${draftKey}`);
}

export function saveLocalStorageClinicalCache<T>(record: PatientClinicalCacheRecord<T>): void {
	saveToLocalStorageSafe(
		`${LOCAL_STORAGE_CLINICAL_CACHE_PREFIX}${record.cacheKey}`,
		JSON.stringify(record),
	);
}

export function removeLocalStorageClinicalCache(cacheKey: string): void {
	removeFromLocalStorageSafe(`${LOCAL_STORAGE_CLINICAL_CACHE_PREFIX}${cacheKey}`);
}
