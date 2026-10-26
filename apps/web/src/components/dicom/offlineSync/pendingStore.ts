/**
 * pendingStore.ts — Очередь несинхронизированных срезов DICOM (Мандат 8b <= 120 строк).
 */

import { logger } from "../../../utils/logger";
import { openDicomOfflineDb } from "./dbConnection";
import { DICOM_OFFLINE_STORE_NAME, generateRecordId, type OfflineDicomRecord } from "./types";

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
			tx.oncomplete = () => resolve(savedCount);
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
			req.onerror = () => reject(req.error ?? new Error("Ошибка чтения записей"));
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
			req.onerror = () => reject(req.error ?? new Error("Ошибка подсчета записей"));
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Ошибка подсчета записей:", err);
		return 0;
	}
}

export async function removePendingOfflineDicom(id: string): Promise<void> {
	try {
		const db = await openDicomOfflineDb();
		return new Promise<void>((resolve, reject) => {
			const tx = db.transaction(DICOM_OFFLINE_STORE_NAME, "readwrite");
			const req = tx.objectStore(DICOM_OFFLINE_STORE_NAME).delete(id);
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error ?? new Error("Ошибка удаления"));
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
			const req = tx.objectStore(DICOM_OFFLINE_STORE_NAME).clear();
			req.onsuccess = () => resolve();
			req.onerror = () => reject(req.error ?? new Error("Ошибка очистки"));
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Ошибка очистки хранилища:", err);
	}
}
