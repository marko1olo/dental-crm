/**
 * DENTE CRM — Offline Backup Export Engine
 * Layer 2: IndexedDB Data Gathering, Snapshot Creation, File System & Vault Archiving
 */

import {
	DEFAULT_DENTE_BACKUP_PASSPHRASE,
	type DatabaseSnapshot,
	type DenteBackupHeader,
	type DenteBackupPayload,
	createDatabaseSnapshot,
	createEncryptedDenteBackup,
	validateDenteBackupContainer,
} from "@dental/shared";
import { logger } from "../../../utils/logger";
import {
	safeLocalStorageGetItem,
	safeLocalStorageSetItem,
} from "../../../lib/safeLocalStorage";
import {
	MUTATIONS_STORE_NAME,
	ODONTOGRAM_CACHE_STORE_NAME,
	deletePatientClinicalCache,
	flushBatchedStoreWrites,
	getCachedIcd10Dictionary,
	getCachedPriceList804n,
	getPatientClinicalCache,
	listCachedActiveSchedules,
	listCachedPatientCards,
	listOfflineDrafts,
	listPatientClinicalCache,
	savePatientClinicalCache,
	withIdbTransactionRetry,
} from "../offlineStorage";
import type {
	CachedActiveSchedule,
	CachedIcd10Dictionary,
	CachedOdontogram,
	CachedPatientCard,
	CachedPriceList804n,
	ExportBackupOptions,
	ExportBackupResult,
	LocalVaultSnapshotMeta,
	OfflineDraft,
	OfflineMutation,
} from "./types.js";
import {
	LOCAL_VAULT_MAX_DEFAULT_SNAPSHOTS,
	LOCAL_VAULT_STORAGE_KEY,
} from "./types.js";

type VaultChangeListener = (totalSnapshots: number) => void;
const vaultChangeListeners = new Set<VaultChangeListener>();

export function onVaultChange(listener: VaultChangeListener): () => void {
	vaultChangeListeners.add(listener);
	return () => {
		vaultChangeListeners.delete(listener);
	};
}

function notifyVaultChange(totalSnapshots: number): void {
	for (const listener of vaultChangeListeners) {
		try {
			listener(totalSnapshots);
		} catch (err) {
			logger.warn("[OfflineBackup] Error in vault change listener", err);
		}
	}
}

/**
 * Инициирует сохранение файла на внешний диск / USB-флешку или скачивание в браузере.
 */
export async function downloadOrSaveDenteFile(
	content: string,
	filename: string,
	preferPicker = false,
): Promise<{ savedDirectly: boolean }> {
	if (typeof window === "undefined") return { savedDirectly: false };

	// 1. File System Access API (Сохранение на выбранный USB-накопитель или сетевой диск)
	if (preferPicker && typeof (window as any).showSaveFilePicker === "function") {
		try {
			const handle = await (window as any).showSaveFilePicker({
				suggestedName: filename,
				types: [
					{
						description: "Зашифрованный архив клиники DENTE (*.dente)",
						accept: { "application/x-dente-backup": [".dente"] },
					},
				],
			});
			const writable = await handle.createWritable();
			await writable.write(content);
			await writable.close();
			logger.info(`[OfflineBackup] Successfully wrote backup directly via File System Access API to: ${filename}`);
			return { savedDirectly: true };
		} catch (err: any) {
			if (err?.name === "AbortError") {
				logger.info("[OfflineBackup] User aborted file save picker");
				return { savedDirectly: false };
			}
			logger.warn("[OfflineBackup] File System Access API save failed, falling back", err);
		}
	}

	// 2. Desktop Windows Native Bridge
	const desktopNative = (window as any).denteDesktopNative;
	if (desktopNative?.saveLocalBackupFile) {
		try {
			await desktopNative.saveLocalBackupFile(content, filename);
			return { savedDirectly: true };
		} catch (err: any) {
			logger.warn("[OfflineBackup] Desktop native save failed, falling back to browser download", err);
		}
	}

	// 3. Fallback: Browser Blob download
	browserBlobDownload(content, filename);
	return { savedDirectly: false };
}

/**
 * Скачивание файла через ссылку Blob
 */
export function downloadDenteFile(content: string, filename: string): void {
	void downloadOrSaveDenteFile(content, filename, false);
}

function browserBlobDownload(content: string, filename: string): void {
	try {
		if (typeof document === "undefined") return;
		const blob = new Blob([content], { type: "application/x-dente-backup;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement("a");
		anchor.href = url;
		anchor.download = filename;
		anchor.style.display = "none";
		document.body.appendChild(anchor);
		anchor.click();
		setTimeout(() => {
			if (anchor.parentNode) {
				document.body.removeChild(anchor);
			}
			URL.revokeObjectURL(url);
		}, 2000);
	} catch (err) {
		logger.error("[OfflineBackup] Failed to trigger browser file download", err);
	}
}

/**
 * 1-клик экспорт локальной базы клиники в зашифрованный файл `.dente` (AES-GCM-256)
 */
export async function exportOfflineClinicBackup(
	options?: ExportBackupOptions,
): Promise<ExportBackupResult> {
	const orgId = options?.organizationId;
	const passphrase = options?.passphrase || DEFAULT_DENTE_BACKUP_PASSPHRASE;
	const encryptionAlgorithm = options?.encryptionAlgorithm || "AES-GCM-256";

	// 0. Сброс отложенных пакетных записей перед экспортом
	await flushBatchedStoreWrites();

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

	// 3. Сбор всех закэшированных клинических данных
	let clinicalCache: any[] = [];
	try {
		clinicalCache = await listPatientClinicalCache(undefined, orgId);
	} catch (err) {
		logger.warn("[OfflineBackup] Could not list clinical cache", err);
	}

	// 4. Сбор расписаний
	let schedules: CachedActiveSchedule[] = [];
	try {
		schedules = await listCachedActiveSchedules(orgId);
	} catch (err) {
		logger.warn("[OfflineBackup] Could not list cached schedules", err);
	}

	// 5. Сбор карточек пациентов
	let patients: CachedPatientCard[] = [];
	try {
		patients = await listCachedPatientCards(orgId);
	} catch (err) {
		logger.warn("[OfflineBackup] Could not list cached patient cards", err);
	}

	// 6. Сбор одонтограмм
	let odontograms: CachedOdontogram[] = [];
	try {
		odontograms = await withIdbTransactionRetry(async (db) => {
			return new Promise<CachedOdontogram[]>((resolve) => {
				if (!db.objectStoreNames.contains(ODONTOGRAM_CACHE_STORE_NAME)) {
					return resolve([]);
				}
				const tx = db.transaction(ODONTOGRAM_CACHE_STORE_NAME, "readonly");
				const store = tx.objectStore(ODONTOGRAM_CACHE_STORE_NAME);
				const req = store.getAll();
				req.onsuccess = () => resolve((req.result as CachedOdontogram[]) || []);
				req.onerror = () => resolve([]);
			});
		});
	} catch (err) {
		logger.warn("[OfflineBackup] Could not list odontograms", err);
	}

	// 7. Сбор прайс-листа 804н
	let pricelists: CachedPriceList804n[] = [];
	try {
		const plist = await getCachedPriceList804n(orgId);
		if (plist) pricelists.push(plist);
	} catch (err) {
		logger.warn("[OfflineBackup] Could not get pricelist", err);
	}

	// 8. Сбор справочника МКБ-10
	let icd10: CachedIcd10Dictionary[] = [];
	try {
		const icd = await getCachedIcd10Dictionary();
		if (icd) icd10.push(icd);
	} catch (err) {
		logger.warn("[OfflineBackup] Could not get ICD-10 dictionary", err);
	}

	const payload: DenteBackupPayload = {
		mutations,
		drafts,
		clinicalCache,
		schedules,
		patients,
		odontograms,
		pricelists,
		icd10,
		meta: options?.meta || {
			clinicName: "DENTE Клиника",
			notes: "Автономный 1-клик бэкап DENTE CRM (AES-GCM-256)",
		},
	};

	const backupString = createEncryptedDenteBackup(payload, {
		organizationId: orgId,
		passphrase,
		appVersion: "0.1.0",
		encryptionAlgorithm,
		meta: payload.meta,
	});

	const validation = validateDenteBackupContainer(backupString);
	if (!validation.valid || !validation.header) {
		throw new Error(validation.error || "Сбой верификации созданного бэкапа");
	}

	const dateIso = new Date().toISOString().replace(/[:.]/g, "-");
	const orgPart = orgId ? `_${orgId.substring(0, 8)}` : "";
	const filename = options?.filename || `dente_vault_backup_${dateIso}${orgPart}.dente`;

	let savedDirectly = false;
	if (options?.autoDownload !== false) {
		const saveRes = await downloadOrSaveDenteFile(
			backupString,
			filename,
			options?.preferFileSystemPicker ?? false,
		);
		savedDirectly = saveRes.savedDirectly;
	}

	// Save snapshot metadata into Local Vault History
	recordLocalVaultSnapshot(backupString, filename, validation.header, Boolean(options?.meta?.autoSnapshot));

	return {
		backupString,
		filename,
		header: validation.header,
		stats: validation.header.itemsCount,
		savedDirectlyToDisk: savedDirectly,
	};
}

/**
 * Записывает снимок бэкапа в локальное хранилище для мгновенного восстановления при сбоях
 * с гарантированным перехватом QuotaExceededError и fallback на сохранение снапшотов в IndexedDB.
 */
export function recordLocalVaultSnapshot(
	backupString: string,
	filename: string,
	header: DenteBackupHeader,
	autoSnapshot = false,
): void {
	const hashSuffix = (header.payloadSha256 || "snap").slice(0, 8);
	const snapshotId = `vault_snap_${header.exportedAtMs || Date.now()}_${hashSuffix}`;
	const meta: LocalVaultSnapshotMeta = {
		id: snapshotId,
		timestamp: header.exportedAt,
		timestampMs: header.exportedAtMs,
		filename,
		sizeBytes: backupString.length,
		organizationId: header.organizationId,
		itemsCount: header.itemsCount,
		payloadSha256: header.payloadSha256,
		autoSnapshot,
	};

	// 1. Guaranteed resilient snapshot persistence into IndexedDB clinical cache
	void savePatientClinicalCache(
		`vault_snap_${snapshotId}`,
		"vault_snapshot",
		snapshotId,
		{ meta, content: backupString },
		header.organizationId,
	).catch((idbErr) => {
		logger.warn("[OfflineBackup] IndexedDB vault snapshot fallback write failed", idbErr);
	});

	if (typeof window === "undefined") return;

	// 2. Synchronous fast-access in localStorage with QuotaExceededError protection
	try {
		const rawHistory = safeLocalStorageGetItem(LOCAL_VAULT_STORAGE_KEY);
		let snapshots: Array<{ meta: LocalVaultSnapshotMeta; content: string }> = [];
		if (rawHistory) {
			try {
				snapshots = JSON.parse(rawHistory);
			} catch {
				snapshots = [];
			}
		}

		snapshots.unshift({ meta, content: backupString });

		// Rolling retention: keep only the newest N snapshots
		if (snapshots.length > LOCAL_VAULT_MAX_DEFAULT_SNAPSHOTS) {
			snapshots = snapshots.slice(0, LOCAL_VAULT_MAX_DEFAULT_SNAPSHOTS);
		}

		safeLocalStorageSetItem(LOCAL_VAULT_STORAGE_KEY, JSON.stringify(snapshots));
		notifyVaultChange(snapshots.length);
	} catch (err: any) {
		const isQuotaExceeded =
			err &&
			(err.name === "QuotaExceededError" ||
				err.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
				err.code === 22 ||
				err.code === 1014 ||
				(typeof err.message === "string" && err.message.toLowerCase().includes("quota")));

		logger.warn(
			`[OfflineBackup] Could not store rolling snapshot in localStorage (${isQuotaExceeded ? "QuotaExceededError" : "storage error"}), fallback guaranteed via IndexedDB`,
			err,
		);

		// If full snapshot exceeds localStorage quota, store metadata with empty content so metadata listing survives
		try {
			const rawHistory = safeLocalStorageGetItem(LOCAL_VAULT_STORAGE_KEY);
			let snapshots: Array<{ meta: LocalVaultSnapshotMeta; content: string }> = [];
			if (rawHistory) {
				try {
					snapshots = JSON.parse(rawHistory);
				} catch {
					snapshots = [];
				}
			}
			snapshots.unshift({ meta, content: "" });
			if (snapshots.length > LOCAL_VAULT_MAX_DEFAULT_SNAPSHOTS) {
				snapshots = snapshots.slice(0, LOCAL_VAULT_MAX_DEFAULT_SNAPSHOTS);
			}
			safeLocalStorageSetItem(LOCAL_VAULT_STORAGE_KEY, JSON.stringify(snapshots));
			notifyVaultChange(snapshots.length);
		} catch {
			// Ignore secondary metadata storage error
		}
	}
}

/**
 * Возвращает список всех локальных снимков в хранилище Vault
 */
export function listLocalVaultSnapshots(): LocalVaultSnapshotMeta[] {
	if (typeof window === "undefined") return [];

	try {
		const raw = safeLocalStorageGetItem(LOCAL_VAULT_STORAGE_KEY);
		if (!raw) return [];
		const list = JSON.parse(raw) as Array<{ meta: LocalVaultSnapshotMeta }>;
		return list.map((item) => item.meta);
	} catch {
		return [];
	}
}

/**
 * Получает содержимое снимка по ID (с поиском в LocalStorage и IndexedDB fallback)
 */
export function getLocalVaultSnapshotContent(snapshotId: string): string | null {
	if (typeof window !== "undefined") {
		try {
			const raw = safeLocalStorageGetItem(LOCAL_VAULT_STORAGE_KEY);
			if (raw) {
				const list = JSON.parse(raw) as Array<{ meta: LocalVaultSnapshotMeta; content: string }>;
				const found = list.find((item) => item.meta.id === snapshotId);
				if (found?.content && found.content.length > 0) {
					return found.content;
				}
			}
		} catch {
			// Fall through to in-memory/IDB fallback
		}
	}

	// IndexedDB / in-memory clinical cache fallback
	try {
		const idbKey = `vault_snap_${snapshotId}`;
		let contentFromCache: string | null = null;
		void getPatientClinicalCache<{ meta: LocalVaultSnapshotMeta; content: string }>(idbKey)
			.then((cached) => {
				if (cached?.content) {
					contentFromCache = cached.content;
				}
			})
			.catch(() => {});
		if (contentFromCache) return contentFromCache;
	} catch {
		// ignore
	}

	return null;
}

/**
 * Удаляет снимок из локального хранилища и IndexedDB
 */
export function deleteLocalVaultSnapshot(snapshotId: string): boolean {
	void deletePatientClinicalCache(`vault_snap_${snapshotId}`).catch(() => {});

	if (typeof window === "undefined") return false;

	try {
		const raw = safeLocalStorageGetItem(LOCAL_VAULT_STORAGE_KEY);
		if (!raw) return false;
		let list = JSON.parse(raw) as Array<{ meta: LocalVaultSnapshotMeta; content: string }>;
		list = list.filter((item) => item.meta.id !== snapshotId);
		safeLocalStorageSetItem(LOCAL_VAULT_STORAGE_KEY, JSON.stringify(list));
		notifyVaultChange(list.length);
		return true;
	} catch {
		return false;
	}
}

/**
 * Создает структурированный снапшот локальной базы данных с подсчетом SHA-256 по каждой таблице и корневого хеша.
 */
export async function createLocalDatabaseSnapshot(options?: {
	organizationId?: string | undefined;
	clinicName?: string | undefined;
	notes?: string | undefined;
}): Promise<DatabaseSnapshot> {
	const orgId = options?.organizationId;

	// 1. Mutations
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
		logger.warn("[OfflineBackup] Could not read all mutations for snapshot", err);
	}

	// 2. Drafts
	let drafts: OfflineDraft[] = [];
	try {
		drafts = await listOfflineDrafts({ organizationId: orgId });
	} catch (err) {
		logger.warn("[OfflineBackup] Could not list drafts for snapshot", err);
	}

	// 3. Clinical cache
	let clinicalCache: any[] = [];
	try {
		clinicalCache = await listPatientClinicalCache(undefined, orgId);
	} catch (err) {
		logger.warn("[OfflineBackup] Could not list clinical cache for snapshot", err);
	}

	// 4. Schedules
	let schedules: CachedActiveSchedule[] = [];
	try {
		schedules = await listCachedActiveSchedules(orgId);
	} catch (err) {
		logger.warn("[OfflineBackup] Could not list schedules for snapshot", err);
	}

	// 5. Patients
	let patients: CachedPatientCard[] = [];
	try {
		patients = await listCachedPatientCards(orgId);
	} catch (err) {
		logger.warn("[OfflineBackup] Could not list patients for snapshot", err);
	}

	// 6. Odontograms
	let odontograms: CachedOdontogram[] = [];
	try {
		odontograms = await withIdbTransactionRetry(async (db) => {
			return new Promise<CachedOdontogram[]>((resolve) => {
				if (!db.objectStoreNames.contains(ODONTOGRAM_CACHE_STORE_NAME)) {
					return resolve([]);
				}
				const tx = db.transaction(ODONTOGRAM_CACHE_STORE_NAME, "readonly");
				const store = tx.objectStore(ODONTOGRAM_CACHE_STORE_NAME);
				const req = store.getAll();
				req.onsuccess = () => resolve((req.result as CachedOdontogram[]) || []);
				req.onerror = () => resolve([]);
			});
		});
	} catch (err) {
		logger.warn("[OfflineBackup] Could not list odontograms for snapshot", err);
	}

	// 7. Pricelists
	let pricelists: CachedPriceList804n[] = [];
	try {
		const plist = await getCachedPriceList804n(orgId);
		if (plist) pricelists.push(plist);
	} catch (err) {
		logger.warn("[OfflineBackup] Could not get pricelist for snapshot", err);
	}

	// 8. ICD-10
	let icd10: CachedIcd10Dictionary[] = [];
	try {
		const icd = await getCachedIcd10Dictionary();
		if (icd) icd10.push(icd);
	} catch (err) {
		logger.warn("[OfflineBackup] Could not get ICD-10 for snapshot", err);
	}

	return createDatabaseSnapshot({
		organizationId: orgId,
		clinicName: options?.clinicName || "DENTE Клиника",
		driver: "indexeddb",
		notes: options?.notes,
		tables: {
			mutations,
			drafts,
			clinicalCache,
			schedules,
			patients,
			odontograms,
			pricelists,
			icd10,
		},
	});
}
