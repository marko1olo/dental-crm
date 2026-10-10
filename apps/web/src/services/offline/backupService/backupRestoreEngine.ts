/**
 * DENTE CRM — Offline Backup Restore Engine
 * Layer 3: Archive Verification, Decryption & Atomic Restoration into IndexedDB
 */

import {
	DEFAULT_DENTE_BACKUP_PASSPHRASE,
	restoreEncryptedDenteBackup,
} from "@dental/shared";
import { logger } from "../../../utils/logger";
import {
	MUTATIONS_STORE_NAME,
	cacheActiveSchedule,
	cacheIcd10Dictionary,
	cacheOdontogramState,
	cachePatientCard,
	cachePriceList804n,
	flushBatchedStoreWrites,
	getLocalStorageMutations,
	saveLocalStorageMutations,
	saveOfflineDraft,
	savePatientClinicalCache,
	withIdbTransactionRetry,
} from "../offlineStorage";
import type {
	CachedActiveSchedule,
	CachedClinicalItem,
	CachedIcd10Dictionary,
	CachedOdontogram,
	CachedPatientCard,
	CachedPriceList804n,
	OfflineDraft,
	OfflineMutation,
	RestoreBackupResult,
} from "./types.js";

/**
 * Восстановление локальной базы клиники из файла `.dente`
 */
export async function importOfflineClinicBackup(
	rawBackupText: string,
	options?: {
		passphrase?: string | undefined;
		overwrite?: boolean | undefined;
	},
): Promise<RestoreBackupResult> {
	const passphrase = options?.passphrase || DEFAULT_DENTE_BACKUP_PASSPHRASE;
	const { header, payload } = restoreEncryptedDenteBackup(
		rawBackupText,
		passphrase,
	);

	const errors: string[] = [];
	let restoredMutations = 0;
	let restoredDrafts = 0;
	let restoredCache = 0;
	let restoredSchedules = 0;
	let restoredPatients = 0;
	let restoredOdontograms = 0;
	let restoredPricelists = 0;
	let restoredIcd10 = 0;

	// 1. Восстановление мутаций
	if (payload.mutations && payload.mutations.length > 0) {
		try {
			await withIdbTransactionRetry(async (db) => {
				return new Promise<void>((resolve, reject) => {
					const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
					const store = tx.objectStore(MUTATIONS_STORE_NAME);
					for (const mutation of (payload.mutations as OfflineMutation[]) || []) {
						store.put(mutation);
						restoredMutations++;
					}
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
				});
			});
		} catch (err) {
			logger.warn("[OfflineBackup] Could not write mutations to IDB during import, falling back to localStorage", err);
			try {
				const current = getLocalStorageMutations();
				const currentMap = new Map(current.map((m) => [m.mutationId, m]));
				for (const mutation of (payload.mutations as OfflineMutation[]) || []) {
					currentMap.set(mutation.mutationId, mutation);
					restoredMutations++;
				}
				saveLocalStorageMutations(Array.from(currentMap.values()));
				logger.info(`[OfflineBackup] Successfully restored ${payload.mutations.length} mutations to localStorage fallback`);
			} catch (fallbackErr) {
				logger.error("[OfflineBackup] LocalStorage mutation restore fallback failed", fallbackErr);
				errors.push("Сбой восстановления очереди мутаций");
			}
		}
	}

	// 2. Восстановление черновиков
	for (const draft of (payload.drafts as OfflineDraft[]) || []) {
		try {
			await saveOfflineDraft(
				draft.draftKey,
				draft.entityType,
				draft.entityId,
				draft.data,
				draft.organizationId,
			);
			restoredDrafts++;
		} catch {
			errors.push(`Ошибка восстановления черновика ${draft.draftKey}`);
		}
	}

	// 3. Восстановление кэша пациентов и клинических форм
	for (const cacheItem of (payload.clinicalCache as Array<CachedClinicalItem>) || []) {
		try {
			await savePatientClinicalCache(
				cacheItem.cacheKey,
				cacheItem.entityKind,
				cacheItem.entityId,
				cacheItem.data,
				cacheItem.organizationId,
			);
			restoredCache++;
		} catch {
			errors.push(`Ошибка восстановления записи кэша ${cacheItem.cacheKey}`);
		}
	}

	// 4. Восстановление расписаний
	for (const schedule of (payload.schedules as CachedActiveSchedule[]) || []) {
		try {
			await cacheActiveSchedule({
				scheduleKey: schedule.scheduleKey,
				date: schedule.date,
				organizationId: schedule.organizationId,
				appointments: schedule.appointments,
			});
			restoredSchedules++;
		} catch {
			errors.push(`Ошибка восстановления расписания на ${schedule.date}`);
		}
	}

	// 5. Восстановление карточек пациентов
	for (const patient of (payload.patients as CachedPatientCard[]) || []) {
		try {
			await cachePatientCard({
				patientId: patient.patientId,
				organizationId: patient.organizationId,
				personalInfo: patient.personalInfo,
				card043: patient.card043,
				odontogram: patient.odontogram,
			});
			restoredPatients++;
		} catch {
			errors.push(`Ошибка восстановления карточки пациента ${patient.patientId}`);
		}
	}

	// 6. Восстановление одонтограмм
	for (const odo of (payload.odontograms as CachedOdontogram[]) || []) {
		try {
			await cacheOdontogramState({
				patientId: odo.patientId,
				organizationId: odo.organizationId,
				teeth: odo.teeth,
				adultMode: odo.adultMode,
			});
			restoredOdontograms++;
		} catch {
			errors.push(`Ошибка восстановления одонтограммы пациента ${odo.patientId}`);
		}
	}

	// 7. Восстановление прайс-листов
	for (const plist of (payload.pricelists as CachedPriceList804n[]) || []) {
		try {
			await cachePriceList804n(
				plist.items,
				plist.organizationId,
				plist.version,
			);
			restoredPricelists++;
		} catch {
			errors.push("Ошибка восстановления прейскуранта услуг");
		}
	}

	// 8. Восстановление справочника МКБ-10
	for (const dict of (payload.icd10 as CachedIcd10Dictionary[]) || []) {
		try {
			await cacheIcd10Dictionary(
				dict.items,
				dict.dictionaryKey,
			);
			restoredIcd10++;
		} catch {
			errors.push("Ошибка восстановления справочника МКБ-10");
		}
	}

	// 9. Гарантированный сброс всех пакетных записей, сформированных при импорте
	await flushBatchedStoreWrites();

	return {
		success: errors.length === 0,
		header,
		restoredCount: {
			mutations: restoredMutations,
			drafts: restoredDrafts,
			clinicalCache: restoredCache,
			schedules: restoredSchedules,
			patients: restoredPatients,
			odontograms: restoredOdontograms,
			pricelists: restoredPricelists,
			icd10: restoredIcd10,
		},
		errors,
	};
}
