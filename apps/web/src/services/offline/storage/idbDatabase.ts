import { logger } from "../../../utils/logger";
import {
	CLINICAL_CACHE_STORE_NAME,
	DICOM_LOCAL_SLICES_STORE_NAME,
	DICOM_LOCAL_STUDIES_STORE_NAME,
	DICOM_PENDING_STUDIES_STORE_NAME,
	DICOM_WORKBENCH_DRAFTS_STORE_NAME,
	DRAFTS_STORE_NAME,
	ICD10_CACHE_STORE_NAME,
	MEDIA_BLOBS_STORE_NAME,
	MEDIA_ITEMS_STORE_NAME,
	MPR_WORKBENCH_DRAFTS_STORE_NAME,
	MUTATIONS_STORE_NAME,
	ODONTOGRAM_CACHE_STORE_NAME,
	OFFLINE_DB_NAME,
	OFFLINE_DB_VERSION,
	PATIENTS_CACHE_STORE_NAME,
	PENDING_SPEECH_CHUNKS_STORE_NAME,
	PENDING_VISIT_SAVES_STORE_NAME,
	PRICELIST_CACHE_STORE_NAME,
	SCHEDULES_CACHE_STORE_NAME,
	VOICE_TRANSCRIPTIONS_STORE_NAME,
} from "./constants";
import { clearInMemoryOfflineStorage } from "./idbMemory";
import { resetBatchedStoreWrites } from "./idbBatchBuffer";

let dbPromiseInstance: Promise<IDBDatabase> | null = null;

function getIndexedDbFactory(): IDBFactory | null {
	if (
		typeof window !== "undefined" &&
		Boolean(window.indexedDB) &&
		typeof window.indexedDB.open === "function"
	) {
		return window.indexedDB;
	}
	if (
		typeof globalThis !== "undefined" &&
		Boolean(globalThis.indexedDB) &&
		typeof globalThis.indexedDB.open === "function"
	) {
		return globalThis.indexedDB;
	}
	return null;
}

/**
 * Проверка доступности IndexedDB в текущем окружении
 */
export function isIndexedDbAvailable(): boolean {
	return getIndexedDbFactory() !== null;
}

/**
 * Открытие базы данных IndexedDB для очереди мутаций
 */
export function openOfflineOutboxDb(): Promise<IDBDatabase> {
	const idb = getIndexedDbFactory();
	if (!idb) {
		return Promise.reject(
			new Error("IndexedDB is not available in current environment"),
		);
	}

	if (dbPromiseInstance) {
		return dbPromiseInstance;
	}

	dbPromiseInstance = new Promise<IDBDatabase>((resolve, reject) => {
		try {
			const request = idb.open(
				OFFLINE_DB_NAME,
				OFFLINE_DB_VERSION,
			);

			request.onupgradeneeded = (event?: IDBVersionChangeEvent) => {
				const db = request.result;
				const tx = request.transaction;
				const oldVersion = event?.oldVersion ?? 0;
				logger.info(
					`[Dente] [OfflineStorage] Upgrading IndexedDB schema: v${oldVersion} -> v${OFFLINE_DB_VERSION}`,
				);

				// Helper to check index existence safely across browsers and node test mock IDB
				const safeCreateIndex = (store: IDBObjectStore, name: string, keyPath?: string) => {
					if (!store) return;
					try {
						const hasIndex =
							store.indexNames &&
							(typeof store.indexNames.contains === "function"
								? store.indexNames.contains(name)
								: Array.from(store.indexNames).includes(name));
						if (!hasIndex) {
							store.createIndex(name, keyPath ?? name);
						}
					} catch (err: unknown) {
						logger.debug(`[OfflineStorage] Index ${name} check/creation skipped:`, err);
					}
				};

				const ensureObjectStore = (
					storeName: string,
					options?: IDBObjectStoreParameters,
				): IDBObjectStore | undefined => {
					if (!db.objectStoreNames.contains(storeName)) {
						return options
							? db.createObjectStore(storeName, options)
							: db.createObjectStore(storeName);
					}
					if (!tx) return undefined;
					try {
						return tx.objectStore(storeName);
					} catch (err: unknown) {
						logger.warn(`[OfflineStorage] Failed to access ${storeName} in tx upgrade:`, err);
						return undefined;
					}
				};

				// 1. Mutations Outbox Store
				const mutStore = ensureObjectStore(MUTATIONS_STORE_NAME, { keyPath: "mutationId" });
				if (mutStore) {
					safeCreateIndex(mutStore, "timestamp", "timestamp");
					safeCreateIndex(mutStore, "timestampMs", "timestampMs");
					safeCreateIndex(mutStore, "entityType", "entityType");
					safeCreateIndex(mutStore, "entityId", "entityId");
					safeCreateIndex(mutStore, "status", "status");
					safeCreateIndex(mutStore, "organizationId", "organizationId");
				}

				// 2. Clinical Drafts Store (Form 043/u, SOAP, Odontogram)
				const draftStore = ensureObjectStore(DRAFTS_STORE_NAME, { keyPath: "draftKey" });
				if (draftStore) {
					safeCreateIndex(draftStore, "entityType", "entityType");
					safeCreateIndex(draftStore, "entityId", "entityId");
					safeCreateIndex(draftStore, "updatedAt", "updatedAt");
					safeCreateIndex(draftStore, "updatedAtMs", "updatedAtMs");
					safeCreateIndex(draftStore, "organizationId", "organizationId");
				}

				// 3. Clinical Fast Cache Store
				const cacheStore = ensureObjectStore(CLINICAL_CACHE_STORE_NAME, { keyPath: "cacheKey" });
				if (cacheStore) {
					safeCreateIndex(cacheStore, "entityKind", "entityKind");
					safeCreateIndex(cacheStore, "entityId", "entityId");
					safeCreateIndex(cacheStore, "cachedAtMs", "cachedAtMs");
					safeCreateIndex(cacheStore, "organizationId", "organizationId");
				}

				// 4. Schedules Cache Store
				const schedulesStore = ensureObjectStore(SCHEDULES_CACHE_STORE_NAME, { keyPath: "scheduleKey" });
				if (schedulesStore) {
					safeCreateIndex(schedulesStore, "date", "date");
					safeCreateIndex(schedulesStore, "organizationId", "organizationId");
					safeCreateIndex(schedulesStore, "cachedAtMs", "cachedAtMs");
				}

				// 5. Patients Cache Store
				const patientsStore = ensureObjectStore(PATIENTS_CACHE_STORE_NAME, { keyPath: "patientId" });
				if (patientsStore) {
					safeCreateIndex(patientsStore, "organizationId", "organizationId");
					safeCreateIndex(patientsStore, "cachedAtMs", "cachedAtMs");
				}

				// 6. Odontogram Cache Store
				const odontogramStore = ensureObjectStore(ODONTOGRAM_CACHE_STORE_NAME, { keyPath: "patientId" });
				if (odontogramStore) {
					safeCreateIndex(odontogramStore, "organizationId", "organizationId");
					safeCreateIndex(odontogramStore, "cachedAtMs", "cachedAtMs");
				}

				// 7. Price List 804n Cache Store
				const priceStore = ensureObjectStore(PRICELIST_CACHE_STORE_NAME, { keyPath: "catalogKey" });
				if (priceStore) {
					safeCreateIndex(priceStore, "organizationId", "organizationId");
					safeCreateIndex(priceStore, "cachedAtMs", "cachedAtMs");
				}

				// 8. ICD-10 Dictionary Cache Store
				const icd10Store = ensureObjectStore(ICD10_CACHE_STORE_NAME, { keyPath: "dictionaryKey" });
				if (icd10Store) {
					safeCreateIndex(icd10Store, "cachedAtMs", "cachedAtMs");
				}

				// 9. Pending Visit Saves Store (migrated from dental-crm-offline)
				ensureObjectStore(PENDING_VISIT_SAVES_STORE_NAME, { keyPath: "id" });

				// 10. DICOM Workbench Drafts Store
				const dicomDraftStore = ensureObjectStore(DICOM_WORKBENCH_DRAFTS_STORE_NAME, { keyPath: "id" });
				if (dicomDraftStore) {
					safeCreateIndex(dicomDraftStore, "savedAt", "savedAt");
				}

				// 11. MPR Workbench Drafts Store
				const mprDraftStore = ensureObjectStore(MPR_WORKBENCH_DRAFTS_STORE_NAME, { keyPath: "id" });
				if (mprDraftStore) {
					safeCreateIndex(mprDraftStore, "savedAt", "savedAt");
				}

				// 12. Pending Speech Chunks Store
				const speechChunkStore = ensureObjectStore(PENDING_SPEECH_CHUNKS_STORE_NAME, { keyPath: "chunkId" });
				if (speechChunkStore) {
					safeCreateIndex(speechChunkStore, "visitId", "visitId");
					safeCreateIndex(speechChunkStore, "createdAt", "createdAt");
				}

				// 13. Voice Offline Transcriptions Store (migrated from dente_voice_offline_db)
				const voiceStore = ensureObjectStore(VOICE_TRANSCRIPTIONS_STORE_NAME, { keyPath: "id" });
				if (voiceStore) {
					safeCreateIndex(voiceStore, "timestamp", "timestamp");
					safeCreateIndex(voiceStore, "status", "status");
					safeCreateIndex(voiceStore, "retryCount", "retryCount");
					safeCreateIndex(voiceStore, "patientId", "patientId");
					safeCreateIndex(voiceStore, "createdAt", "createdAt");
				}

				// 14. DICOM Pending Studies Store (migrated from dente-dicom-offline-cache)
				const dicomPendingStore = ensureObjectStore(DICOM_PENDING_STUDIES_STORE_NAME, { keyPath: "id" });
				if (dicomPendingStore) {
					safeCreateIndex(dicomPendingStore, "savedAt", "savedAt");
					safeCreateIndex(dicomPendingStore, "syncStatus", "syncStatus");
					safeCreateIndex(dicomPendingStore, "status", "status");
					safeCreateIndex(dicomPendingStore, "patientId", "patientId");
				}

				// 15. DICOM Local Studies Store
				const dicomLocalStudiesStore = ensureObjectStore(DICOM_LOCAL_STUDIES_STORE_NAME, {
					keyPath: "studyInstanceUid",
				});
				if (dicomLocalStudiesStore) {
					safeCreateIndex(dicomLocalStudiesStore, "patientId", "patientId");
					safeCreateIndex(dicomLocalStudiesStore, "syncStatus", "syncStatus");
					safeCreateIndex(dicomLocalStudiesStore, "savedAt", "savedAt");
					safeCreateIndex(dicomLocalStudiesStore, "seriesUid", "seriesUid");
					safeCreateIndex(dicomLocalStudiesStore, "cachedAt", "cachedAt");
				}

				// 16. DICOM Local Slices Store
				const dicomLocalSlicesStore = ensureObjectStore(DICOM_LOCAL_SLICES_STORE_NAME, { keyPath: "id" });
				if (dicomLocalSlicesStore) {
					safeCreateIndex(dicomLocalSlicesStore, "studyInstanceUid", "studyInstanceUid");
					safeCreateIndex(dicomLocalSlicesStore, "seriesUid", "seriesUid");
					safeCreateIndex(dicomLocalSlicesStore, "sliceIndex", "sliceIndex");
					safeCreateIndex(dicomLocalSlicesStore, "syncStatus", "syncStatus");
					safeCreateIndex(dicomLocalSlicesStore, "sopInstanceUid", "sopInstanceUid");
				}

				// 17. Media Vault Items Store (migrated from dente-media-vault)
				const mediaItemsStore = ensureObjectStore(MEDIA_ITEMS_STORE_NAME, { keyPath: "mediaId" });
				if (mediaItemsStore) {
					safeCreateIndex(mediaItemsStore, "patientId", "patientId");
					safeCreateIndex(mediaItemsStore, "toothNumber", "toothNumber");
					safeCreateIndex(mediaItemsStore, "visitId", "visitId");
					safeCreateIndex(mediaItemsStore, "syncStatus", "syncStatus");
					safeCreateIndex(mediaItemsStore, "capturedAtMs", "capturedAtMs");
					safeCreateIndex(mediaItemsStore, "organizationId", "organizationId");
				}

				// 18. Media Vault Blobs Store (explicit keyPut/keyGet)
				ensureObjectStore(MEDIA_BLOBS_STORE_NAME);
			};

			request.onsuccess = () => {
				const db = request.result;
				db.onversionchange = () => {
					dbPromiseInstance = null;
					db.close();
				};
				db.onclose = () => {
					dbPromiseInstance = null;
				};
				resolve(db);
			};

			request.onerror = () => {
				dbPromiseInstance = null;
				reject(request.error ?? new Error("Failed to open offline IndexedDB"));
			};

			request.onblocked = () => {
				dbPromiseInstance = null;
				reject(new Error("Offline IndexedDB open was blocked by another tab"));
			};
		} catch (err) {
			dbPromiseInstance = null;
			reject(err instanceof Error ? err : new Error(String(err)));
		}
	});

	return dbPromiseInstance;
}

export function resetOfflineDbConnection(clearMemory = true): void {
	dbPromiseInstance = null;
	if (clearMemory) {
		clearInMemoryOfflineStorage();
		resetBatchedStoreWrites();
	}
}

/**
 * Выполнение IndexedDB операции с автоматическим повтором (Exponential Backoff, 3 попытки)
 * при транзакционных таймаутах TransactionInactiveError / TimeoutError / AbortError.
 */
export async function withIdbTransactionRetry<R>(
	operation: (db: IDBDatabase) => Promise<R>,
	maxAttempts = 3,
	initialDelayMs = 50,
): Promise<R> {
	let lastError: unknown;
	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			const db = await openOfflineOutboxDb();
			return await operation(db);
		} catch (err: unknown) {
			lastError = err;
			const isTransient =
				err instanceof Error &&
				(err.name === "TransactionInactiveError" ||
					err.name === "TimeoutError" ||
					err.name === "AbortError" ||
					err.name === "InvalidStateError" ||
					(typeof err.message === "string" &&
						(err.message.includes("TransactionInactiveError") ||
							err.message.includes("TimeoutError") ||
							err.message.includes("transaction has finished") ||
							err.message.includes("transaction is not active") ||
							err.message.includes("timed out"))));

			if (isTransient && attempt < maxAttempts) {
				logger.warn(
					`[OfflineStorage] IndexedDB transient error (${(err as Error).name || (err as Error).message}) on attempt ${attempt}/${maxAttempts}, retrying with exponential backoff...`,
				);
				resetOfflineDbConnection(false);
				await new Promise((resolve) =>
					setTimeout(resolve, initialDelayMs * Math.pow(2, attempt - 1)),
				);
				continue;
			}
			throw err;
		}
	}
	throw lastError;
}
