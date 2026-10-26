/**
 * studyReader.ts — Чтение исследований и вокселей из IndexedDB (Мандат 8b <= 120 строк).
 */

import { logger } from "../../../utils/logger";
import { openDicomOfflineDb } from "./dbConnection";
import {
	DICOM_STUDIES_STORE_NAME,
	DICOM_SLICES_STORE_NAME,
	type LocalDicomStudyRecord,
	type LocalDicomSliceRecord,
} from "./types";

export async function getLocalDicomStudy(studyInstanceUid: string): Promise<LocalDicomStudyRecord | null> {
	try {
		const db = await openDicomOfflineDb();
		if (!db.objectStoreNames.contains(DICOM_STUDIES_STORE_NAME)) return null;

		return new Promise<LocalDicomStudyRecord | null>((resolve, reject) => {
			const tx = db.transaction(DICOM_STUDIES_STORE_NAME, "readonly");
			const store = tx.objectStore(DICOM_STUDIES_STORE_NAME);
			const req = store.get(studyInstanceUid);
			req.onsuccess = () => resolve((req.result as LocalDicomStudyRecord) || null);
			req.onerror = () => reject(req.error ?? new Error("Ошибка чтения исследования"));
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Ошибка чтения исследования:", err);
		return null;
	}
}

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
			req.onerror = () => reject(req.error ?? new Error("Ошибка чтения срезов"));
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Не удалось получить срезы из кэша:", err);
		return [];
	}
}

export async function listLocalDicomStudies(patientId?: string): Promise<LocalDicomStudyRecord[]> {
	try {
		const db = await openDicomOfflineDb();
		if (!db.objectStoreNames.contains(DICOM_STUDIES_STORE_NAME)) return [];

		return new Promise<LocalDicomStudyRecord[]>((resolve, reject) => {
			const tx = db.transaction(DICOM_STUDIES_STORE_NAME, "readonly");
			const store = tx.objectStore(DICOM_STUDIES_STORE_NAME);
			const req = patientId ? store.index("patientId").getAll(patientId) : store.getAll();
			req.onsuccess = () => resolve((req.result as LocalDicomStudyRecord[]) || []);
			req.onerror = () => reject(req.error);
		});
	} catch (err) {
		logger.warn("[dicomOfflineSync] Ошибка получения списка исследований:", err);
		return [];
	}
}
