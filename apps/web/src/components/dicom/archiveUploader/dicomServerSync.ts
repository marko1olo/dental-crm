/**
 * dicomServerSync.ts — Локальное сохранение в IndexedDB и отправка в PACS (STOW-RS) (Мандат 8b <= 120 строк).
 */

import { logger } from "../../../utils/logger";
import { showToast } from "../../GlobalToast";
import {
	extractDicomHeaderInfo,
	markStudyAsSynced,
	markStudySyncFailed,
	saveLocalDicomStudy,
} from "../dicomOfflineSync";
import { uploadDicomFileToStow } from "./dicomStowUploader";
import type { SyncBadgeState } from "./types";

export interface SyncStudyOptions {
	validFiles: File[];
	patientId?: string | null | undefined;
	doctorId?: string | null | undefined;
	uploadToServer?: boolean | undefined;
	setStatus: (msg: string) => void;
	setProgressPercent: (pct: number | null) => void;
	setSyncBadge: (badge: SyncBadgeState | null) => void;
	isMounted: () => boolean;
}

export async function persistAndSyncDicomStudy(options: SyncStudyOptions): Promise<void> {
	const { validFiles, patientId, doctorId, uploadToServer, setStatus, setProgressPercent, setSyncBadge, isMounted } = options;
	let studyUid = `1.2.643.5.1.13.2.${Date.now()}`;
	let patientIdFromDicom: string | undefined;

	try {
		const firstSliceBuf = await validFiles[0]!.arrayBuffer();
		const headerInfo = extractDicomHeaderInfo(firstSliceBuf);
		studyUid = headerInfo.studyInstanceUid || studyUid;
		patientIdFromDicom = headerInfo.patientId;

		const sliceBuffers = await Promise.all(
			validFiles.map(async (f) => ({ name: f.name, buffer: await f.arrayBuffer() })),
		);

		await saveLocalDicomStudy({
			studyInstanceUid: studyUid, seriesUid: headerInfo.seriesUid,
			patientId: patientId || patientIdFromDicom || null, sliceCount: validFiles.length,
			studyDate: headerInfo.studyDate,
			title: headerInfo.patientName ? `КЛКТ — ${headerInfo.patientName}` : `КЛКТ исследование ${studyUid.slice(-8)}`,
			slices: sliceBuffers,
		});
		setSyncBadge({ type: "pending", text: "Сохранено локально на этом ПК • Ожидает синхронизации" });
	} catch (tier1Err) {
		logger.warn("[DicomArchiveUploader] Ошибка сохранения в IndexedDB:", tier1Err);
	}

	const effectivePatientId = patientId || patientIdFromDicom || null;
	if (!uploadToServer) {
		setStatus(`Сохранено локально на этом ПК: ${validFiles.length} срезов`);
		return;
	}

	const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;
	if (!isOnline) {
		setStatus(`Офлайн: сохранено локально (${validFiles.length} срезов). «Ожидает синхронизации»`);
		setSyncBadge({ type: "pending", text: "Сохранено локально на этом ПК • Ожидает синхронизации" });
		showToast(`Офлайн: ${validFiles.length} срезов сохранено в IndexedDB (Ожидает синхронизации)`, "info");
		return;
	}

	setStatus(`Синхронизация с PACS: 0/${validFiles.length} (0%)...`);
	setProgressPercent(0);
	let uploadedCount = 0;
	const failedFiles: File[] = [];
	const total = validFiles.length;
	let uploadIndex = 0;
	const workers = Array.from({ length: Math.min(4, total) }, async () => {
		while (uploadIndex < total) {
			if (!isMounted()) break;
			const taskIdx = uploadIndex++;
			const file = validFiles[taskIdx]!;
			const ok = await uploadDicomFileToStow(file, effectivePatientId, doctorId);
			if (!ok) failedFiles.push(file);
			uploadedCount++;
			if (isMounted()) {
				const pct = Math.round((uploadedCount / total) * 100);
				setProgressPercent(pct);
				setStatus(`Синхронизация с PACS: ${uploadedCount}/${total} (${pct}%)...`);
			}
		}
	});
	await Promise.all(workers);

	if (failedFiles.length > 0) {
		await markStudySyncFailed(studyUid, `Не удалось отправить ${failedFiles.length} из ${total} срезов`);
		setStatus(`Сохранено локально (${validFiles.length} срезов) • Ожидает синхронизации (${failedFiles.length} не отправлено)`);
		setSyncBadge({ type: "pending", text: "Сохранено локально на этом ПК • Ожидает синхронизации" });
		showToast(`Связь нестабильна: ${failedFiles.length} срезов КТ сохранены локально и ожидают отправки`, "warning");
	} else {
		await markStudyAsSynced(studyUid);
		setStatus(`Сохранено локально на этом ПК • Синхронизировано с сервером клиники (${validFiles.length} срезов)`);
		setSyncBadge({ type: "synced", text: "Сохранено локально на этом ПК • Синхронизировано с сервером клиники" });
		showToast(`Исследование (${validFiles.length} срезов) сохранено локально и синхронизировано с сервером`, "success");
	}
}
