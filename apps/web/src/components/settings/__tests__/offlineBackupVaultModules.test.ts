/**
 * DENTE CRM — Offline Backup Vault Modules Tests (6G Live SUT)
 */

import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it } from "vitest";
import {
	DENTE_BACKUP_MAGIC_V2,
	createEncryptedDenteBackup,
	type DryRunRestoreResult,
} from "@dental/shared";
import {
	inspectDenteBackup,
	runDryRunRestoreVerification,
} from "../../../services/offline/offlineBackupService";
import { OfflineBackupVaultPanel } from "../OfflineBackupVaultPanel";
import { DropzoneRestoreArea } from "../backup/DropzoneRestoreArea";
import { VerificationProgressCard } from "../backup/VerificationProgressCard";
import { RollbackSafetyNotice } from "../backup/RollbackSafetyNotice";
import { BackupScheduleConfig } from "../backupVaultModules/BackupScheduleConfig";
import { LocalVaultStorageIndicator } from "../backupVaultModules/LocalVaultStorageIndicator";
import { BackupSnapshotList } from "../backupVaultModules/BackupSnapshotList";
import { EmergencyRestoreWizard } from "../backupVaultModules/EmergencyRestoreWizard";

const RAW_EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Offline Backup Vault Modules & Recovery Engine (6G Live SUT)", () => {
	it("1. Live UI components render cleanly with zero raw emojis and zero disabled buttons", () => {
		const emptyRef = { current: null };
		const dryRunSample: DryRunRestoreResult = {
			dryRunSuccess: true,
			checksumVerified: true,
			integrityGrade: "EXCELLENT",
			totalRecordsCount: 12,
			warnings: [],
			errors: [],
			metadata: {
				organizationId: "org-test-101",
				createdAt: "2026-10-01T10:00:00.000Z",
				schemaVersion: 2,
				clinicName: "Тест",
			},
			entitiesBreakdown: {
				mutations: 2,
				drafts: 1,
				clinicalCache: 3,
				schedules: 2,
				patients: 4,
				odontograms: 0,
				pricelists: 0,
				icd10: 0,
			},
		};

		const renders = [
			renderToStaticMarkup(
				React.createElement(OfflineBackupVaultPanel, {
					organizationId: "org-test-101",
					clinicName: "Клиника Тест",
				}),
			),
			renderToStaticMarkup(
				React.createElement(DropzoneRestoreArea, {
					fileInputRef: emptyRef,
					handleFileSelect: () => {},
					importFileName: "backup.dente",
				}),
			),
			renderToStaticMarkup(
				React.createElement(VerificationProgressCard, {
					dryRunResult: dryRunSample,
				}),
			),
			renderToStaticMarkup(
				React.createElement(RollbackSafetyNotice, {
					importPassphrase: "",
					showImportPassphrase: false,
					setShowImportPassphrase: () => {},
					handlePassphraseChangeForDryRun: () => {},
					executeDryRun: () => {},
					importRawText: "raw",
					isExecutingDryRun: false,
					handleRestore: () => {},
					isImporting: false,
					canRestore: true,
					restoreError: null,
					lastRestoreResult: null,
				}),
			),
			renderToStaticMarkup(
				React.createElement(BackupScheduleConfig, {
					schedulerStatus: { isRunning: false, intervalMinutes: 60, lastRunAt: null, nextRunAt: null, lastStatus: "idle", snapshotsCount: 0 },
					schedulerIntervalMin: 60,
					setSchedulerIntervalMin: () => {},
					handleToggleScheduler: () => {},
				}),
			),
			renderToStaticMarkup(
				React.createElement(LocalVaultStorageIndicator, {
					integrityReport: null,
					isCheckingIntegrity: false,
					onRefreshIntegrity: () => {},
					organizationId: "org-test-101",
				}),
			),
			renderToStaticMarkup(
				React.createElement(BackupSnapshotList, {
					vaultSnapshots: [],
					handleRestoreSnapshot: () => {},
					handleDeleteSnapshot: () => {},
				}),
			),
			renderToStaticMarkup(
				React.createElement(EmergencyRestoreWizard, {
					vaultSnapshots: [],
					onExecuteRestore: async () => ({ success: false, restoredCount: 0, error: "noop" }),
					onDryRunVerify: () => dryRunSample,
					pendingMutationsCount: 0,
					onComplete: () => {},
				}),
			),
		];

		for (const html of renders) {
			assert.ok(html.length > 0);
			assert.equal(RAW_EMOJI_REGEX.test(html), false, "Vault UI must contain 0 raw emojis");
			assert.equal(html.includes("⚠️") || html.includes("❌") || html.includes("✅"), false);
			assert.equal(html.includes('disabled=""'), false);
		}
	});

	it("2. Валидация корректного архива DENTE (.dente) с детерминированным расчетом SHA-256", () => {
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

	it("3. Реакция на поврежденный архив: некорректный контейнер и нарушенный синтаксис", () => {
		const brokenContainer = "DENTE_ENC_v2:eyJhYmMiOiJpbnZhbGlkX2Jhc2U2NCJ9";
		const inspection = inspectDenteBackup(brokenContainer);
		assert.equal(inspection.valid, false, "Нарушенный контейнер обязан быть забракован");
		assert.ok(inspection.error, "Должно быть возвращено сообщение об ошибке");

		const dryRun = runDryRunRestoreVerification(brokenContainer);
		assert.equal(dryRun.dryRunSuccess, false);
		assert.equal(dryRun.integrityGrade, "CORRUPTED");
		assert.ok(dryRun.errors.length > 0, "Должны быть зафиксированы ошибки");
	});

	it("4. Реакция на архив с чужой организацией и неверным паролем расшифровки", () => {
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

		const wrongPassDryRun = runDryRunRestoreVerification(foreignBackup, {
			passphrase: "wrong-password",
		});
		assert.equal(wrongPassDryRun.dryRunSuccess, false, "Неверный пароль обязан блокировать восстановление");
		assert.ok(
			wrongPassDryRun.errors.some((e) => e.includes("парол") || e.includes("расшифр") || e.includes("ключ")),
			"Должна быть зафиксирована ошибка неверного ключа/пароля",
		);

		const orgMismatchDryRun = runDryRunRestoreVerification(foreignBackup, {
			passphrase: "correct-foreign-pass",
			targetOrganizationId: "our-clinic-001",
		});
		assert.ok(
			orgMismatchDryRun.warnings.some((w) => w.includes("foreign-clinic-999") || w.includes("организаци")),
			"Должно быть выведено предупреждение о чужой организации",
		);
	});
});
