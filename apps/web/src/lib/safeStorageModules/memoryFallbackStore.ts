/**
 * L1 In-Memory RAM-кэш, резервное копирование сессионных токенов в Cookie и аварийное хранилище IndexedDB Fallback.
 *
 * Обеспечивает работу приложения в приватном режиме Safari, при блокировке Web Storage
 * и при переполнении квоты LocalStorage (Zero Keystroke Loss).
 */

import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	IDB_FALLBACK_DB_NAME,
	IDB_FALLBACK_STORE_NAME,
	IDB_FALLBACK_VERSION,
	MAX_IN_MEMORY_CACHE_ITEMS,
	PATIENT_TOKEN_KEY,
	storageState,
} from "./types.js";

function logStorageFallback(scope: string, err: unknown): void {
	if (typeof console !== "undefined" && typeof console.warn === "function") {
		console.warn(`[safeStorage:${scope}]`, err);
	}
}

/**
 * Безопасное чтение cookie по имени (с защитой от SSR / запрета в приватном режиме).
 */
export function safeGetCookie(name: string): string | null {
	if (typeof document === "undefined") return null;
	try {
		const prefix = `${encodeURIComponent(name)}=`;
		const cookies = document.cookie ? document.cookie.split("; ") : [];
		for (const cookie of cookies) {
			if (cookie.startsWith(prefix)) {
				return decodeURIComponent(cookie.slice(prefix.length));
			}
		}
	} catch (err) {
		logStorageFallback("getCookie", err);
	}
	return null;
}

/**
 * Запись долговечной cookie (1 год) для гарантированного сохранения сессии на компьютере (Мандат 8e).
 * Работает и по HTTP (в локальной сети LAN по IP 192.168.x.x), и по HTTPS.
 */
export function safeSetCookie(name: string, value: string, days = 365): boolean {
	if (typeof document === "undefined") return false;
	try {
		const expires = new Date(Date.now() + days * 864e5).toUTCString();
		document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; path=/; expires=${expires}; SameSite=Lax`;
		return true;
	} catch (err) {
		logStorageFallback("setCookie", err);
		return false;
	}
}

/**
 * Удаление cookie при явном ручном логауте пользователя.
 */
export function safeDeleteCookie(name: string): boolean {
	if (typeof document === "undefined") return false;
	try {
		document.cookie = `${encodeURIComponent(name)}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
		return true;
	} catch (err) {
		logStorageFallback("deleteCookie", err);
		return false;
	}
}

function getIdbFactory(): IDBFactory | null {
	try {
		if (typeof window !== "undefined" && window.indexedDB) {
			return window.indexedDB;
		}
		if (typeof globalThis !== "undefined" && "indexedDB" in globalThis && globalThis.indexedDB) {
			return globalThis.indexedDB;
		}
	} catch (err) {
		logStorageFallback("getIdbFactory", err);
	}
	return null;
}

export function isIdbStorageFallbackAvailable(): boolean {
	const factory = getIdbFactory();
	return Boolean(factory && typeof factory.open === "function");
}

export function openIdbFallbackDb(): Promise<IDBDatabase | null> {
	if (!isIdbStorageFallbackAvailable()) return Promise.resolve(null);
	if (storageState.idbFallbackDbPromise) return storageState.idbFallbackDbPromise;

	storageState.idbFallbackDbPromise = new Promise<IDBDatabase | null>((resolve) => {
		try {
			const factory = getIdbFactory();
			if (!factory) {
				storageState.idbFallbackDbPromise = null;
				return resolve(null);
			}
			const req = factory.open(IDB_FALLBACK_DB_NAME, IDB_FALLBACK_VERSION);
			req.onupgradeneeded = () => {
				const db = req.result;
				if (!db.objectStoreNames.contains(IDB_FALLBACK_STORE_NAME)) {
					db.createObjectStore(IDB_FALLBACK_STORE_NAME, { keyPath: "key" });
				}
			};
			req.onsuccess = () => resolve(req.result);
			req.onerror = () => {
				storageState.idbFallbackDbPromise = null;
				resolve(null);
			};
			req.onblocked = () => {
				storageState.idbFallbackDbPromise = null;
				resolve(null);
			};
		} catch (err) {
			logStorageFallback("openIdb", err);
			storageState.idbFallbackDbPromise = null;
			resolve(null);
		}
	});

	return storageState.idbFallbackDbPromise;
}

async function runIdbStoreOp<T>(
	scope: string,
	mode: IDBTransactionMode,
	fallbackValue: T,
	buildRequest: (store: IDBObjectStore) => IDBRequest,
	extractResult: (result: unknown) => T,
): Promise<T> {
	try {
		const db = await openIdbFallbackDb();
		if (!db) return fallbackValue;
		return await new Promise<T>((resolve) => {
			try {
				const tx = db.transaction(IDB_FALLBACK_STORE_NAME, mode);
				const store = tx.objectStore(IDB_FALLBACK_STORE_NAME);
				const req = buildRequest(store);
				req.onsuccess = () => resolve(extractResult(req.result));
				req.onerror = () => resolve(fallbackValue);
				tx.onabort = () => resolve(fallbackValue);
			} catch (err) {
				logStorageFallback(`${scope}:tx`, err);
				resolve(fallbackValue);
			}
		});
	} catch (err) {
		logStorageFallback(scope, err);
		return fallbackValue;
	}
}

export async function saveIdbStorageFallback(key: string, value: string): Promise<boolean> {
	return runIdbStoreOp(
		"saveIdb",
		"readwrite",
		false,
		(store) => store.put({ key, value, updatedAt: Date.now() }),
		() => true,
	);
}

export async function getIdbStorageFallback(key: string): Promise<string | null> {
	return runIdbStoreOp(
		"getIdb",
		"readonly",
		null,
		(store) => store.get(key),
		(result) => {
			const record = result as { key: string; value: string } | undefined;
			return record ? record.value : null;
		},
	);
}

export async function removeIdbStorageFallback(key: string): Promise<boolean> {
	return runIdbStoreOp(
		"removeIdb",
		"readwrite",
		false,
		(store) => store.delete(key),
		() => true,
	);
}

export async function hydrateLocalStorageFromIdbFallback(): Promise<number> {
	return runIdbStoreOp(
		"hydrateIdb",
		"readonly",
		0,
		(store) => store.getAll(),
		(result) => {
			const records = (result as Array<{ key: string; value: string }>) || [];
			let count = 0;
			for (const r of records) {
				if (r && r.key && !storageState.inMemoryStorageCache.has(r.key)) {
					storageState.inMemoryStorageCache.set(r.key, r.value);
					count++;
				}
			}
			return count;
		},
	);
}

export function resetIdbFallbackConnection(): void {
	storageState.idbFallbackDbPromise = null;
}

function getSafeWebStorage(kind: "localStorage" | "sessionStorage"): Storage | null {
	try {
		if (typeof window !== "undefined" && window[kind]) {
			return window[kind];
		}
		if (typeof globalThis !== "undefined" && kind in globalThis && globalThis[kind]) {
			return globalThis[kind];
		}
	} catch (err) {
		logStorageFallback(kind, err);
	}
	return null;
}

export function getUnderlyingLocalStorage(): Storage | null {
	return getSafeWebStorage("localStorage");
}

export function getUnderlyingSessionStorage(): Storage | null {
	return getSafeWebStorage("sessionStorage");
}

export function isImmediateDiskKey(key: string): boolean {
	if (
		typeof process !== "undefined" &&
		(process.env?.NODE_ENV === "test" || Boolean(process.env?.VITEST))
	) {
		return true;
	}
	return (
		key === DENTE_STAFF_TOKEN_KEY ||
		key === DENTE_CLINIC_TOKEN_KEY ||
		key === PATIENT_TOKEN_KEY ||
		key.endsWith("_token") ||
		key.startsWith("__") ||
		key.includes("probe") ||
		key.includes("visit-draft") ||
		key.includes("diary_draft") ||
		key.includes("form043")
	);
}

export function putInMemoryStorageCache(key: string, value: string | null): void {
	if (
		storageState.inMemoryStorageCache.size >= MAX_IN_MEMORY_CACHE_ITEMS &&
		!storageState.inMemoryStorageCache.has(key)
	) {
		const iter = storageState.inMemoryStorageCache.keys();
		for (let i = 0; i < 20; i++) {
			const k = iter.next().value;
			if (!k) break;
			if (!isImmediateDiskKey(k)) {
				storageState.inMemoryStorageCache.delete(k);
			}
		}
	}
	storageState.inMemoryStorageCache.set(key, value);
}

export function putInMemorySessionStorageCache(key: string, value: string | null): void {
	if (
		storageState.inMemorySessionStorageCache.size >= MAX_IN_MEMORY_CACHE_ITEMS &&
		!storageState.inMemorySessionStorageCache.has(key)
	) {
		const iter = storageState.inMemorySessionStorageCache.keys();
		for (let i = 0; i < 20; i++) {
			const k = iter.next().value;
			if (!k) break;
			storageState.inMemorySessionStorageCache.delete(k);
		}
	}
	storageState.inMemorySessionStorageCache.set(key, value);
}

export function resetInMemoryAuthTokens(): void {
	storageState.inMemoryStaffToken = null;
	storageState.inMemoryClinicToken = null;
}
