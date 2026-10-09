/**
 * persistentStorage.ts — Layer 2: Долговременное сохранение справочников (IndexedDB + localStorage fallback).
 *
 * Обеспечивает мгновенный доступ (0 мс seek time) к нормативным справочникам при старте клиники
 * даже на слабых машинах с медленным HDD 5400 RPM без блокировки основного потока.
 */

import type { CachedApiResponse } from "./types";
import { normalizeApiUrl } from "./cacheKeyAndTiming";
import {
	parseJsonNonBlocking,
	safeLocalStorageGetItem,
	safeLocalStorageRemoveItem,
	safeLocalStorageSetItem,
} from "../safeLocalStorage";

export const CATALOG_DB_NAME = "dente-catalog-persistent-cache-v1";
export const CATALOG_DB_VERSION = 1;
export const CATALOG_STORE_NAME = "catalogs";
export const LOCAL_STORAGE_CATALOG_PREFIX = "dente:catalog-cache:";

let catalogDbPromise: Promise<IDBDatabase | null> | null = null;

export function openCatalogDb(): Promise<IDBDatabase | null> {
	if (typeof window === "undefined" || !("indexedDB" in window)) {
		return Promise.resolve(null);
	}
	if (catalogDbPromise) return catalogDbPromise;

	catalogDbPromise = new Promise((resolve) => {
		try {
			const request = window.indexedDB.open(CATALOG_DB_NAME, CATALOG_DB_VERSION);
			request.onupgradeneeded = () => {
				const db = request.result;
				if (!db.objectStoreNames.contains(CATALOG_STORE_NAME)) {
					db.createObjectStore(CATALOG_STORE_NAME, { keyPath: "url" });
				}
			};
			request.onsuccess = () => {
				const db = request.result;
				db.onversionchange = () => {
					catalogDbPromise = null;
					db.close();
				};
				db.onclose = () => {
					catalogDbPromise = null;
				};
				resolve(db);
			};
			request.onerror = () => {
				catalogDbPromise = null;
				resolve(null);
			};
		} catch {
			catalogDbPromise = null;
			resolve(null);
		}
	});

	return catalogDbPromise;
}

// Low-Spec 5400 RPM HDD Batch Write Buffer for Persistent Catalogs
const pendingCatalogBatch = new Map<string, CachedApiResponse<unknown>>();
let catalogBatchFlushTimer: ReturnType<typeof setTimeout> | null = null;
let isFlushingCatalogBatch = false;

export async function flushPendingCatalogWrites(): Promise<void> {
	if (catalogBatchFlushTimer) {
		clearTimeout(catalogBatchFlushTimer);
		catalogBatchFlushTimer = null;
	}
	if (isFlushingCatalogBatch || pendingCatalogBatch.size === 0) return;
	isFlushingCatalogBatch = true;

	const snapshot = new Map(pendingCatalogBatch);
	pendingCatalogBatch.clear();

	const db = await openCatalogDb();
	if (db) {
		try {
			await new Promise<void>((resolve, reject) => {
				const tx = db.transaction(CATALOG_STORE_NAME, "readwrite");
				const store = tx.objectStore(CATALOG_STORE_NAME);
				for (const [key, entry] of snapshot.entries()) {
					store.put({
						url: key,
						data: entry.data,
						status: entry.status,
						statusText: entry.statusText,
						headers: entry.headers,
						timestamp: entry.timestamp,
						ttlMs: entry.ttlMs,
					});
				}
				tx.oncomplete = () => resolve();
				tx.onerror = () => reject(tx.error);
				tx.onabort = () => reject(tx.error ?? new Error("Catalog transaction aborted"));
			});
			isFlushingCatalogBatch = false;
			return;
		} catch {
			// fallback to localStorage
		}
	}

	// Fallback to localStorage
	for (const [key, entry] of snapshot.entries()) {
		try {
			const serialized = JSON.stringify(entry);
			if (serialized.length < 80 * 1024) {
				safeLocalStorageSetItem(LOCAL_STORAGE_CATALOG_PREFIX + key, serialized);
			}
		} catch {
			// ignore
		}
	}
	isFlushingCatalogBatch = false;
}

export async function saveCatalogToPersistentStorage<T>(
	url: string,
	entry: CachedApiResponse<T>,
): Promise<void> {
	const key = normalizeApiUrl(url);
	pendingCatalogBatch.set(key, entry as CachedApiResponse<unknown>);

	if (!catalogBatchFlushTimer) {
		if (typeof window !== "undefined" && "requestIdleCallback" in window) {
			window.requestIdleCallback(() => void flushPendingCatalogWrites(), { timeout: 100 });
		} else {
			catalogBatchFlushTimer = setTimeout(() => void flushPendingCatalogWrites(), 60);
		}
	}
}

export async function readCatalogFromPersistentStorage<T = unknown>(
	url: string,
): Promise<CachedApiResponse<T> | null> {
	const key = normalizeApiUrl(url);

	// 0. Check pending in-memory batch write buffer first (0 ms, zero disk I/O)
	const pending = pendingCatalogBatch.get(key) as CachedApiResponse<T> | undefined;
	if (pending) {
		if (pending.ttlMs === null || Date.now() <= pending.timestamp + pending.ttlMs) {
			return pending;
		}
	}

	// 1. Проверяем IndexedDB
	const db = await openCatalogDb();
	if (db) {
		try {
			const record = await new Promise<CachedApiResponse<T> | null>((resolve) => {
				const tx = db.transaction(CATALOG_STORE_NAME, "readonly");
				const store = tx.objectStore(CATALOG_STORE_NAME);
				const req = store.get(key);
				req.onsuccess = () => {
					const res = req.result;
					if (!res) {
						resolve(null);
						return;
					}
					// Проверка срока жизни (TTL)
					if (res.ttlMs !== null && Date.now() > res.timestamp + res.ttlMs) {
						void deleteCatalogFromPersistentStorage(key);
						resolve(null);
						return;
					}
					resolve(res as CachedApiResponse<T>);
				};
				req.onerror = () => resolve(null);
			});
			if (record) return record;
		} catch {
			// fallback к localStorage
		}
	}

	// 2. Fallback в localStorage
	try {
		const raw = safeLocalStorageGetItem(LOCAL_STORAGE_CATALOG_PREFIX + key);
		if (raw) {
			const parsed = (await parseJsonNonBlocking<CachedApiResponse<T>>(raw)) as CachedApiResponse<T>;
			if (parsed && (parsed.ttlMs === null || Date.now() <= parsed.timestamp + parsed.ttlMs)) {
				return parsed;
			}
			safeLocalStorageRemoveItem(LOCAL_STORAGE_CATALOG_PREFIX + key);
		}
	} catch {
		// ignore
	}

	// 3. Fallback к clinicalCacheStorage (catalog_804n, catalog_icd10, catalog_templates)
	try {
		if (key === "/api/clinical/804n" || key === "/api/clinical/nomenclature") {
			const { getCachedStatutoryCatalog } = await import("../../services/storage/clinicalCacheStorage");
			const idbData = await getCachedStatutoryCatalog<T>("catalog_804n");
			if (idbData && Array.isArray(idbData) && idbData.length > 0) {
				const entry: CachedApiResponse<T> = {
					data: idbData,
					status: 200,
					statusText: "OK",
					headers: { "content-type": "application/json; charset=utf-8" },
					url: key,
					timestamp: Date.now(),
					ttlMs: 24 * 60 * 60 * 1000,
				};
				void saveCatalogToPersistentStorage(key, entry);
				return entry;
			}
		} else if (key === "/api/clinical/icd10" || key === "/api/icd10") {
			const { getCachedStatutoryCatalog } = await import("../../services/storage/clinicalCacheStorage");
			const idbData = await getCachedStatutoryCatalog<T>("catalog_icd10");
			if (idbData && Array.isArray(idbData) && idbData.length > 0) {
				const entry: CachedApiResponse<T> = {
					data: idbData,
					status: 200,
					statusText: "OK",
					headers: { "content-type": "application/json; charset=utf-8" },
					url: key,
					timestamp: Date.now(),
					ttlMs: 24 * 60 * 60 * 1000,
				};
				void saveCatalogToPersistentStorage(key, entry);
				return entry;
			}
		} else if (key === "/api/emr/templates" || key === "/api/templates") {
			const { getCachedStatutoryCatalog } = await import("../../services/storage/clinicalCacheStorage");
			const idbData = await getCachedStatutoryCatalog<T>("catalog_templates");
			if (idbData && Array.isArray(idbData) && idbData.length > 0) {
				const entry: CachedApiResponse<T> = {
					data: idbData,
					status: 200,
					statusText: "OK",
					headers: { "content-type": "application/json; charset=utf-8" },
					url: key,
					timestamp: Date.now(),
					ttlMs: 24 * 60 * 60 * 1000,
				};
				void saveCatalogToPersistentStorage(key, entry);
				return entry;
			}
		}
	} catch {
		// ignore
	}

	return null;
}

export async function deleteCatalogFromPersistentStorage(
	patternOrUrl?: string | RegExp,
): Promise<void> {
	// Clear from in-memory batch write buffer
	if (!patternOrUrl) {
		pendingCatalogBatch.clear();
	} else if (typeof patternOrUrl === "string") {
		for (const key of pendingCatalogBatch.keys()) {
			if (key === patternOrUrl || key.includes(patternOrUrl)) {
				pendingCatalogBatch.delete(key);
			}
		}
	} else {
		for (const key of pendingCatalogBatch.keys()) {
			if (patternOrUrl.test(key)) {
				pendingCatalogBatch.delete(key);
			}
		}
	}

	// IndexedDB
	const db = await openCatalogDb();
	if (db) {
		try {
			await new Promise<void>((resolve) => {
				const tx = db.transaction(CATALOG_STORE_NAME, "readwrite");
				const store = tx.objectStore(CATALOG_STORE_NAME);
				if (!patternOrUrl) {
					const req = store.clear();
					req.onsuccess = () => resolve();
					req.onerror = () => resolve();
					return;
				}
				const req = store.openCursor();
				req.onsuccess = () => {
					const cursor = req.result;
					if (cursor) {
						const key = String(cursor.key);
						let shouldDelete = false;
						if (typeof patternOrUrl === "string") {
							shouldDelete = key === patternOrUrl || key.includes(patternOrUrl);
						} else {
							shouldDelete = patternOrUrl.test(key);
						}
						if (shouldDelete) {
							cursor.delete();
						}
						cursor.continue();
					} else {
						resolve();
					}
				};
				req.onerror = () => resolve();
			});
		} catch {
			// ignore
		}
	}

	// localStorage fallback
	if (typeof window !== "undefined" && window.localStorage) {
		try {
			if (!patternOrUrl) {
				for (let i = window.localStorage.length - 1; i >= 0; i--) {
					const k = window.localStorage.key(i);
					if (k && k.startsWith(LOCAL_STORAGE_CATALOG_PREFIX)) {
						safeLocalStorageRemoveItem(k);
					}
				}
			} else {
				for (let i = window.localStorage.length - 1; i >= 0; i--) {
					const k = window.localStorage.key(i);
					if (k && k.startsWith(LOCAL_STORAGE_CATALOG_PREFIX)) {
						const subKey = k.slice(LOCAL_STORAGE_CATALOG_PREFIX.length);
						const matches =
							typeof patternOrUrl === "string"
								? subKey === patternOrUrl || subKey.includes(patternOrUrl)
								: patternOrUrl.test(subKey);
						if (matches) {
							safeLocalStorageRemoveItem(k);
						}
					}
				}
			}
		} catch {
			// ignore
		}
	}
}
