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
	} catch {
		// ignore
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
	} catch {
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
	} catch {
		return false;
	}
}

export function isIdbStorageFallbackAvailable(): boolean {
	try {
		if (typeof window !== "undefined" && window.indexedDB && typeof window.indexedDB.open === "function") {
			return true;
		}
		if (
			typeof globalThis !== "undefined" &&
			(globalThis as unknown as { indexedDB?: IDBFactory }).indexedDB &&
			typeof (globalThis as unknown as { indexedDB?: IDBFactory }).indexedDB?.open === "function"
		) {
			return true;
		}
	} catch {
		// ignore
	}
	return false;
}

function getIdbFactory(): IDBFactory | null {
	try {
		if (typeof window !== "undefined" && window.indexedDB) {
			return window.indexedDB;
		}
	} catch {
		// ignore
	}
	try {
		if (typeof globalThis !== "undefined" && (globalThis as unknown as { indexedDB?: IDBFactory }).indexedDB) {
			return (globalThis as unknown as { indexedDB?: IDBFactory }).indexedDB ?? null;
		}
	} catch {
		// ignore
	}
	return null;
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
		} catch {
			storageState.idbFallbackDbPromise = null;
			resolve(null);
		}
	});

	return storageState.idbFallbackDbPromise;
}

export async function saveIdbStorageFallback(key: string, value: string): Promise<boolean> {
	try {
		const db = await openIdbFallbackDb();
		if (!db) return false;
		return await new Promise<boolean>((resolve) => {
			try {
				const tx = db.transaction(IDB_FALLBACK_STORE_NAME, "readwrite");
				const store = tx.objectStore(IDB_FALLBACK_STORE_NAME);
				const req = store.put({ key, value, updatedAt: Date.now() });
				req.onsuccess = () => resolve(true);
				req.onerror = () => resolve(false);
				tx.onabort = () => resolve(false);
			} catch {
				resolve(false);
			}
		});
	} catch {
		return false;
	}
}

export async function getIdbStorageFallback(key: string): Promise<string | null> {
	try {
		const db = await openIdbFallbackDb();
		if (!db) return null;
		return await new Promise<string | null>((resolve) => {
			try {
				const tx = db.transaction(IDB_FALLBACK_STORE_NAME, "readonly");
				const store = tx.objectStore(IDB_FALLBACK_STORE_NAME);
				const req = store.get(key);
				req.onsuccess = () => {
					const record = req.result as { key: string; value: string } | undefined;
					resolve(record ? record.value : null);
				};
				req.onerror = () => resolve(null);
				tx.onabort = () => resolve(null);
			} catch {
				resolve(null);
			}
		});
	} catch {
		return null;
	}
}

export async function removeIdbStorageFallback(key: string): Promise<boolean> {
	try {
		const db = await openIdbFallbackDb();
		if (!db) return false;
		return await new Promise<boolean>((resolve) => {
			try {
				const tx = db.transaction(IDB_FALLBACK_STORE_NAME, "readwrite");
				const store = tx.objectStore(IDB_FALLBACK_STORE_NAME);
				const req = store.delete(key);
				req.onsuccess = () => resolve(true);
				req.onerror = () => resolve(false);
				tx.onabort = () => resolve(false);
			} catch {
				resolve(false);
			}
		});
	} catch {
		return false;
	}
}

export async function hydrateLocalStorageFromIdbFallback(): Promise<number> {
	try {
		const db = await openIdbFallbackDb();
		if (!db) return 0;
		return await new Promise<number>((resolve) => {
			try {
				const tx = db.transaction(IDB_FALLBACK_STORE_NAME, "readonly");
				const store = tx.objectStore(IDB_FALLBACK_STORE_NAME);
				const req = store.getAll();
				req.onsuccess = () => {
					const records = (req.result as Array<{ key: string; value: string }>) || [];
					let count = 0;
					for (const r of records) {
						if (r && r.key) {
							if (!storageState.inMemoryStorageCache.has(r.key)) {
								storageState.inMemoryStorageCache.set(r.key, r.value);
								count++;
							}
						}
					}
					resolve(count);
				};
				req.onerror = () => resolve(0);
				tx.onabort = () => resolve(0);
			} catch {
				resolve(0);
			}
		});
	} catch {
		return 0;
	}
}

export function resetIdbFallbackConnection(): void {
	storageState.idbFallbackDbPromise = null;
}

export function getUnderlyingLocalStorage(): Storage | null {
	try {
		if (typeof window !== "undefined" && window.localStorage) {
			return window.localStorage;
		}
	} catch {
		// ignore
	}
	try {
		if (typeof globalThis !== "undefined" && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
			return (globalThis as unknown as { localStorage?: Storage }).localStorage ?? null;
		}
	} catch {
		// ignore
	}
	return null;
}

export function getUnderlyingSessionStorage(): Storage | null {
	try {
		if (typeof window !== "undefined" && window.sessionStorage) {
			return window.sessionStorage;
		}
	} catch {
		// ignore
	}
	try {
		if (typeof globalThis !== "undefined" && (globalThis as unknown as { sessionStorage?: Storage }).sessionStorage) {
			return (globalThis as unknown as { sessionStorage?: Storage }).sessionStorage ?? null;
		}
	} catch {
		// ignore
	}
	return null;
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
