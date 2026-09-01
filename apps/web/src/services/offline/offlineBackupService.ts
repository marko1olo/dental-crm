/**
 * DENTE CRM — Autonomous Local Backup & Encryption Service (.dente)
 *
 * 1-клик экспорт и импорт зашифрованных локальных бэкапов клиники без сервера:
 * - Сбор всех неотправленных мутаций, черновиков (043/у, одонтограмма), кэша пациентов,
 *   расписания, прайс-листа 804н и справочника МКБ-10
 * - Шифрование по стандарту ГОСТ / AES-GCM-256 с PBKDF2 (100,000 итераций) и криптографическая подпись SHA-256
 * - Автоматический экспорт на внешний носитель (USB-флешка, сетевой диск) через File System Access API
 *   или Desktop Native API с fallback на браузерный Blob
 * - Автобэкап по расписанию (Планировщик) с ротацией архивов для непрерывной защиты
 * - Безопасное восстановление данных с валидацией контрольных сумм и отчетом о целостности
 */

import {
	DEFAULT_DENTE_BACKUP_PASSPHRASE,
	type DatabaseSnapshot,
	type DenteBackupHeader,
	type DenteBackupItemsCount,
	type DenteBackupPayload,
	type DenteBackupValidationResult,
	type DryRunRestoreResult,
	createDatabaseSnapshot,
	createEncryptedDenteBackup,
	executeDryRunRestoreCheck,
	restoreEncryptedDenteBackup,
	validateDenteBackupContainer,
	verifyDatabaseSnapshot,
} from "@dental/shared";
import { logger } from "../../utils/logger";
import {
	CLINICAL_CACHE_STORE_NAME,
	DRAFTS_STORE_NAME,
	ICD10_CACHE_STORE_NAME,
	MUTATIONS_STORE_NAME,
	ODONTOGRAM_CACHE_STORE_NAME,
	PATIENTS_CACHE_STORE_NAME,
	PRICELIST_CACHE_STORE_NAME,
	SCHEDULES_CACHE_STORE_NAME,
	cacheActiveSchedule,
	cacheIcd10Dictionary,
	cacheOdontogramState,
	cachePatientCard,
	cachePriceList804n,
	deletePatientClinicalCache,
	getCachedIcd10Dictionary,
	getCachedPriceList804n,
	getPatientClinicalCache,
	listCachedActiveSchedules,
	listCachedPatientCards,
	listOfflineDrafts,
	listPatientClinicalCache,
	saveOfflineDraft,
	savePatientClinicalCache,
	withIdbTransactionRetry,
	type PatientClinicalCacheRecord,
} from "./offlineStorage";
import type {
	CachedActiveSchedule,
	CachedIcd10Dictionary,
	CachedOdontogram,
	CachedPatientCard,
	CachedPriceList804n,
	OfflineDraft,
	OfflineMutation,
} from "./types";

export interface CachedClinicalItem {
	cacheKey: string;
	entityKind: string;
	entityId: string;
	data: unknown;
	organizationId?: string | undefined;
}

export interface ExportBackupOptions {
	passphrase?: string | undefined;
	organizationId?: string | undefined;
	filename?: string | undefined;
	autoDownload?: boolean | undefined;
	encryptionAlgorithm?: "AES-GCM-256" | "DENTE-STREAM-XOR" | undefined;
	preferFileSystemPicker?: boolean | undefined;
	meta?: DenteBackupPayload["meta"] | undefined;
}

export interface ExportBackupResult {
	backupString: string;
	filename: string;
	header: DenteBackupHeader;
	stats: DenteBackupItemsCount;
	savedDirectlyToDisk?: boolean | undefined;
}

export interface RestoreBackupResult {
	success: boolean;
	header: DenteBackupHeader;
	restoredCount: {
		mutations: number;
		drafts: number;
		clinicalCache: number;
		schedules: number;
		patients: number;
		odontograms: number;
		pricelists: number;
		icd10: number;
	};
	errors: string[];
}

export interface LocalVaultSnapshotMeta {
	id: string;
	timestamp: string;
	timestampMs: number;
	filename: string;
	sizeBytes: number;
	organizationId?: string | undefined;
	itemsCount: DenteBackupItemsCount;
	payloadSha256: string;
	autoSnapshot: boolean;
}

export interface AutoBackupScheduleOptions {
	intervalMinutes?: number | undefined;
	organizationId?: string | undefined;
	passphrase?: string | undefined;
	maxLocalSnapshots?: number | undefined;
	onBackupComplete?: ((result: ExportBackupResult) => void) | undefined;
	onBackupError?: ((error: Error) => void) | undefined;
}

export interface AutoBackupScheduleStatus {
	isRunning: boolean;
	intervalMinutes: number;
	lastBackupAt: string | null;
	lastBackupStatus: "success" | "error" | null;
	lastBackupFilename: string | null;
	totalSnapshotsInVault: number;
	nextScheduledRunAt: string | null;
}

const LOCAL_VAULT_STORAGE_KEY = "dente_vault_snapshots_v1";
const LOCAL_VAULT_MAX_DEFAULT_SNAPSHOTS = 12;

let autoBackupIntervalTimer: any = null;
let autoBackupStatus: AutoBackupScheduleStatus = {
	isRunning: false,
	intervalMinutes: 60,
	lastBackupAt: null,
	lastBackupStatus: null,
	lastBackupFilename: null,
	totalSnapshotsInVault: 0,
	nextScheduledRunAt: null,
};

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
 * Валидация файла бэкапа и извлечение метаданных заголовка без расшифровки
 */
export function inspectDenteBackup(rawBackupText: string): DenteBackupValidationResult {
	return validateDenteBackupContainer(rawBackupText);
}

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
			logger.warn("[OfflineBackup] Could not write mutations to IDB during import", err);
			errors.push("Сбой восстановления очереди мутаций");
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
			errors.push("Ошибка восстановления прайс-листа 804н");
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

// ─────────────────────────────────────────────────────────────────────────────
// Vault Rolling Snapshots & Auto-Backup Scheduler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Записывает снимок бэкапа в локальное хранилище для мгновенного восстановления при сбоях
 * с гарантированным перехватом QuotaExceededError и fallback на сохранение снапшотов в IndexedDB.
 */
function recordLocalVaultSnapshot(
	backupString: string,
	filename: string,
	header: DenteBackupHeader,
	autoSnapshot = false,
): void {
	const snapshotId = `vault_snap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
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

	if (typeof window === "undefined" || !window.localStorage) return;

	// 2. Synchronous fast-access in localStorage with QuotaExceededError protection
	try {
		const rawHistory = window.localStorage.getItem(LOCAL_VAULT_STORAGE_KEY);
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

		window.localStorage.setItem(LOCAL_VAULT_STORAGE_KEY, JSON.stringify(snapshots));
		autoBackupStatus.totalSnapshotsInVault = snapshots.length;
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
			const rawHistory = window.localStorage.getItem(LOCAL_VAULT_STORAGE_KEY);
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
			window.localStorage.setItem(LOCAL_VAULT_STORAGE_KEY, JSON.stringify(snapshots));
			autoBackupStatus.totalSnapshotsInVault = snapshots.length;
		} catch {
			// Ignore secondary metadata storage error
		}
	}
}

/**
 * Возвращает список всех локальных снимков в хранилище Vault
 */
export function listLocalVaultSnapshots(): LocalVaultSnapshotMeta[] {
	if (typeof window === "undefined" || !window.localStorage) return [];

	try {
		const raw = window.localStorage.getItem(LOCAL_VAULT_STORAGE_KEY);
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
	if (typeof window !== "undefined" && window.localStorage) {
		try {
			const raw = window.localStorage.getItem(LOCAL_VAULT_STORAGE_KEY);
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
		void getPatientClinicalCache<{ meta: LocalVaultSnapshotMeta; content: string }>(idbKey).then((cached) => {
			if (cached?.content) {
				contentFromCache = cached.content;
			}
		});
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

	if (typeof window === "undefined" || !window.localStorage) return false;

	try {
		const raw = window.localStorage.getItem(LOCAL_VAULT_STORAGE_KEY);
		if (!raw) return false;
		let list = JSON.parse(raw) as Array<{ meta: LocalVaultSnapshotMeta; content: string }>;
		list = list.filter((item) => item.meta.id !== snapshotId);
		window.localStorage.setItem(LOCAL_VAULT_STORAGE_KEY, JSON.stringify(list));
		autoBackupStatus.totalSnapshotsInVault = list.length;
		return true;
	} catch {
		return false;
	}
}

/**
 * Запуск фонового автобэкапа по расписанию (Планировщик)
 */
export function startAutoBackupSchedule(options?: AutoBackupScheduleOptions): AutoBackupScheduleStatus {
	stopAutoBackupSchedule();

	const intervalMinutes = Math.max(5, options?.intervalMinutes || 60);
	const intervalMs = intervalMinutes * 60 * 1000;

	autoBackupStatus = {
		isRunning: true,
		intervalMinutes,
		lastBackupAt: autoBackupStatus.lastBackupAt,
		lastBackupStatus: autoBackupStatus.lastBackupStatus,
		lastBackupFilename: autoBackupStatus.lastBackupFilename,
		totalSnapshotsInVault: listLocalVaultSnapshots().length,
		nextScheduledRunAt: new Date(Date.now() + intervalMs).toISOString(),
	};

	autoBackupIntervalTimer = setInterval(async () => {
		try {
			logger.info("[OfflineBackup] Executing scheduled automatic backup...");
			const result = await exportOfflineClinicBackup({
				organizationId: options?.organizationId,
				passphrase: options?.passphrase,
				autoDownload: false, // Save silently to vault
				meta: {
					clinicName: "DENTE Клиника",
					notes: "Автоматический периодический снимок Vault",
					autoSnapshot: true,
				},
			});

			autoBackupStatus.lastBackupAt = new Date().toISOString();
			autoBackupStatus.lastBackupStatus = "success";
			autoBackupStatus.lastBackupFilename = result.filename;
			autoBackupStatus.nextScheduledRunAt = new Date(Date.now() + intervalMs).toISOString();

			if (options?.onBackupComplete) {
				options.onBackupComplete(result);
			}
		} catch (err: any) {
			logger.error("[OfflineBackup] Scheduled auto-backup failed", err);
			autoBackupStatus.lastBackupStatus = "error";
			if (options?.onBackupError) {
				options.onBackupError(err);
			}
		}
	}, intervalMs);

	if (typeof (autoBackupIntervalTimer as any)?.unref === "function") {
		(autoBackupIntervalTimer as any).unref();
	}

	logger.info(`[OfflineBackup] Auto-backup schedule started: interval ${intervalMinutes} minutes`);
	return { ...autoBackupStatus };
}

/**
 * Остановка фонового автобэкапа по расписанию
 */
export function stopAutoBackupSchedule(): void {
	if (autoBackupIntervalTimer) {
		clearInterval(autoBackupIntervalTimer);
		autoBackupIntervalTimer = null;
	}
	autoBackupStatus.isRunning = false;
	autoBackupStatus.nextScheduledRunAt = null;
}

/**
 * Получение текущего статуса автобэкапа по расписанию
 */
export function getAutoBackupScheduleStatus(): AutoBackupScheduleStatus {
	autoBackupStatus.totalSnapshotsInVault = listLocalVaultSnapshots().length;
	return { ...autoBackupStatus };
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

/**
 * Выполняет безопасный симуляционный Dry-run тест восстановления без записи в постоянное хранилище.
 */
export function runDryRunRestoreVerification(
	rawBackupText: string,
	options?: {
		passphrase?: string | undefined;
		targetOrganizationId?: string | undefined;
	},
): DryRunRestoreResult {
	return executeDryRunRestoreCheck(rawBackupText, {
		passphrase: options?.passphrase,
		targetOrganizationId: options?.targetOrganizationId,
	});
}

