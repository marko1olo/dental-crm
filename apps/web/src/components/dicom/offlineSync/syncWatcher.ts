/**
 * syncWatcher.ts — Фоновый наблюдатель и передача отложенных КТ на сервер (Мандат 8b <= 120 строк).
 */

import { logger } from "../../../utils/logger";
import { denteAdminSecretRequestHeaders } from "../../../lib/denteRequestHeaders";
import { listLocalDicomStudies, getLocalDicomSlices } from "./studyReader";
import { markStudyAsSynced, markStudySyncFailed } from "./syncStatusUpdater";

export async function syncPendingStudiesToServer(options?: {
	patientId?: string;
	onProgress?: (synced: number, total: number) => void;
}): Promise<{ syncedStudies: number; syncedSlices: number; errors: string[] }> {
	if (typeof navigator !== "undefined" && navigator.onLine === false) {
		return { syncedStudies: 0, syncedSlices: 0, errors: ["Браузер находится в автономном режиме"] };
	}

	const pendingStudies = await listLocalDicomStudies();
	const toSync = pendingStudies.filter((s) => s.syncStatus === "pending_sync" || s.syncStatus === "sync_failed");
	if (toSync.length === 0) return { syncedStudies: 0, syncedSlices: 0, errors: [] };

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
						headers: denteAdminSecretRequestHeaders({ "Content-Type": "application/dicom" }),
						body: slice.buffer,
					});
					if (res.ok) syncedSlices++;
					else failedInStudy++;
				} catch {
					failedInStudy++;
				}
				options?.onProgress?.(syncedSlices, slices.length);
			}

			if (failedInStudy === 0) {
				await markStudyAsSynced(study.studyInstanceUid);
				syncedStudies++;
			} else {
				await markStudySyncFailed(study.studyInstanceUid, `Не удалось отправить ${failedInStudy} из ${slices.length}`);
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

export function startDicomOfflineSyncWatcher(): () => void {
	if (typeof window === "undefined") return () => {};
	if (syncWatcherInitialized) return () => {};
	syncWatcherInitialized = true;

	const handleOnline = () => {
		logger.info("[dicomOfflineSync] Сеть восстановлена. Запуск фоновой синхронизации...");
		syncPendingStudiesToServer().catch((err) => {
			logger.warn("[dicomOfflineSync] Ошибка синхронизации:", err);
		});
	};

	window.addEventListener("online", handleOnline);
	return () => {
		syncWatcherInitialized = false;
		window.removeEventListener("online", handleOnline);
	};
}
