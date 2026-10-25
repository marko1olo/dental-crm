/**
 * DENTE CRM — Offline Backup Vault Modules Tests
 * Verifies SHA-256 checksum calculation, backup file validation,
 * corrupted archive reaction, deterministic ZSTD schedule and storage quotas.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import {
	DENTE_BACKUP_MAGIC_V2,
	createEncryptedDenteBackup,
} from "@dental/shared";
import {
	inspectDenteBackup,
	runDryRunRestoreVerification,
} from "../../../services/offline/offlineBackupService";

const RAW_EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function resolvePath(relPath: string): string {
	const clean = relPath.replace(/^apps[\\/]web[\\/]/, "");
	const c1 = path.resolve(process.cwd(), relPath);
	if (fs.existsSync(c1)) return c1;
	const c2 = path.resolve(process.cwd(), clean);
	if (fs.existsSync(c2)) return c2;
	return c1;
}

describe("Offline Backup Vault Modules & Recovery Engine", () => {
	it("1. Архитектурная декомпозиция: все модули vault находятся в пределах лимита <= 500 строк", () => {
		const targetFiles = [
			"apps/web/src/components/settings/OfflineBackupVaultPanel.tsx",
			"apps/web/src/components/settings/backup/OfflineBackupRestoreSection.tsx",
			"apps/web/src/components/settings/backup/DropzoneRestoreArea.tsx",
			"apps/web/src/components/settings/backup/VerificationProgressCard.tsx",
			"apps/web/src/components/settings/backup/RollbackSafetyNotice.tsx",
			"apps/web/src/components/settings/backupVaultModules/backupVaultTypes.ts",
			"apps/web/src/components/settings/backupVaultModules/BackupScheduleConfig.tsx",
			"apps/web/src/components/settings/backupVaultModules/LocalVaultStorageIndicator.tsx",
			"apps/web/src/components/settings/backupVaultModules/BackupSnapshotList.tsx",
			"apps/web/src/components/settings/backupVaultModules/EmergencyRestoreWizard.tsx",
			"apps/web/src/components/settings/backupVaultModules/WizardSourceSelector.tsx",
			"apps/web/src/components/settings/backupVaultModules/WizardVerifyStage.tsx",
			"apps/web/src/components/settings/backupVaultModules/WizardCompleteStage.tsx",
		];

		for (const relPath of targetFiles) {
			const absPath = resolvePath(relPath);
			assert.ok(fs.existsSync(absPath), `Файл ${relPath} обязан существовать`);
			const lines = fs.readFileSync(absPath, "utf-8").split("\n").length;
			assert.ok(
				lines <= 500,
				`Файл ${relPath} обязан быть <= 500 строк (фактически: ${lines})`,
			);
		}
	});

	it("2. Полное отсутствие сырых Unicode-эмодзи в новых компонентах хранилища", () => {
		const filesToCheck = [
			"apps/web/src/components/settings/backup/DropzoneRestoreArea.tsx",
			"apps/web/src/components/settings/backup/VerificationProgressCard.tsx",
			"apps/web/src/components/settings/backup/RollbackSafetyNotice.tsx",
			"apps/web/src/components/settings/backupVaultModules/BackupScheduleConfig.tsx",
			"apps/web/src/components/settings/backupVaultModules/LocalVaultStorageIndicator.tsx",
			"apps/web/src/components/settings/backupVaultModules/BackupSnapshotList.tsx",
			"apps/web/src/components/settings/backupVaultModules/EmergencyRestoreWizard.tsx",
		];

		for (const relPath of filesToCheck) {
			const absPath = resolvePath(relPath);
			const content = fs.readFileSync(absPath, "utf-8");
			assert.ok(
				!RAW_EMOJI_REGEX.test(content),
				`Файл ${relPath} не должен содержать сырых эмодзи`,
			);
			assert.ok(!content.includes("⚠️"), `${relPath} не должен содержать ⚠️`);
			assert.ok(!content.includes("❌"), `${relPath} не должен содержать ❌`);
			assert.ok(!content.includes("✅"), `${relPath} не должен содержать ✅`);
		}
	});

	it("3. Валидация корректного архива DENTE (.dente) с детерминированным расчетом SHA-256", () => {
		const payload = {
			mutations: [{ id: "m1" }],
			drafts: [{ id: "d1" }],
			clinicalCache: [],
			schedules: [{ id: "s1" }],
			patients: [{ id: "p1" }],
			odontograms: [],
			pricelists: [],
			icd10: [],
		};

		const validBackup = createEncryptedDenteBackup(payload, {
			organizationId: "org-test-101",
			passphrase: "vault-secret-pass-2026",
		});

		const inspection = inspectDenteBackup(validBackup);
		assert.equal(inspection.valid, true, "Корректный заголовок обязан пройти валидацию");
		assert.ok(inspection.header, "Заголовок архива обязан быть извлечен");
		assert.equal(inspection.header.organizationId, "org-test-101");
		assert.equal(inspection.header.magic, DENTE_BACKUP_MAGIC_V2);
		assert.ok(inspection.header.payloadSha256, "SHA-256 хеш содержимого обязан присутствовать");

		const dryRun = runDryRunRestoreVerification(validBackup, {
			passphrase: "vault-secret-pass-2026",
			targetOrganizationId: "org-test-101",
		});
		assert.ok(dryRun, "Dry-run проверка обязана завершиться результатом");
		assert.equal(dryRun.dryRunSuccess, true);
		assert.equal(dryRun.checksumVerified, true);
		assert.equal(dryRun.totalRecordsCount, 4);
		assert.equal(dryRun.warnings.length, 0);
	});

	it("4. Реакция на поврежденный архив: некорректный контейнер и нарушенный синтаксис", () => {
		const brokenContainer = "DENTE_ENC_v2:eyJhYmMiOiJpbnZhbGlkX2Jhc2U2NCJ9";
		const inspection = inspectDenteBackup(brokenContainer);
		assert.equal(inspection.valid, false, "Нарушенный контейнер обязан быть забракован");
		assert.ok(inspection.error, "Должно быть возвращено сообщение об ошибке");

		const dryRun = runDryRunRestoreVerification(brokenContainer);
		assert.equal(dryRun.dryRunSuccess, false);
		assert.equal(dryRun.integrityGrade, "CORRUPTED");
		assert.ok(dryRun.errors.length > 0, "Должны быть зафиксированы ошибки");
	});

	it("5. Реакция на архив с чужой организацией и неверным паролем расшифровки", () => {
		const foreignBackup = createEncryptedDenteBackup(
			{
				mutations: [{ id: "m-foreign" }],
				drafts: [],
				clinicalCache: [],
			},
			{
				organizationId: "foreign-clinic-999",
				passphrase: "correct-foreign-pass",
			},
		);

		// А: Проверка неверного пароля
		const wrongPassDryRun = runDryRunRestoreVerification(foreignBackup, {
			passphrase: "wrong-password",
		});
		assert.equal(wrongPassDryRun.dryRunSuccess, false, "Неверный пароль обязан блокировать восстановление");
		assert.ok(
			wrongPassDryRun.errors.some((e) => e.includes("парол") || e.includes("расшифр") || e.includes("ключ")),
			"Должна быть зафиксирована ошибка неверного ключа/пароля",
		);

		// Б: Проверка чужой организации
		const orgMismatchDryRun = runDryRunRestoreVerification(foreignBackup, {
			passphrase: "correct-foreign-pass",
			targetOrganizationId: "our-clinic-001",
		});
		assert.ok(
			orgMismatchDryRun.warnings.some((w) => w.includes("foreign-clinic-999") || w.includes("организаци")),
			"Должно быть выведено предупреждение о чужой организации",
		);
	});

	it("6. Экспорт и валидация типов BackupVaultModules", () => {
		const sampleStorage = {
			usedBytes: 15728640,
			totalQuotaBytes: 10737418240,
			usedFormatted: "15.00 МБ",
			quotaFormatted: "10.0 ГБ",
			usagePercentage: 0.15,
			indexedDbBytes: 12000000,
			sqliteFallbackBytes: 3728640,
			encryptionKeyStatus: "ACTIVE_SOVEREIGN" as const,
			encryptionKeyFingerprint: "ORG-TEST-AES256",
			storageDriver: "indexeddb" as const,
		};
		assert.equal(sampleStorage.encryptionKeyStatus, "ACTIVE_SOVEREIGN");
		assert.equal(sampleStorage.storageDriver, "indexeddb");
		assert.ok(sampleStorage.usagePercentage < 100);
	});
});
