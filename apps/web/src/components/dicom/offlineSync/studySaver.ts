/**
 * studySaver.ts — Персистентное сохранение исследований в IndexedDB (Мандат 8b <= 120 строк).
 */

import { logger } from "../../../utils/logger";
import { openDicomOfflineDb } from "./dbConnection";
import {
	DICOM_OFFLINE_STORE_NAME,
	DICOM_STUDIES_STORE_NAME,
	DICOM_SLICES_STORE_NAME,
	generateRecordId,
	type SaveLocalDicomStudyInput,
	type LocalDicomStudyRecord,
	type LocalDicomSliceRecord,
	type OfflineDicomRecord,
} from "./types";

export async function saveLocalDicomStudy(input: SaveLocalDicomStudyInput): Promise<LocalDicomStudyRecord> {
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
		const available = stores.filter((s) => db.objectStoreNames.contains(s));
		const tx = db.transaction(available, "readwrite");

		if (available.includes(DICOM_STUDIES_STORE_NAME)) {
			tx.objectStore(DICOM_STUDIES_STORE_NAME).put(studyRecord);
		}

		if (available.includes(DICOM_SLICES_STORE_NAME)) {
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

		if (available.includes(DICOM_OFFLINE_STORE_NAME)) {
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
			logger.info(`[dicomOfflineSync] Исследование ${input.studyInstanceUid} (${sliceCount} срезов) персистировано`);
			resolve(studyRecord);
		};
		tx.onerror = () => reject(tx.error ?? new Error("Ошибка сохранения КТ"));
	});
}

