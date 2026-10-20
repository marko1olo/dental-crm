/**
 * DENTE CRM — Clinical IndexedDB L2 Low-Level Database Adapter
 *
 * Conforms to Mandate 8b (< 500 lines limit).
 */

import { logger } from "../../utils/logger";
import {
	L2_DB_NAME,
	L2_DB_VERSION,
	L2_STORE_MUTATIONS,
	L2_STORE_PATIENTS,
	L2_STORE_SCHEDULE,
	type L2OfflineMutation,
	type PatientSnapshot,
	type ScheduleCacheEntry,
} from "./clinicalIndexedDbL2Types";

let cachedDbInstance: IDBDatabase | null = null;
let dbOpenPromise: Promise<IDBDatabase | null> | null = null;

function getIndexedDbFactory(): IDBFactory | null {
	if (typeof window !== "undefined" && window.indexedDB) {
		return window.indexedDB;
	}
	if (typeof globalThis !== "undefined" && globalThis.indexedDB) {
		return globalThis.indexedDB;
	}
	return null;
}

export async function openClinicalL2Db(): Promise<IDBDatabase | null> {
	if (cachedDbInstance) return cachedDbInstance;
	if (dbOpenPromise) return dbOpenPromise;

	const idb = getIndexedDbFactory();
	if (!idb) {
		return null;
	}

	dbOpenPromise = new Promise<IDBDatabase | null>((resolve) => {
		try {
			const request = idb.open(L2_DB_NAME, L2_DB_VERSION);

			request.onupgradeneeded = (event) => {
				const db = request.result;
				logger.info(
					`[L2Storage] Upgrading IndexedDB ${L2_DB_NAME} to v${L2_DB_VERSION}`,
				);

				if (!db.objectStoreNames.contains(L2_STORE_MUTATIONS)) {
					const mStore = db.createObjectStore(L2_STORE_MUTATIONS, {
						keyPath: "mutationId",
					});
					mStore.createIndex("status", "status", { unique: false });
					mStore.createIndex("createdAtMs", "createdAtMs", { unique: false });
					mStore.createIndex("entityType", "entityType", { unique: false });
					mStore.createIndex("organizationId", "organizationId", { unique: false });
				}

				if (!db.objectStoreNames.contains(L2_STORE_PATIENTS)) {
					const pStore = db.createObjectStore(L2_STORE_PATIENTS, {
						keyPath: "patientId",
					});
					pStore.createIndex("updatedAtMs", "updatedAtMs", { unique: false });
					pStore.createIndex("organizationId", "organizationId", { unique: false });
				}

				if (!db.objectStoreNames.contains(L2_STORE_SCHEDULE)) {
					const sStore = db.createObjectStore(L2_STORE_SCHEDULE, {
						keyPath: "scheduleKey",
					});
					sStore.createIndex("date", "date", { unique: false });
					sStore.createIndex("updatedAtMs", "updatedAtMs", { unique: false });
					sStore.createIndex("organizationId", "organizationId", { unique: false });
				}
			};

			request.onsuccess = () => {
				cachedDbInstance = request.result;
				cachedDbInstance.onclose = () => {
					cachedDbInstance = null;
					dbOpenPromise = null;
				};
				cachedDbInstance.onversionchange = () => {
					cachedDbInstance?.close();
					cachedDbInstance = null;
					dbOpenPromise = null;
				};
				resolve(cachedDbInstance);
			};

			request.onerror = (err) => {
				logger.warn("[L2Storage] Failed to open IndexedDB", err);
				resolve(null);
			};

			request.onblocked = () => {
				logger.warn("[L2Storage] IndexedDB open blocked by another tab");
			};
		} catch (err) {
			logger.warn("[L2Storage] Exception while opening IndexedDB", err);
			resolve(null);
		}
	});

	return dbOpenPromise;
}

export async function idbPutRecord<T>(
	storeName: string,
	record: T,
): Promise<void> {
	const db = await openClinicalL2Db();
	if (!db || !db.objectStoreNames.contains(storeName)) return;

	await new Promise<void>((resolve, reject) => {
		try {
			const tx = db.transaction(storeName, "readwrite");
			const store = tx.objectStore(storeName);
			const req = store.put(record);
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		} catch (err) {
			reject(err);
		}
	});
}

export async function idbGetRecord<T>(
	storeName: string,
	key: string,
): Promise<T | null> {
	const db = await openClinicalL2Db();
	if (!db || !db.objectStoreNames.contains(storeName)) return null;

	return new Promise<T | null>((resolve, reject) => {
		try {
			const tx = db.transaction(storeName, "readonly");
			const store = tx.objectStore(storeName);
			const req = store.get(key);
			req.onsuccess = () => resolve((req.result as T) ?? null);
			req.onerror = () => reject(req.error);
		} catch (err) {
			reject(err);
		}
	});
}

export async function idbGetAllRecords<T>(storeName: string): Promise<T[]> {
	const db = await openClinicalL2Db();
	if (!db || !db.objectStoreNames.contains(storeName)) return [];

	return new Promise<T[]>((resolve, reject) => {
		try {
			const tx = db.transaction(storeName, "readonly");
			const store = tx.objectStore(storeName);
			const req = store.getAll();
			req.onsuccess = () =>
				resolve(Array.isArray(req.result) ? (req.result as T[]) : []);
			req.onerror = () => reject(req.error);
		} catch (err) {
			reject(err);
		}
	});
}

export async function idbDeleteRecord(
	storeName: string,
	key: string,
): Promise<void> {
	const db = await openClinicalL2Db();
	if (!db || !db.objectStoreNames.contains(storeName)) return;

	await new Promise<void>((resolve, reject) => {
		try {
			const tx = db.transaction(storeName, "readwrite");
			const store = tx.objectStore(storeName);
			const req = store.delete(key);
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error);
		} catch (err) {
			reject(err);
		}
	});
}

export function resetL2DbConnection(): void {
	if (cachedDbInstance) {
		try {
			cachedDbInstance.close();
		} catch {
			// ignore
		}
		cachedDbInstance = null;
	}
	dbOpenPromise = null;
}
