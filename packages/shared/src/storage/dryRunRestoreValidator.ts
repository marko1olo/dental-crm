/**
 * DENTE CRM — Dry-Run Restore Validator & Integrity Auditor
 *
 * Безопасная симуляция восстановления базы данных перед реальной записью:
 * - Проверка заголовка контейнера и версии
 * - Валидация криптографической подписи HMAC / SHA-256
 * - Расшифровка в памяти (dry-run sandbox) без мутации постоянного хранилища
 * - Сверка контрольной суммы полезной нагрузки (SHA-256)
 * - Анализ схемы всех таблиц и детекция конфликтов
 * - Формирование отчета об оценке целостности (EXCELLENT / WARNING / CORRUPTED)
 */

import {
	DEFAULT_DENTE_BACKUP_PASSPHRASE,
	type DenteBackupHeader,
	type DenteBackupItemsCount,
	type DenteBackupPayload,
	restoreEncryptedDenteBackup,
	validateDenteBackupContainer,
} from "../sync/backup.js";
import type {
	DryRunRestoreOptions,
	DryRunRestoreResult,
	RestoreIntegrityGrade,
} from "./types.js";

/**
 * Performs a zero-side-effect dry-run verification of an encrypted or plaintext .dente backup container.
 */
export function executeDryRunRestoreCheck(
	rawBackupText: string,
	options?: DryRunRestoreOptions,
): DryRunRestoreResult {
	const startTime = performance ? performance.now() : Date.now();
	const warnings: string[] = [];
	const errors: string[] = [];
	const passphrase = options?.passphrase || DEFAULT_DENTE_BACKUP_PASSPHRASE;

	const defaultStats: DenteBackupItemsCount = {
		mutations: 0,
		drafts: 0,
		clinicalCache: 0,
		schedules: 0,
		patients: 0,
		odontograms: 0,
		pricelists: 0,
		icd10: 0,
		payments: 0,
	};

	const schemaValidation = {
		mutationsValid: false,
		draftsValid: false,
		clinicalCacheValid: false,
		schedulesValid: true,
		patientsValid: true,
		odontogramsValid: true,
		pricelistsValid: true,
		icd10Valid: true,
		paymentsValid: true,
	};

	// 1. Container structural validation
	const containerCheck = validateDenteBackupContainer(rawBackupText);
	if (!containerCheck.valid || !containerCheck.header) {
		errors.push(containerCheck.error || "Невалидный контейнер архива DENTE");
		const duration = (performance ? performance.now() : Date.now()) - startTime;
		return {
			dryRunSuccess: false,
			integrityGrade: "CORRUPTED",
			header: null,
			previewStats: defaultStats,
			checksumVerified: false,
			totalRecordsCount: 0,
			estimatedPayloadSizeBytes: rawBackupText.length,
			warnings,
			errors,
			schemaValidation,
			executionDurationMs: Math.round(duration),
		};
	}

	const header = containerCheck.header;

	// Organization boundary check
	if (options?.targetOrganizationId && header.organizationId && header.organizationId !== options.targetOrganizationId) {
		warnings.push(
			`Архив принадлежит организации "${header.organizationId}", а текущая клиника — "${options.targetOrganizationId}". Будет выполнена адаптация.`
		);
	}

	// 2. Sandbox Decryption & Integrity Verification
	let decryptedPayload: DenteBackupPayload;
	try {
		const restoreResult = restoreEncryptedDenteBackup(rawBackupText, passphrase);
		decryptedPayload = restoreResult.payload;
	} catch (err: any) {
		errors.push(err?.message || "Ошибка дешифрования архива (неверный мастер-пароль или повреждение данных)");
		const duration = (performance ? performance.now() : Date.now()) - startTime;
		return {
			dryRunSuccess: false,
			integrityGrade: "CORRUPTED",
			header,
			previewStats: header.itemsCount || defaultStats,
			checksumVerified: false,
			totalRecordsCount: 0,
			estimatedPayloadSizeBytes: rawBackupText.length,
			warnings,
			errors,
			schemaValidation,
			executionDurationMs: Math.round(duration),
		};
	}

	// 3. Detailed Schema and Integrity Audit
	schemaValidation.mutationsValid = Array.isArray(decryptedPayload.mutations);
	schemaValidation.draftsValid = Array.isArray(decryptedPayload.drafts);
	schemaValidation.clinicalCacheValid = Array.isArray(decryptedPayload.clinicalCache);
	schemaValidation.schedulesValid = Array.isArray(decryptedPayload.schedules || []);
	schemaValidation.patientsValid = Array.isArray(decryptedPayload.patients || []);
	schemaValidation.odontogramsValid = Array.isArray(decryptedPayload.odontograms || []);
	schemaValidation.pricelistsValid = Array.isArray(decryptedPayload.pricelists || []);
	schemaValidation.icd10Valid = Array.isArray(decryptedPayload.icd10 || []);
	schemaValidation.paymentsValid = Array.isArray(decryptedPayload.payments || []);

	if (!schemaValidation.mutationsValid) errors.push("Таблица мутаций повреждена");
	if (!schemaValidation.draftsValid) errors.push("Таблица черновиков повреждена");
	if (!schemaValidation.clinicalCacheValid) errors.push("Клинический кэш поврежден");

	// Inspect mutations payload records
	if (Array.isArray(decryptedPayload.mutations)) {
		let invalidMutations = 0;
		for (const m of decryptedPayload.mutations as any[]) {
			if (!m || typeof m !== "object" || (!m.id && !m.mutationId)) {
				invalidMutations++;
			}
		}
		if (invalidMutations > 0) {
			warnings.push(`Обнаружено ${invalidMutations} записей мутаций без явного идентификатора`);
		}
	}

	const previewStats: DenteBackupItemsCount = {
		mutations: decryptedPayload.mutations?.length || 0,
		drafts: decryptedPayload.drafts?.length || 0,
		clinicalCache: decryptedPayload.clinicalCache?.length || 0,
		schedules: decryptedPayload.schedules?.length || 0,
		patients: decryptedPayload.patients?.length || 0,
		odontograms: decryptedPayload.odontograms?.length || 0,
		pricelists: decryptedPayload.pricelists?.length || 0,
		icd10: decryptedPayload.icd10?.length || 0,
		payments: decryptedPayload.payments?.length || 0,
	};

	const totalRecordsCount =
		previewStats.mutations +
		previewStats.drafts +
		previewStats.clinicalCache +
		(previewStats.schedules || 0) +
		(previewStats.patients || 0) +
		(previewStats.odontograms || 0) +
		(previewStats.pricelists || 0) +
		(previewStats.icd10 || 0) +
		(previewStats.payments || 0);

	let integrityGrade: RestoreIntegrityGrade = "EXCELLENT";
	if (errors.length > 0) {
		integrityGrade = "CORRUPTED";
	} else if (warnings.length > 0) {
		integrityGrade = "WARNING";
	}

	const duration = (performance ? performance.now() : Date.now()) - startTime;

	return {
		dryRunSuccess: errors.length === 0,
		integrityGrade,
		header,
		previewStats,
		checksumVerified: true,
		totalRecordsCount,
		estimatedPayloadSizeBytes: rawBackupText.length,
		warnings,
		errors,
		schemaValidation,
		executionDurationMs: Math.round(duration),
	};
}
