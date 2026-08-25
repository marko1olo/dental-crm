/**
 * DENTE CRM — Offline Backup (.dente) & Cache Integrity Suite
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
	exportOfflineClinicBackup,
	importOfflineClinicBackup,
	inspectDenteBackup,
	runStartupIntegrityAudit,
	saveOfflineDraft,
	savePatientClinicalCache,
	verifyLocalCacheIntegrity,
} from "../services/offline";

test("Offline Local Backup (.dente) & Cache Integrity Engine Suite", async (t) => {
	await t.test("1. exportOfflineClinicBackup bundles drafts, cache and mutations into .dente file", async () => {
		// Populate mock offline data
		await saveOfflineDraft(
			"draft_card_test_777",
			"patient_card_043",
			"pat-777",
			{ anamnesis: "Без особенностей", tooth18: "healthy" },
			"org-offline-1",
		);

		await savePatientClinicalCache(
			"patient_cache_pat-777",
			"patient_snapshot",
			"pat-777",
			{ fullName: "Ковалев Сергей", phone: "+79991234567" },
			"org-offline-1",
		);

		const result = await exportOfflineClinicBackup({
			organizationId: "org-offline-1",
			autoDownload: false,
		});

		assert.ok(typeof result.backupString === "string");
		assert.ok(result.filename.endsWith(".dente"));
		assert.equal(result.header.magic, "DENTE_ENCRYPTED_BACKUP_V1");
		assert.ok(result.stats.drafts >= 1);
		assert.ok(result.stats.clinicalCache >= 1);

		const inspectResult = inspectDenteBackup(result.backupString);
		assert.equal(inspectResult.valid, true);
		assert.equal(inspectResult.header?.magic, "DENTE_ENCRYPTED_BACKUP_V1");
	});

	await t.test("2. importOfflineClinicBackup restores patient records and drafts from .dente archive", async () => {
		const exportResult = await exportOfflineClinicBackup({
			organizationId: "org-offline-1",
			autoDownload: false,
		});

		const restoreResult = await importOfflineClinicBackup(exportResult.backupString);
		assert.equal(restoreResult.success, true);
		assert.equal(restoreResult.errors.length, 0);
		assert.ok(restoreResult.restoredCount.drafts >= 1);
		assert.ok(restoreResult.restoredCount.clinicalCache >= 1);
	});

	await t.test("3. verifyLocalCacheIntegrity and runStartupIntegrityAudit validate local database health", async () => {
		const report = await verifyLocalCacheIntegrity({ autoRepair: true });
		assert.ok(typeof report.healthy === "boolean");
		assert.ok(report.totalChecked >= 0);
		assert.ok(report.storageEstimate);
		assert.ok(typeof report.storageEstimate.percentUsed === "number");

		const startupReport = await runStartupIntegrityAudit();
		assert.ok(startupReport);
		assert.equal(startupReport.healthy, true);
	});

	await t.test("4. OfflineReadinessBanner CSS and touch targets adhere to clinical invariants", () => {
		const cssPath = path.resolve(
			process.cwd(),
			"src/components/offline/OfflineReadinessBanner.css",
		);
		assert.ok(fs.existsSync(cssPath), "OfflineReadinessBanner.css must exist");
		const cssContent = fs.readFileSync(cssPath, "utf8");

		assert.ok(cssContent.includes("min-height: 44px"), "Touch targets must be >= 44px");
		assert.ok(cssContent.includes("touch-action: manipulation"), "300ms double-tap delay must be disabled");
		assert.ok(cssContent.includes('[data-theme="dark"]'), "Dark mode styling must be implemented");
	});
});
