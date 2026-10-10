/**
 * Движок контроля квоты (QuotaExceededError), вытеснения временных ключей (LRU/TTL eviction)
 * и отложенного пакетного сброса очередей записи на диск (Anti-HDD Thrashing).
 */

import {
	getUnderlyingLocalStorage,
	getUnderlyingSessionStorage,
	resetIdbFallbackConnection,
	resetInMemoryAuthTokens,
	saveIdbStorageFallback,
} from "./memoryFallbackStore.js";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	storageState,
} from "./types.js";

export function isQuotaExceededError(err: unknown): boolean {
	if (!err || typeof err !== "object") return false;
	const e = err as { name?: string; code?: number; message?: string };
	return Boolean(
		e.name === "QuotaExceededError" ||
		e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
		e.code === 22 ||
		e.code === 1014 ||
		(typeof e.message === "string" && e.message.toLowerCase().includes("quota"))
	);
}

/**
 * Автономная очистка временных / кэшированных ключей LocalStorage
 * для освобождения места под критические данные (токены, черновики визитов 043/у)
 */
export function evictDisposableLocalStorageKeys(): number {
	const storage = getUnderlyingLocalStorage();
	if (!storage) return 0;
	let evictedCount = 0;
	try {
		const keysToEvict: string[] = [];
		for (let i = 0; i < storage.length; i++) {
			const key = storage.key(i);
			if (!key) continue;
			// Очистка кэша сущностей и старых снимков, не являющихся критическими токенами или черновиками
			if (
				key.startsWith("dente_cached_entity_v1:") ||
				key.startsWith("dente_clinical_cache_v1:") ||
				key.startsWith("__chunk_manifest__") ||
				key.includes("__chk_") ||
				key.includes("probe_") ||
				key.startsWith("__probe")
			) {
				keysToEvict.push(key);
			}
		}

		for (const k of keysToEvict) {
			try {
				storage.removeItem(k);
				storageState.inMemoryStorageCache.delete(k);
				evictedCount++;
			} catch {
				// ignore
			}
		}

		// Если всё ещё нужно место, освобождаем тяжелый слепок Vault
		// (метаданные и снапшоты гарантированно дублируются в IndexedDB)
		if (storage.getItem("dente_vault_snapshots_v1")) {
			try {
				storage.removeItem("dente_vault_snapshots_v1");
				storageState.inMemoryStorageCache.delete("dente_vault_snapshots_v1");
				evictedCount++;
			} catch {
				// ignore
			}
		}
	} catch {
		// ignore
	}
	return evictedCount;
}

/**
 * Принудительно сбрасывает все накопленные в очереди записи sessionStorage на диск.
 */
export function flushPendingSessionStorageWrites(): void {
	if (storageState.sessionDiskFlushTimer !== null) {
		clearTimeout(storageState.sessionDiskFlushTimer);
		storageState.sessionDiskFlushTimer = null;
	}
	const storage = getUnderlyingSessionStorage();
	if (!storage || storageState.pendingSessionDiskWrites.size === 0 || storageState.isFlushingSessionDisk) {
		return;
	}
	storageState.isFlushingSessionDisk = true;
	try {
		for (const [key, value] of storageState.pendingSessionDiskWrites.entries()) {
			try {
				storage.setItem(key, value);
			} catch {
				// Защита от QuotaExceededError или запрета хранения в Safari Private
			}
		}
		storageState.pendingSessionDiskWrites.clear();
	} finally {
		storageState.isFlushingSessionDisk = false;
	}
}

/**
 * Принудительно сбрасывает все накопленные в очереди записи на диск с защитой от QuotaExceededError.
 */
export function flushPendingStorageWrites(): void {
	if (storageState.diskFlushTimer !== null) {
		clearTimeout(storageState.diskFlushTimer);
		storageState.diskFlushTimer = null;
	}
	flushPendingSessionStorageWrites();
	const storage = getUnderlyingLocalStorage();
	if (!storage || storageState.pendingDiskWrites.size === 0 || storageState.isFlushingDisk) {
		return;
	}
	storageState.isFlushingDisk = true;
	try {
		let hasEvicted = false;
		for (const [key, value] of Array.from(storageState.pendingDiskWrites.entries())) {
			try {
				storage.setItem(key, value);
				storageState.pendingDiskWrites.delete(key);
			} catch (err) {
				if (isQuotaExceededError(err) && !hasEvicted) {
					hasEvicted = true;
					evictDisposableLocalStorageKeys();
					try {
						storage.setItem(key, value);
						storageState.pendingDiskWrites.delete(key);
						continue;
					} catch {
						// Item too large even after eviction
					}
				}
				// LocalStorage переполнен: спасаем в IndexedDB fallback, чтобы гарантировать Zero Keystroke Loss
				void saveIdbStorageFallback(key, value);
				storageState.pendingDiskWrites.delete(key);
			}
		}
		storageState.pendingDiskWrites.clear();
	} finally {
		storageState.isFlushingDisk = false;
	}
}

/**
 * Очищает внутренний in-memory кэш (для тестов или сброса сессий).
 */
export function clearInMemoryStorageCache(): void {
	storageState.inMemoryStorageCache.clear();
	storageState.pendingDiskWrites.clear();
	storageState.inMemorySessionStorageCache.clear();
	storageState.pendingSessionDiskWrites.clear();
	if (storageState.diskFlushTimer !== null) {
		clearTimeout(storageState.diskFlushTimer);
		storageState.diskFlushTimer = null;
	}
	if (storageState.sessionDiskFlushTimer !== null) {
		clearTimeout(storageState.sessionDiskFlushTimer);
		storageState.sessionDiskFlushTimer = null;
	}
	resetInMemoryAuthTokens();
	resetIdbFallbackConnection();
}

export function ensureTokenStorageListener(): void {
	if (storageState.tokenStorageListenerAttached || typeof window === "undefined" || !window.addEventListener) return;
	storageState.tokenStorageListenerAttached = true;
	window.addEventListener("storage", (e: StorageEvent) => {
		if (e.key === DENTE_STAFF_TOKEN_KEY) {
			storageState.inMemoryStaffToken = e.newValue?.trim() || "";
		} else if (e.key === DENTE_CLINIC_TOKEN_KEY) {
			storageState.inMemoryClinicToken = e.newValue?.trim() || "";
		} else if (e.key === null) {
			storageState.inMemoryStaffToken = "";
			storageState.inMemoryClinicToken = "";
			storageState.inMemoryStorageCache.clear();
			storageState.pendingDiskWrites.clear();
		} else {
			storageState.inMemoryStorageCache.set(e.key, e.newValue);
			storageState.pendingDiskWrites.delete(e.key);
		}
	});

	// Гарантия сохранности данных при закрытии вкладки, смене вкладки и звонках телефонии (Мандат 8e)
	window.addEventListener("beforeunload", () => {
		flushPendingStorageWrites();
	});
	window.addEventListener("pagehide", () => {
		flushPendingStorageWrites();
	});
	if (typeof document !== "undefined" && document.addEventListener) {
		document.addEventListener("visibilitychange", () => {
			if (document.visibilityState === "hidden") {
				flushPendingStorageWrites();
			}
		});
	}
	window.addEventListener("dente-telephony-incoming-call", () => {
		flushPendingStorageWrites();
	});
}
