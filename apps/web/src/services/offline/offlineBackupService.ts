/**
 * DENTE CRM — Autonomous Local Backup & Encryption Service (.dente)
 *
 * 1-клик экспорт и импорт зашифрованных локальных бэкапов клиники без сервера:
 * - Сбор всех неотправленных мутаций, черновиков (043/у, одонтограмма) и кэша пациентов
 * - Шифрование и криптографическая подпись SHA-256 (DENTE_ENCRYPTED_BACKUP_V1)
 * - Автоматическое скачивание файла .dente в браузере или через Desktop Native API
 * - Безопасное восстановление данных с валидацией контрольных сумм
 */

import {
	DEFAULT_DENTE_BACKUP_PASSPHRASE,
	type DenteBackupHeader,
	type DenteBackupPayload,
	type DenteBackupValidationResult,
	createEncryptedDenteBackup,
	restoreEncryptedDenteBackup,
	validateDenteBackupContainer,
} from "@dental/shared";
import { logger } from "../../utils/logger";
import {
	CLINICAL_CACHE_STORE_NAME,
	DRAFTS_STORE_NAME,
	MUTATIONS_STORE_NAME,
	listOfflineDrafts,
	listPatientClinicalCache,
	openOfflineOutboxDb,
	saveOfflineDraft,
	savePatientClinicalCache,
	withIdbTransactionRetry,
} from "./offlineStorage";
import type { OfflineDraft, OfflineMutation } from "./types";

export interface ExportBackupOptions {
	passphrase?: string | undefined;
	organizationId?: string | undefined;
	filename?: string | undefined;
	autoDownload?: boolean | undefined;
	meta?: DenteBackupPayload["meta"] | undefined;
}

export interface ExportBackupResult {
	backupString: string;
	filename: string;
	header: DenteBackupHeader;
	stats: {
		mutations: number;
		drafts: number;
		clinicalCache: number;
	};
}

export interface RestoreBackupResult {
	success: boolean;
	header: DenteBackupHeader;
	restoredCount: {
		mutations: number;
		drafts: number;
		clinicalCache: number;
	};
	errors: string[];
}

/**
 * Инициирует скачивание файла в браузере
 */
export function downloadDenteFile(content: string, filename: string): void {
	if (typeof window === "undefined" || typeof document === "undefined") return;

	// Check if Desktop Windows Native Bridge supports save dialog
	const desktopNative = (window as any).denteDesktopNative;
	if (desktopNative?.saveLocalBackupFile) {
		desktopNative.saveLocalBackupFile(content, filename).catch((err: any) => {
			logger.warn("[OfflineBackup] Desktop native save failed, falling back to browser download", err);
			browserBlobDownload(content, filename);
		});
		return;
	}

	browserBlobDownload(content, filename);
}

function browserBlobDownload(content: string, filename: string): void {
	try {
		const blob = new Blob([content], { type: "application/x-dente-backup;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = filename;
		anchor.style.display = "none";
		document.body.appendChild(anchor);
		anchor.click();
		setTimeout(() => {
			document.body.removeChild(anchor);
			URL.revokeObjectURL(url);
		}, 2000);
	} catch (err) {
		logger.error("[OfflineBackup] Failed to trigger browser file download", err);
	}
}

/**
 * 1-клик экспорт локальной базы клиники в зашифрованный файл `.dente`
 */
export async function exportOfflineClinicBackup(
	options?: ExportBackupOptions,
): Promise<ExportBackupResult> {
	const orgId = options?.organizationId;
	const passphrase = options?.passphrase || DEFAULT_DENTE_BACKUP_PASSPHRASE;

	// 1. Сбор всех мутаций из IndexedDB
	let mutations: OfflineMutation[] = [];
	try {
		mutations = await withIdbTransactionRetry(async (db) => {
			return new Promise<OfflineMutation[]>((resolve, reject) => {
				const tx = db.transaction(MUTATIONS_STORE_NAME, "readonly");
				const store = tx.objectStore(MUTATIONS_STORE_NAME);
				const req = store.getAll();
				req.onsuccess = () => resolve((req.result as OfflineMutation[]) || []);
				req.onerror = () => reject(req.error);
			});
		});
	} catch (err) {
		logger.warn("[OfflineBackup] Could not read all mutations from IDB, using partial state", err);
	}

	// 2. Сбор всех черновиков
	let drafts: OfflineDraft[] = [];
	try {
		drafts = await listOfflineDrafts({ organizationId: orgId });
	} catch (err) {
		logger.warn("[OfflineBackup] Could not list drafts", err);
	}

	// 3. Сбор всех закэшированных данных пациентов
	let clinicalCache: any[] = [];
	try {
		clinicalCache = await listPatientClinicalCache(undefined, orgId);
	} catch (err) {
		logger.warn("[OfflineBackup] Could not list clinical cache", err);
	}

	const payload: DenteBackupPayload = {
		mutations,
		drafts,
		clinicalCache,
		meta: options?.meta || {
			notes: "Автономный 1-клик бэкап DENTE CRM",
		},
	};

	const backupString = createEncryptedDenteBackup(payload, {
		organizationId: orgId,
		passphrase,
		appVersion: "0.1.0",
		meta: payload.meta,
	});

	const validation = validateDenteBackupContainer(backupString);
	if (!validation.valid || !validation.header) {
		throw new Error(validation.error || "Сбой верификации созданного бэкапа");
	}

	const dateIso = new Date().toISOString().replace(/[:.]/g, "-");
	const orgPart = orgId ? `_${orgId.substring(0, 8)}` : "";
	const filename = options?.filename || `dente_local_backup_${dateIso}${orgPart}.dente`;

	if (options?.autoDownload !== false) {
		downloadDenteFile(backupString, filename);
	}

	return {
		backupString,
		filename,
		header: validation.header,
		stats: validation.header.itemsCount,
	};
}

/**
 * Валидация файла бэкапа
 */
export function inspectDenteBackup(rawBackupText: string): DenteBackupValidationResult {
	return validateDenteBackupContainer(rawBackupText);
}

/**
 * Восстановление локальной базы из файла `.dente`
 */
export async function importOfflineClinicBackup(
	rawBackupText: string,
	options?: {
		passphrase?: string | undefined;
		overwrite?: boolean | undefined;
	},
): Promise<RestoreBackupResult> {
	const passphrase = options?.passphrase || DEFAULT_DENTE_BACKUP_PASSPHRASE;
	const { header, payload } = restoreEncryptedDenteBackup<OfflineMutation, OfflineDraft, any>(
		rawBackupText,
		passphrase,
	);

	const errors: string[] = [];
	let restoredMutations = 0;
	let restoredDrafts = 0;
	let restoredCache = 0;

	// 1. Восстановление мутаций
	if (payload.mutations && payload.mutations.length > 0) {
		try {
			await withIdbTransactionRetry(async (db) => {
				return new Promise<void>((resolve, reject) => {
					const tx = db.transaction(MUTATIONS_STORE_NAME, "readwrite");
					const store = tx.objectStore(MUTATIONS_STORE_NAME);
					for (const mutation of payload.mutations || []) {
						store.put(mutation);
						restoredMutations++;
					}
					tx.oncomplete = () => resolve();
					tx.onerror = () => reject(tx.error);
				});
			});
		} catch (err) {
			logger.warn("[OfflineBackup] Could not write mutations to IDB during import", err);
		}
	}

	// 2. Восстановление черновиков
	for (const draft of payload.drafts || []) {
		try {
			await saveOfflineDraft(
				draft.draftKey,
				draft.entityType,
				draft.entityId,
				draft.data,
				draft.organizationId,
			);
			restoredDrafts++;
		} catch (err) {
			errors.push(`Ошибка восстановления черновика ${draft.draftKey}`);
		}
	}

	// 3. Восстановление кэша пациентов
	for (const cacheItem of payload.clinicalCache || []) {
		try {
			await savePatientClinicalCache(
				cacheItem.cacheKey,
				cacheItem.entityKind,
				cacheItem.entityId,
				cacheItem.data,
				cacheItem.organizationId,
			);
			restoredCache++;
		} catch (err) {
			errors.push(`Ошибка восстановления записи кэша ${cacheItem.cacheKey}`);
		}
	}

	return {
		success: errors.length === 0,
		header,
		restoredCount: {
			mutations: restoredMutations,
			drafts: restoredDrafts,
			clinicalCache: restoredCache,
		},
		errors,
	};
}
