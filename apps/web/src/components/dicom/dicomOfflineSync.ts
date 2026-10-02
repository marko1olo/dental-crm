/**
 * dicomOfflineSync.ts — Offline-First IndexedDB Persistence & Synchronization Engine
 *
 * Provides resilient two-tier storage for DICOM & CBCT studies (Mandate 8l, Mandate 8e):
 * - Tier 1: Local clinic PC storage (IndexedDB local_studies & local_slices)
 *   Persists voxels and study metadata (StudyInstanceUID, patientId, seriesUid, sliceCount, dimensions, voxelSpacing)
 *   Zero-request instant restoration on tab refresh or network outage.
 * - Tier 2: Central clinic PACS server synchronization queue (STOW-RS /api/dicomweb/studies)
 *   Marks un-synced studies as "pending_sync" and auto-synchronizes on connection restore.
 * Governed by Mandate 8b (<= 800 lines) and Mandate 8e (Doctor Autonomy & Zero Data Loss).
 */

import dicomParser from "dicom-parser";
import { logger } from "../../utils/logger";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

function generateRecordId(): string {
	if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
		return crypto.randomUUID();
	}
	return `id_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export const DICOM_OFFLINE_DB_NAME = "dente-dicom-offline-cache";
export const DICOM_OFFLINE_DB_VERSION = 2;

export const DICOM_OFFLINE_STORE_NAME = "pending_studies";
export const DICOM_STUDIES_STORE_NAME = "local_studies";
export const DICOM_SLICES_STORE_NAME = "local_slices";

export type DicomSyncStatus = "pending_sync" | "synced" | "sync_failed";

export interface OfflineDicomRecord {
	id: string;
	fileName: string;
	data: ArrayBuffer;
	size: number;
	savedAt: string;
	syncStatus: "pending_sync";
	syncStatusLabel: "Ожидает синхронизации";
	studyInstanceUid?: string;
	patientId?: string | null;
}

export interface LocalDicomStudyRecord {
	studyInstanceUid: string;
	seriesUid: string;
	patientId: string | null;
	sliceCount: number;
	dimensions: { width: number; height: number; depth: number };
	voxelSpacing: { x: number; y: number; z: number };
	studyDate: string;
	title: string;
	savedAt: string;
	syncedAt: string | null;
	syncStatus: DicomSyncStatus;
	syncStatusLabel: string;
	syncError?: string | null;
}

export interface LocalDicomSliceRecord {
	id: string;
	studyInstanceUid: string;
	seriesUid: string;
	sopInstanceUid: string;
	sliceIndex: number;
	fileName: string;
	data: ArrayBuffer;
	size: number;
	syncStatus: "pending_sync" | "synced";
	savedAt: string;
}

export interface SaveLocalDicomStudyInput {
	studyInstanceUid: string;
	seriesUid?: string | undefined;
	patientId?: string | null | undefined;
	sliceCount?: number | undefined;
	dimensions?: { width: number; height: number; depth: number } | undefined;
	voxelSpacing?: { x: number; y: number; z: number } | undefined;
	studyDate?: string | undefined;
	title?: string | undefined;
	slices: Array<{
		name: string;
		buffer: ArrayBuffer;
		sopInstanceUid?: string | undefined;
	}>;
}

export interface ParsedDicomHeaderInfo {
	studyInstanceUid: string;
	seriesUid?: string | undefined;
	sopInstanceUid?: string | undefined;
	patientName?: string | undefined;
	patientId?: string | undefined;
	studyDate?: string | undefined;
}

/**
 * Extracts StudyInstanceUID, SeriesInstanceUID, SOPInstanceUID, and Patient metadata from DICOM buffer.
 * Stops parsing at PixelData (7FE0,0010) for maximum speed and minimal memory footprint.
 */
export function extractDicomHeaderInfo(buffer: ArrayBuffer): ParsedDicomHeaderInfo {
	try {
		const headerBytes = new Uint8Array(buffer.slice(0, Math.min(buffer.byteLength, 131072)));
		const dataSet = dicomParser.parseDicom(headerBytes, { untilTag: "x7fe00010" });
		const studyUid = dataSet.string("x0020000d") || `1.2.643.5.1.13.2.${Date.now()}`;
		const seriesUid = dataSet.string("x0020000e") || undefined;
		const sopUid = dataSet.string("x00080018") || undefined;
		const patientName = dataSet.string("x00100010") || undefined;
		const patientId = dataSet.string("x00100020") || undefined;
		const studyDate = dataSet.string("x00080020") || undefined;
		return {
			studyInstanceUid: studyUid,
			seriesUid,
			sopInstanceUid: sopUid,
			patientName,
			patientId,
			studyDate,
		};
	} catch {
		return {
			studyInstanceUid: `1.2.643.5.1.13.2.${Date.now()}`,
		};
	}
}

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

			// Store 1: Legacy / pending queue
			if (!db.objectStoreNames.contains(DICOM_OFFLINE_STORE_NAME)) {
				const store = db.createObjectStore(DICOM_OFFLINE_STORE_NAME, {
					keyPath: "id",
				});
				store.createIndex("savedAt", "savedAt", { unique: false });
				store.createIndex("syncStatus", "syncStatus", { unique: false });
			}

			// Store 2: High-level studies metadata
			if (!db.objectStoreNames.contains(DICOM_STUDIES_STORE_NAME)) {
				const studiesStore = db.createObjectStore(DICOM_STUDIES_STORE_NAME, {
					keyPath: "studyInstanceUid",
				});
				studiesStore.createIndex("patientId", "patientId", { unique: false });
				studiesStore.createIndex("syncStatus", "syncStatus", { unique: false });
				studiesStore.createIndex("savedAt", "savedAt", { unique: false });
				studiesStore.createIndex("seriesUid", "seriesUid", { unique: false });
			}

			// Store 3: Detailed slice voxels
			if (!db.objectStoreNames.contains(DICOM_SLICES_STORE_NAME)) {
				const slicesStore = db.createObjectStore(DICOM_SLICES_STORE_NAME, {
					keyPath: "id",
				});
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

/**
 * Persists complete local CBCT study and its slice voxels into IndexedDB (Tier 1 Local Workstation).
 * Guarantees zero data loss on browser refresh, tab close, or clinic network cut.
 */
export async function saveLocalDicomStudy(
	input: SaveLocalDicomStudyInput,
): Promise<LocalDicomStudyRecord> {
	const db = await openDicomOfflineDb();
	const now = new Date().toISOString();
	const sliceCount = input.slices.length;
	const seriesUid = input.seriesUid || `1.2.643.5.1.13.2.${Date.now()}`;

	const studyRecord: LocalDicomStudyRecord = {
		studyInstanceUid: input.studyInstanceUid,
		seriesUid,
		patientId: input.patientId || null,
		sliceCount: input.sliceCount || sliceCount,
		dimensions: input.dimensions || { width: 512, height: 512, depth: sliceCount },
		voxelSpacing: input.voxelSpacing || { x: 0.25, y: 0.25, z: 0.25 },
		studyDate: input.studyDate || now.slice(0, 10),
		title: input.title || `КЛКТ исследование ${input.studyInstanceUid.slice(-8)}`,
		savedAt: now,
		syncedAt: null,
		syncStatus: "pending_sync",
		syncStatusLabel: "Сохранено локально на этом ПК • Ожидает синхронизации",
		syncError: null,
	};

	return new Promise<LocalDicomStudyRecord>((resolve, reject) => {
		const stores = [DICOM_STUDIES_STORE_NAME, DICOM_SLICES_STORE_NAME, DICOM_OFFLINE_STORE_NAME];
		// Filter out any stores that might be missing in mock environments
		const availableStores = stores.filter((s) => db.objectStoreNames.contains(s));
		const tx = db.transaction(availableStores, "readwrite");

		if (availableStores.includes(DICOM_STUDIES_STORE_NAME)) {
			const studiesStore = tx.objectStore(DICOM_STUDIES_STORE_NAME);
			studiesStore.put(studyRecord);
		}

		if (availableStores.includes(DICOM_SLICES_STORE_NAME)) {
			const slicesStore = tx.objectStore(DICOM_SLICES_STORE_NAME);
			input.slices.forEach((slice, idx) => {
				const sopUid = slice.sopInstanceUid || `slice_${idx + 1}`;
				const sliceRecord: LocalDicomSliceRecord = {
					id: `${input.studyInstanceUid}_${seriesUid}_${sopUid}`,
					studyInstanceUid: input.studyInstanceUid,
					seriesUid,
					sopInstanceUid: sopUid,
					sliceIndex: idx,
					fileName: slice.name,
					data: slice.buffer,
					size: slice.buffer.byteLength,
					syncStatus: "pending_sync",
					savedAt: now,
				};
				slicesStore.put(sliceRecord);
			});
		}

		// Also populate legacy pending_studies queue for backward compatibility
		if (availableStores.includes(DICOM_OFFLINE_STORE_NAME)) {
			const legacyStore = tx.objectStore(DICOM_OFFLINE_STORE_NAME);
			input.slices.forEach((slice) => {
				const record: OfflineDicomRecord = {
					id: generateRecordId(),
					fileName: slice.name,
					data: slice.buffer,
					size: slice.buffer.byteLength,
					savedAt: now,
					syncStatus: "pending_sync",
					syncStatusLabel: "Ожидает синхронизации",
					studyInstanceUid: input.studyInstanceUid,
					patientId: input.patientId || null,
				};
				legacyStore.put(record);
			});
		}

		tx.oncomplete = () => {
			logger.info(
				`[dicomOfflineSync] Исследование ${input.studyInstanceUid} (${sliceCount} срезов) надежно персистировано в IndexedDB`,
			);
			resolve(studyRecord);
		};
		tx.onerror = () => reject(tx.error ?? new Error("Ошибка транзакции персистентного сохранения КТ"));
	});
}

/**
 * Retrieves local study metadata from IndexedDB by StudyInstanceUID.
 */
export async function getLocalDicomStudy(
	studyInstanceUid: string,
): Promise<LocalDicomStudyRecord | null> {
	try {
		const db = await openDicomOfflineDb();
		if (!db.objectStoreNames.contains(DICOM_STUDIES_STORE_NAME)) return null;

		return new Promise<LocalDicomStudyRecord | null>((resolve, reject) => {
			const tx = db.transaction(DICOM_STUDIES_STORE_NAME, "readonly");
			const store = tx.objectStore(DICOM_STUDIES_STORE_NAME);
			const req = store.get(studyInstanceUid);

			req.onsuccess = () => resolve((req.result as LocalDicomStudyRecord) || null);
			req.onerror = () => reject(req.error ?? new Error("Ошибка чтения исследования из IndexedDB"));
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Ошибка чтения исследования:", err);
		return null;
	}
}

/**
 * Retrieves all stored slices for a study from local IndexedDB cache.
 * Enables instant opening of CBCT scans with ZERO network requests.
 */
export async function getLocalDicomSlices(
	studyInstanceUid: string,
): Promise<Array<{ fileName: string; buffer: ArrayBuffer; sliceIndex: number; sopInstanceUid: string }>> {
	try {
		const db = await openDicomOfflineDb();
		if (!db.objectStoreNames.contains(DICOM_SLICES_STORE_NAME)) return [];

		return new Promise((resolve, reject) => {
			const tx = db.transaction(DICOM_SLICES_STORE_NAME, "readonly");
			const store = tx.objectStore(DICOM_SLICES_STORE_NAME);
			const index = store.index("studyInstanceUid");
			const req = index.getAll(studyInstanceUid);

			req.onsuccess = () => {
				const records = (req.result as LocalDicomSliceRecord[]) || [];
				records.sort((a, b) => a.sliceIndex - b.sliceIndex);
				resolve(
					records.map((r) => ({
						fileName: r.fileName,
						buffer: r.data,
						sliceIndex: r.sliceIndex,
						sopInstanceUid: r.sopInstanceUid,
					})),
				);
			};
			req.onerror = () => reject(req.error ?? new Error("Ошибка чтения срезов из IndexedDB"));
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Не удалось получить срезы из кэша:", err);
		return [];
	}
}

/**
 * Marks study as successfully synchronized with central PACS server.
 */
export async function markStudyAsSynced(studyInstanceUid: string): Promise<void> {
	try {
		const db = await openDicomOfflineDb();
		const now = new Date().toISOString();

		return new Promise<void>((resolve, reject) => {
			const available = [DICOM_STUDIES_STORE_NAME, DICOM_SLICES_STORE_NAME, DICOM_OFFLINE_STORE_NAME].filter(
				(s) => db.objectStoreNames.contains(s),
			);
			const tx = db.transaction(available, "readwrite");

			if (available.includes(DICOM_STUDIES_STORE_NAME)) {
				const studyStore = tx.objectStore(DICOM_STUDIES_STORE_NAME);
				const req = studyStore.get(studyInstanceUid);
				req.onsuccess = () => {
					const record = req.result as LocalDicomStudyRecord | undefined;
					if (record) {
						record.syncStatus = "synced";
						record.syncedAt = now;
						record.syncStatusLabel = "Сохранено локально на этом ПК • Синхронизировано с сервером клиники";
						record.syncError = null;
						studyStore.put(record);
					}
				};
			}

			tx.oncomplete = () => {
				logger.info(`[dicomOfflineSync] Исследование ${studyInstanceUid} помечено как синхронизированное с сервером`);
				resolve();
			};
			tx.onerror = () => reject(tx.error ?? new Error("Ошибка обновления статуса синхронизации"));
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Ошибка обновления статуса:", err);
	}
}

/**
 * Marks study synchronization as failed with specific error reason.
 */
export async function markStudySyncFailed(studyInstanceUid: string, error: string): Promise<void> {
	try {
		const db = await openDicomOfflineDb();
		if (!db.objectStoreNames.contains(DICOM_STUDIES_STORE_NAME)) return;

		return new Promise<void>((resolve, reject) => {
			const tx = db.transaction(DICOM_STUDIES_STORE_NAME, "readwrite");
			const store = tx.objectStore(DICOM_STUDIES_STORE_NAME);
			const req = store.get(studyInstanceUid);

			req.onsuccess = () => {
				const record = req.result as LocalDicomStudyRecord | undefined;
				if (record) {
					record.syncStatus = "sync_failed";
					record.syncStatusLabel = "Сохранено локально на этом ПК • Ошибка синхронизации с сервером";
					record.syncError = error;
					store.put(record);
				}
				resolve();
			};
			req.onerror = () => reject(req.error);
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Ошибка отметки сбоя синхронизации:", err);
	}
}

/**
 * Lists all locally persisted studies for doctor consultation.
 */
export async function listLocalDicomStudies(patientId?: string): Promise<LocalDicomStudyRecord[]> {
	try {
		const db = await openDicomOfflineDb();
		if (!db.objectStoreNames.contains(DICOM_STUDIES_STORE_NAME)) return [];

		return new Promise<LocalDicomStudyRecord[]>((resolve, reject) => {
			const tx = db.transaction(DICOM_STUDIES_STORE_NAME, "readonly");
			const store = tx.objectStore(DICOM_STUDIES_STORE_NAME);

			let req: IDBRequest;
			if (patientId) {
				const index = store.index("patientId");
				req = index.getAll(patientId);
			} else {
				req = store.getAll();
			}

			req.onsuccess = () => resolve((req.result as LocalDicomStudyRecord[]) || []);
			req.onerror = () => reject(req.error);
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Ошибка получения списка исследований:", err);
		return [];
	}
}

/**
 * Background Offline Sync Worker:
 * Uploads all pending local slices to central PACS / STOW-RS when clinic connection is active.
 */
export async function syncPendingStudiesToServer(options?: {
	patientId?: string;
	onProgress?: (synced: number, total: number) => void;
}): Promise<{ syncedStudies: number; syncedSlices: number; errors: string[] }> {
	if (typeof navigator !== "undefined" && navigator.onLine === false) {
		return { syncedStudies: 0, syncedSlices: 0, errors: ["Браузер находится в автономном режиме"] };
	}

	const pendingStudies = await listLocalDicomStudies();
	const toSync = pendingStudies.filter((s) => s.syncStatus === "pending_sync" || s.syncStatus === "sync_failed");

	if (toSync.length === 0) {
		return { syncedStudies: 0, syncedSlices: 0, errors: [] };
	}

	let syncedStudies = 0;
	let syncedSlices = 0;
	const errors: string[] = [];

	for (const study of toSync) {
		try {
			const slices = await getLocalDicomSlices(study.studyInstanceUid);
			if (slices.length === 0) continue;

			let failedInStudy = 0;
			for (let i = 0; i < slices.length; i++) {
				const slice = slices[i]!;
				const targetPatientId = options?.patientId || study.patientId || "";
				const url = targetPatientId
					? `/api/dicomweb/studies?patientId=${encodeURIComponent(targetPatientId)}`
					: "/api/dicomweb/studies";

				try {
					const res = await fetch(url, {
						method: "POST",
						headers: denteAdminSecretRequestHeaders({
							"Content-Type": "application/dicom",
						}),
						body: slice.buffer,
					});

					if (res.ok) {
						syncedSlices++;
					} else {
						failedInStudy++;
					}
				} catch {
					failedInStudy++;
				}

				options?.onProgress?.(syncedSlices, slices.length);
			}

			if (failedInStudy === 0) {
				await markStudyAsSynced(study.studyInstanceUid);
				syncedStudies++;
			} else {
				await markStudySyncFailed(
					study.studyInstanceUid,
					`Не удалось отправить ${failedInStudy} из ${slices.length} срезов`,
				);
				errors.push(`Исследование ${study.studyInstanceUid}: сбой ${failedInStudy} срезов`);
			}
		} catch (studyErr) {
			const msg = studyErr instanceof Error ? studyErr.message : "Неизвестная ошибка";
			await markStudySyncFailed(study.studyInstanceUid, msg);
			errors.push(`Исследование ${study.studyInstanceUid}: ${msg}`);
		}
	}

	return { syncedStudies, syncedSlices, errors };
}

let syncWatcherInitialized = false;

/**
 * Initializes automatic background sync listener for clinic internet reconnection.
 * Returns a teardown function to safely remove the event listener.
 */
export function startDicomOfflineSyncWatcher(): () => void {
	if (typeof window === "undefined") return () => {};
	if (syncWatcherInitialized) return () => {};
	syncWatcherInitialized = true;

	const handleOnline = () => {
		logger.info("[dicomOfflineSync] Обнаружено восстановление сети. Запуск фоновой синхронизации КТ...");
		syncPendingStudiesToServer().catch((err) => {
			logger.warn("[dicomOfflineSync] Фоновая синхронизация завершилась с ошибкой:", err);
		});
	};

	window.addEventListener("online", handleOnline);
	return () => {
		syncWatcherInitialized = false;
		window.removeEventListener("online", handleOnline);
	};
}

// --------------------------------------------------------------------------------------------------
// Legacy store methods (kept for strict backward compatibility with existing tests & callers)
// --------------------------------------------------------------------------------------------------

export async function saveDicomFilesToOfflineSync(
	files: Array<{ name: string; buffer: ArrayBuffer }>,
): Promise<number> {
	if (!files || files.length === 0) return 0;

	try {
		const db = await openDicomOfflineDb();
		return new Promise<number>((resolve, reject) => {
			const tx = db.transaction(DICOM_OFFLINE_STORE_NAME, "readwrite");
			const store = tx.objectStore(DICOM_OFFLINE_STORE_NAME);
			const now = new Date().toISOString();
			let savedCount = 0;

			for (const file of files) {
				const record: OfflineDicomRecord = {
					id: generateRecordId(),
					fileName: file.name,
					data: file.buffer,
					size: file.buffer.byteLength,
					savedAt: now,
					syncStatus: "pending_sync",
					syncStatusLabel: "Ожидает синхронизации",
				};
				store.put(record);
				savedCount++;
			}

			tx.oncomplete = () => {
				logger.info(
					`[dicomOfflineSync] Сохранено ${savedCount} срезов в IndexedDB с меткой «Ожидает синхронизации»`,
				);
				resolve(savedCount);
			};
			tx.onerror = () => reject(tx.error ?? new Error("Ошибка транзакции сохранения срезов"));
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Не удалось сохранить срезы в IndexedDB:", err);
		return 0;
	}
}

export async function getPendingOfflineDicomRecords(): Promise<OfflineDicomRecord[]> {
	try {
		const db = await openDicomOfflineDb();
		return new Promise<OfflineDicomRecord[]>((resolve, reject) => {
			const tx = db.transaction(DICOM_OFFLINE_STORE_NAME, "readonly");
			const store = tx.objectStore(DICOM_OFFLINE_STORE_NAME);
			const req = store.getAll();

			req.onsuccess = () => resolve((req.result as OfflineDicomRecord[]) || []);
			req.onerror = () => reject(req.error ?? new Error("Ошибка чтения записей IndexedDB"));
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Ошибка чтения записей IndexedDB:", err);
		return [];
	}
}

export async function getPendingOfflineDicomCount(): Promise<number> {
	try {
		const db = await openDicomOfflineDb();
		return new Promise<number>((resolve, reject) => {
			const tx = db.transaction(DICOM_OFFLINE_STORE_NAME, "readonly");
			const store = tx.objectStore(DICOM_OFFLINE_STORE_NAME);
			const req = store.count();

			req.onsuccess = () => resolve(req.result || 0);
			req.onerror = () => reject(req.error ?? new Error("Ошибка подсчета записей IndexedDB"));
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Ошибка подсчета записей IndexedDB:", err);
		return 0;
	}
}

export async function removePendingOfflineDicom(id: string): Promise<void> {
	try {
		const db = await openDicomOfflineDb();
		return new Promise<void>((resolve, reject) => {
			const tx = db.transaction(DICOM_OFFLINE_STORE_NAME, "readwrite");
			const store = tx.objectStore(DICOM_OFFLINE_STORE_NAME);
			const req = store.delete(id);

			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error ?? new Error("Ошибка удаления записи IndexedDB"));
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Ошибка удаления записи:", err);
	}
}

export async function clearPendingOfflineDicom(): Promise<void> {
	try {
		const db = await openDicomOfflineDb();
		return new Promise<void>((resolve, reject) => {
			const tx = db.transaction(DICOM_OFFLINE_STORE_NAME, "readwrite");
			const store = tx.objectStore(DICOM_OFFLINE_STORE_NAME);
			const req = store.clear();

			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error ?? new Error("Ошибка очистки IndexedDB"));
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Ошибка очистки хранилища:", err);
	}
}
