/**
 * syncStatusUpdater.ts — Обновление статусов синхронизации исследований в IndexedDB (Мандат 8b <= 120 строк).
 */

import { logger } from "../../../utils/logger";
import { openDicomOfflineDb } from "./dbConnection";
import { DICOM_STUDIES_STORE_NAME, type LocalDicomStudyRecord } from "./types";

export async function markStudyAsSynced(studyInstanceUid: string): Promise<void> {
	try {
		const db = await openDicomOfflineDb();
		const now = new Date().toISOString();
		return new Promise<void>((resolve, reject) => {
			const available = [DICOM_STUDIES_STORE_NAME].filter((s) => db.objectStoreNames.contains(s));
			if (!available.length) return resolve();
			const tx = db.transaction(available, "readwrite");
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
			tx.oncomplete = () => resolve();
			tx.onerror = () => reject(tx.error ?? new Error("Ошибка обновления статуса"));
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Ошибка обновления статуса:", err);
	}
}

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
