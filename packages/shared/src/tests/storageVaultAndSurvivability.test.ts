/**
 * DENTE CRM — Storage Vault & Offline Survivability Engine Test Suite
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	createDatabaseSnapshot,
	verifyDatabaseSnapshot,
	executeDryRunRestoreCheck,
	SyncQueueBufferManager,
	calculateObjectSha256,
	computeTableSha256,
	computeRootStorageSha256,
	createEncryptedDenteBackup,
	DEFAULT_DENTE_BACKUP_PASSPHRASE,
} from "../index.js";

test("Storage Vault and Offline Survivability Engine", async (t) => {
	await t.test("1. Snapshot Engine: creates cryptographically signed database snapshot with SHA-256 per table and root Merkle hash", () => {
		const snapshot = createDatabaseSnapshot({
			organizationId: "org-test-vault-1",
			clinicName: "DENTE Стоматология",
			driver: "indexeddb",
			notes: "Снимок перед закрытием смены",
			tables: {
				mutations: [
					{ id: "mut-1", entityType: "patient", action: "CREATE", data: { name: "Петров П.П." } },
					{ id: "mut-2", entityType: "appointment", action: "UPDATE", data: { status: "completed" } },
				],
				drafts: [
					{ id: "draft-1", entityType: "card_043", data: { complaint: "Боль в зубе 24" } },
				],
				clinicalCache: [
					{ id: "cache-1", entityKind: "odontogram", data: { tooth: 24, status: "pulpitis" } },
				],
				schedules: [
					{ id: "sch-1", doctorId: "doc-1", date: "2026-08-28" },
				],
				patients: [
					{ id: "p-1", fullName: "Петров Петр Петрович" },
				],
				odontograms: [
					{ id: "odo-1", patientId: "p-1", formula: { "24": "C" } },
				],
				pricelists: [
					{ id: "price-1", code804n: "A16.07.002", name: "Лечение кариеса", priceKopecks: 350000 },
				],
				icd10: [
					{ code: "K02.1", name: "Кариес дентина" },
				],
				payments: [
					{ id: "pay-1", amountKopecks: 350000, fiscalStatus: "fiscalized" },
				],
			},
		});

		assert.ok(snapshot.metadata.snapshotId.startsWith("snap_"));
		assert.equal(snapshot.metadata.organizationId, "org-test-vault-1");
		assert.equal(snapshot.metadata.totalRecords, 10);
		assert.equal(snapshot.metadata.rootSha256.length, 64);
		assert.equal(snapshot.tables.mutations.rowCount, 2);
		assert.equal(snapshot.tables.drafts.rowCount, 1);
		assert.equal(snapshot.tables.clinicalCache.rowCount, 1);
		assert.equal(snapshot.tables.schedules?.rowCount, 1);
		assert.equal(snapshot.tables.patients?.rowCount, 1);
		assert.equal(snapshot.tables.odontograms?.rowCount, 1);
		assert.equal(snapshot.tables.pricelists?.rowCount, 1);
		assert.equal(snapshot.tables.icd10?.rowCount, 1);
		assert.equal(snapshot.tables.payments?.rowCount, 1);

		// Verification
		const verification = verifyDatabaseSnapshot(snapshot);
		assert.equal(verification.valid, true);
		assert.equal(verification.mismatchedTables.length, 0);
		assert.equal(verification.totalRecordsChecked, 10);
	});

	await t.test("2. Snapshot Engine: detects row tampering and bit rot in table data", () => {
		const snapshot = createDatabaseSnapshot({
			tables: {
				mutations: [{ id: "m1", data: "original" }],
				drafts: [],
				clinicalCache: [],
			},
		});

		assert.equal(verifyDatabaseSnapshot(snapshot).valid, true);

		// Tamper with rows
		(snapshot.tables.mutations.rows[0] as any).data = "tampered_by_attacker";
		const tamperedResult = verifyDatabaseSnapshot(snapshot);
		assert.equal(tamperedResult.valid, false);
		assert.ok(tamperedResult.mismatchedTables.includes("mutations"));
		assert.ok(tamperedResult.mismatchedTables.includes("rootSha256"));
	});

	await t.test("3. Dry-Run Restore Validator: validates healthy archive without writing to persistent storage", () => {
		const payload = {
			mutations: [{ id: "m1", mutationId: "m1", entityType: "patient", action: "CREATE", payload: { name: "Сидоров" } }],
			drafts: [{ id: "d1", entityType: "043", data: { text: "complaints" } }],
			clinicalCache: [{ cacheKey: "c1", entityKind: "odontogram", data: {} }],
			schedules: [{ id: "s1" }],
			patients: [{ id: "p1" }],
			odontograms: [{ id: "o1" }],
			pricelists: [{ id: "pr1" }],
			icd10: [{ code: "K04.0" }],
			payments: [{ id: "pay1" }],
			meta: { clinicName: "DENTE Тест" },
		};

		const encryptedArchive = createEncryptedDenteBackup(payload, {
			organizationId: "org-123",
			passphrase: "owner-master-passphrase-2026",
		});

		const dryRun = executeDryRunRestoreCheck(encryptedArchive, {
			passphrase: "owner-master-passphrase-2026",
			targetOrganizationId: "org-123",
		});

		assert.equal(dryRun.dryRunSuccess, true);
		assert.equal(dryRun.integrityGrade, "EXCELLENT");
		assert.equal(dryRun.checksumVerified, true);
		assert.equal(dryRun.totalRecordsCount, 9);
		assert.equal(dryRun.previewStats.mutations, 1);
		assert.equal(dryRun.previewStats.drafts, 1);
		assert.equal(dryRun.previewStats.clinicalCache, 1);
		assert.equal(dryRun.schemaValidation.mutationsValid, true);
		assert.equal(dryRun.schemaValidation.draftsValid, true);
		assert.equal(dryRun.schemaValidation.clinicalCacheValid, true);
		assert.equal(dryRun.errors.length, 0);
	});

	await t.test("4. Dry-Run Restore Validator: rejects wrong master passphrase cleanly without crashing", () => {
		const payload = { mutations: [], drafts: [], clinicalCache: [] };
		const encryptedArchive = createEncryptedDenteBackup(payload, {
			passphrase: "correct-password-xyz",
		});

		const dryRun = executeDryRunRestoreCheck(encryptedArchive, {
			passphrase: "wrong-password-abc",
		});

		assert.equal(dryRun.dryRunSuccess, false);
		assert.equal(dryRun.integrityGrade, "CORRUPTED");
		assert.ok(dryRun.errors.length > 0);
		assert.ok(dryRun.errors[0]?.includes("пароль") || dryRun.errors[0]?.includes("дешифрования"));
	});

	await t.test("5. Dry-Run Restore Validator: flags organization boundary mismatch as warning", () => {
		const payload = { mutations: [], drafts: [], clinicalCache: [] };
		const encryptedArchive = createEncryptedDenteBackup(payload, {
			organizationId: "clinic-branch-alpha",
			passphrase: "shared-key",
		});

		const dryRun = executeDryRunRestoreCheck(encryptedArchive, {
			passphrase: "shared-key",
			targetOrganizationId: "clinic-branch-beta",
		});

		assert.equal(dryRun.dryRunSuccess, true);
		assert.equal(dryRun.integrityGrade, "WARNING");
		assert.ok(dryRun.warnings.some((w) => w.includes("clinic-branch-alpha")));
	});

	await t.test("6. Sync Queue Buffer: monotonic sequencing, in-flight locking, and commit lifecycle", () => {
		const manager = new SyncQueueBufferManager({
			organizationId: "org-1",
			storageDriver: "indexeddb",
		});

		manager.setOnlineStatus(false);
		assert.equal(manager.getOnlineStatus(), false);

		const item1 = manager.enqueue({
			mutationId: "mut-001",
			entityType: "patient_card_043",
			entityId: "patient-1",
			action: "UPDATE_DIARY",
			payload: { diaryText: "Лечение периодонтита зуба 36" },
		});

		const item2 = manager.enqueue({
			mutationId: "mut-002",
			entityType: "payment",
			entityId: "pay-100",
			action: "CAPTURE_PAYMENT",
			payload: { sumKopecks: 120000 },
		});

		assert.equal(item1.sequenceNumber, 1);
		assert.equal(item2.sequenceNumber, 2);
		assert.equal(item1.status, "pending");

		let status = manager.getStatus();
		assert.equal(status.mode, "OFFLINE_BUFFERING");
		assert.equal(status.totalPending, 2);
		assert.equal(status.survivabilityGrade, "DEGRADED");

		// Simulate connection restored
		manager.setOnlineStatus(true);
		assert.equal(manager.getStatus().mode, "ONLINE_SYNCED");

		// Replication starts
		manager.markInFlight([item1.id], "worker-node-1");
		status = manager.getStatus();
		assert.equal(status.inFlightCount, 1);
		assert.equal(status.totalPending, 1);

		// Commit item 1
		manager.markCommitted([item1.id]);
		assert.equal(manager.getStatus().committedCount, 1);

		// Fail item 2
		manager.markFailed([item2.id], "504 Gateway Timeout");
		status = manager.getStatus();
		assert.equal(status.failedCount, 1);
		assert.equal(status.mode, "ERROR");

		// Prune committed items
		const pruned = manager.pruneCommitted();
		assert.equal(pruned, 1);

		// Serialization & Deserialization parity (Crash Survivability)
		const serialized = manager.serialize();
		const restoredManager = SyncQueueBufferManager.deserialize(serialized);
		const restoredStatus = restoredManager.getStatus();
		assert.equal(restoredStatus.failedCount, 1);
		assert.equal(restoredManager.getPendingItems().length, 1);
	});
});
