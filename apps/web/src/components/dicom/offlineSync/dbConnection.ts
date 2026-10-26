/**
 * dbConnection.ts — Инициализация и миграция схемы IndexedDB (Мандат 8b <= 120 строк).
 */

import {
	DICOM_OFFLINE_DB_NAME,
	DICOM_OFFLINE_DB_VERSION,
	DICOM_OFFLINE_STORE_NAME,
	DICOM_STUDIES_STORE_NAME,
	DICOM_SLICES_STORE_NAME,
} from "./types";

let dbPromise: Promise<IDBDatabase> | null = null;

export function resetDicomOfflineDbForTesting(): void {
	dbPromise = null;
}

function getIndexedDB(): IDBFactory | null {
	if (typeof window !== "undefined" && window.indexedDB) {
		return window.indexedDB;
	}
	if (typeof globalThis !== "undefined" && globalThis.indexedDB) {
		return globalThis.indexedDB;
	}
	return null;
}

export function openDicomOfflineDb(): Promise<IDBDatabase> {
	if (dbPromise) return dbPromise;

	const idb = getIndexedDB();
	if (!idb) {
		return Promise.reject(new Error("IndexedDB is not available in current environment"));
	}

	dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
		const req = idb.open(DICOM_OFFLINE_DB_NAME, DICOM_OFFLINE_DB_VERSION);

		req.onupgradeneeded = (e) => {
			const db = (e.target as IDBOpenDBRequest).result;

			if (!db.objectStoreNames.contains(DICOM_OFFLINE_STORE_NAME)) {
				const store = db.createObjectStore(DICOM_OFFLINE_STORE_NAME, { keyPath: "id" });
				store.createIndex("savedAt", "savedAt", { unique: false });
				store.createIndex("syncStatus", "syncStatus", { unique: false });
			}

			if (!db.objectStoreNames.contains(DICOM_STUDIES_STORE_NAME)) {
				const studiesStore = db.createObjectStore(DICOM_STUDIES_STORE_NAME, { keyPath: "studyInstanceUid" });
				studiesStore.createIndex("patientId", "patientId", { unique: false });
				studiesStore.createIndex("syncStatus", "syncStatus", { unique: false });
				studiesStore.createIndex("savedAt", "savedAt", { unique: false });
				studiesStore.createIndex("seriesUid", "seriesUid", { unique: false });
			}

			if (!db.objectStoreNames.contains(DICOM_SLICES_STORE_NAME)) {
				const slicesStore = db.createObjectStore(DICOM_SLICES_STORE_NAME, { keyPath: "id" });
				slicesStore.createIndex("studyInstanceUid", "studyInstanceUid", { unique: false });
				slicesStore.createIndex("seriesUid", "seriesUid", { unique: false });
				slicesStore.createIndex("sliceIndex", "sliceIndex", { unique: false });
				slicesStore.createIndex("syncStatus", "syncStatus", { unique: false });
			}
		};

		req.onsuccess = () => resolve(req.result);
		req.onerror = () => {
			dbPromise = null;
			reject(req.error ?? new Error("Failed to open DICOM offline database"));
		};
	});

	return dbPromise;
}
