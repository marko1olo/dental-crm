import { logger } from "../../../utils/logger";
import {
	CLINICAL_CACHE_STORE_NAME,
	DRAFTS_STORE_NAME,
	ICD10_CACHE_STORE_NAME,
	MUTATIONS_STORE_NAME,
	ODONTOGRAM_CACHE_STORE_NAME,
	OFFLINE_DB_NAME,
	OFFLINE_DB_VERSION,
	PATIENTS_CACHE_STORE_NAME,
	PRICELIST_CACHE_STORE_NAME,
	SCHEDULES_CACHE_STORE_NAME,
} from "./constants";
import { clearInMemoryOfflineStorage } from "./idbMemory";
import { resetBatchedStoreWrites } from "./idbBatchBuffer";

let dbPromiseInstance: Promise<IDBDatabase> | null = null;

/**
 * Проверка доступности IndexedDB в текущем окружении
 */
export function isIndexedDbAvailable(): boolean {
	return (
		typeof window !== "undefined" &&
		Boolean(window.indexedDB) &&
		typeof window.indexedDB.open === "function"
	);
}

/**
 * Открытие базы данных IndexedDB для очереди мутаций
 */
export function openOfflineOutboxDb(): Promise<IDBDatabase> {
	if (!isIndexedDbAvailable()) {
		return Promise.reject(
			new Error("IndexedDB is not available in current environment"),
		);
	}

	if (dbPromiseInstance) {
		return dbPromiseInstance;
	}

	dbPromiseInstance = new Promise<IDBDatabase>((resolve, reject) => {
		try {
			const request = window.indexedDB.open(
				OFFLINE_DB_NAME,
				OFFLINE_DB_VERSION,
			);

			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
			request.onupgradeneeded = (event?: IDBVersionChangeEvent | any) => {
				const db = request.result;
				const tx = request.transaction;
				const oldVersion = event?.oldVersion ?? 0;
				logger.info(
					`[Dente] [OfflineStorage] Upgrading IndexedDB schema: v${oldVersion} -> v${OFFLINE_DB_VERSION}`,
				);

				// Helper to check index existence safely across browsers and node test mock IDB
				// biome-ignore lint/suspicious/noExplicitAny: automated suppression
				const safeCreateIndex = (store: any, name: string, keyPath?: string) => {
					if (!store) return;
					try {
						const hasIndex =
							store.indexNames &&
							(typeof store.indexNames.contains === "function"
								? store.indexNames.contains(name)
								: typeof store.indexNames.indexOf === "function"
									? store.indexNames.indexOf(name) !== -1
									: false);
						if (!hasIndex) {
							store.createIndex(name, keyPath ?? name);
						}
					} catch {
						// ignore if index already exists
					}
				};

				// 1. Mutations Outbox Store
				let mutStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(MUTATIONS_STORE_NAME)) {
					mutStore = db.createObjectStore(MUTATIONS_STORE_NAME, {
						keyPath: "mutationId",
					});
				} else if (tx) {
					try {
						mutStore = tx.objectStore(MUTATIONS_STORE_NAME);
					} catch {
						// ignore
					}
				}

				if (mutStore) {
					safeCreateIndex(mutStore, "timestamp", "timestamp");
					safeCreateIndex(mutStore, "timestampMs", "timestampMs");
					safeCreateIndex(mutStore, "entityType", "entityType");
					safeCreateIndex(mutStore, "entityId", "entityId");
					safeCreateIndex(mutStore, "status", "status");
					safeCreateIndex(mutStore, "organizationId", "organizationId");
				}

				// 2. Clinical Drafts Store (Form 043/u, SOAP, Odontogram)
				let draftStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(DRAFTS_STORE_NAME)) {
					draftStore = db.createObjectStore(DRAFTS_STORE_NAME, {
						keyPath: "draftKey",
					});
				} else if (tx) {
					try {
						draftStore = tx.objectStore(DRAFTS_STORE_NAME);
					} catch {
						// ignore
					}
				}

				if (draftStore) {
					safeCreateIndex(draftStore, "entityType", "entityType");
					safeCreateIndex(draftStore, "entityId", "entityId");
					safeCreateIndex(draftStore, "updatedAt", "updatedAt");
					safeCreateIndex(draftStore, "updatedAtMs", "updatedAtMs");
					safeCreateIndex(draftStore, "organizationId", "organizationId");
				}

				// 3. Clinical Fast Cache Store
				let cacheStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(CLINICAL_CACHE_STORE_NAME)) {
					cacheStore = db.createObjectStore(CLINICAL_CACHE_STORE_NAME, {
						keyPath: "cacheKey",
					});
				} else if (tx) {
					try {
						cacheStore = tx.objectStore(CLINICAL_CACHE_STORE_NAME);
					} catch {
						// ignore
					}
				}

				if (cacheStore) {
					safeCreateIndex(cacheStore, "entityKind", "entityKind");
					safeCreateIndex(cacheStore, "entityId", "entityId");
					safeCreateIndex(cacheStore, "cachedAtMs", "cachedAtMs");
					safeCreateIndex(cacheStore, "organizationId", "organizationId");
				}

				// 4. Schedules Cache Store
				let schedulesStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(SCHEDULES_CACHE_STORE_NAME)) {
					schedulesStore = db.createObjectStore(SCHEDULES_CACHE_STORE_NAME, {
						keyPath: "scheduleKey",
					});
				} else if (tx) {
					try {
						schedulesStore = tx.objectStore(SCHEDULES_CACHE_STORE_NAME);
					} catch (err: unknown) {
						logger.warn("[OfflineStorage] Failed to access schedulesStore in tx upgrade:", err);
					}
				}
				if (schedulesStore) {
					safeCreateIndex(schedulesStore, "date", "date");
					safeCreateIndex(schedulesStore, "organizationId", "organizationId");
					safeCreateIndex(schedulesStore, "cachedAtMs", "cachedAtMs");
				}

				// 5. Patients Cache Store
				let patientsStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(PATIENTS_CACHE_STORE_NAME)) {
					patientsStore = db.createObjectStore(PATIENTS_CACHE_STORE_NAME, {
						keyPath: "patientId",
					});
				} else if (tx) {
					try {
						patientsStore = tx.objectStore(PATIENTS_CACHE_STORE_NAME);
					} catch (err: unknown) {
						logger.warn("[OfflineStorage] Failed to access patientsStore in tx upgrade:", err);
					}
				}
				if (patientsStore) {
					safeCreateIndex(patientsStore, "organizationId", "organizationId");
					safeCreateIndex(patientsStore, "cachedAtMs", "cachedAtMs");
				}

				// 6. Odontogram Cache Store
				let odontogramStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(ODONTOGRAM_CACHE_STORE_NAME)) {
					odontogramStore = db.createObjectStore(ODONTOGRAM_CACHE_STORE_NAME, {
						keyPath: "patientId",
					});
				} else if (tx) {
					try {
						odontogramStore = tx.objectStore(ODONTOGRAM_CACHE_STORE_NAME);
					} catch (err: unknown) {
						logger.warn("[OfflineStorage] Failed to access odontogramStore in tx upgrade:", err);
					}
				}
				if (odontogramStore) {
					safeCreateIndex(odontogramStore, "organizationId", "organizationId");
					safeCreateIndex(odontogramStore, "cachedAtMs", "cachedAtMs");
				}

				// 7. Price List 804n Cache Store
				let priceStore: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(PRICELIST_CACHE_STORE_NAME)) {
					priceStore = db.createObjectStore(PRICELIST_CACHE_STORE_NAME, {
						keyPath: "catalogKey",
					});
				} else if (tx) {
					try {
						priceStore = tx.objectStore(PRICELIST_CACHE_STORE_NAME);
					} catch (err: unknown) {
						logger.warn("[OfflineStorage] Failed to access priceStore in tx upgrade:", err);
					}
				}
				if (priceStore) {
					safeCreateIndex(priceStore, "organizationId", "organizationId");
					safeCreateIndex(priceStore, "cachedAtMs", "cachedAtMs");
				}

				// 8. ICD-10 Dictionary Cache Store
				let icd10Store: IDBObjectStore | undefined;
				if (!db.objectStoreNames.contains(ICD10_CACHE_STORE_NAME)) {
					icd10Store = db.createObjectStore(ICD10_CACHE_STORE_NAME, {
						keyPath: "dictionaryKey",
					});
				} else if (tx) {
					try {
						icd10Store = tx.objectStore(ICD10_CACHE_STORE_NAME);
					} catch (err: unknown) {
						logger.warn("[OfflineStorage] Failed to access icd10Store in tx upgrade:", err);
					}
				}
				if (icd10Store) {
					safeCreateIndex(icd10Store, "cachedAtMs", "cachedAtMs");
				}
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
