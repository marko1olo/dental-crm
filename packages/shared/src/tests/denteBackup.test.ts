/**
 * DENTE CRM — Encrypted Local Backup (.dente) & Cryptographic Integrity Test Suite
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	DENTE_BACKUP_MAGIC,
	DENTE_BACKUP_VERSION,
	createEncryptedDenteBackup,
	restoreEncryptedDenteBackup,
	validateDenteBackupContainer,
} from "../sync/backup.js";

test("Dente Local Backup (.dente) & Integrity Suite", async (t) => {
	await t.test("1. createEncryptedDenteBackup generates signed encrypted container with SHA-256 checksums", () => {
		const payload = {
			mutations: [
				{
					mutationId: "mut-001",
					entityType: "patient",
					entityId: "patient_123",
					action: "CREATE",
					timestamp: "2026-08-25T12:00:00.000Z",
					payload: { firstName: "Иван", lastName: "Иванов" },
					payloadHash: "mock-hash-1",
				},
			],
			drafts: [
				{
					draftId: "draft_043_sample",
					entityType: "patient_card_043",
					entityId: "patient_123",
					data: { complaints: "Острая боль в зубе 16" },
					updatedAtMs: Date.now(),
				},
			],
			clinicalCache: [
				{
					cacheId: "odontogram_sample",
					entityKind: "odontogram",
					entityId: "patient_123",
					data: { teeth: { "16": { status: "caries" } } },
					cachedAtMs: Date.now(),
					cachedAtIso: new Date().toISOString(),
				},
			],
			meta: {
				clinicName: "DENTE Москва",
				operatorName: "Д-р Смирнов",
			},
		};

		const backupString = createEncryptedDenteBackup(payload, {
			organizationId: "org-uuid-999",
			passphrase: "test-safe-password",
		});

		assert.ok(typeof backupString === "string", "Backup result must be string");
		const container = JSON.parse(backupString);
		assert.equal(container.header.magic, DENTE_BACKUP_MAGIC);
		assert.equal(container.header.version, DENTE_BACKUP_VERSION);
		assert.equal(container.header.organizationId, "org-uuid-999");
		assert.equal(container.header.itemsCount.mutations, 1);
		assert.equal(container.header.itemsCount.drafts, 1);
		assert.equal(container.header.itemsCount.clinicalCache, 1);
		assert.ok(container.header.payloadSha256.length === 64, "Payload hash must be 64-hex SHA-256");
		assert.ok(container.containerSignature.length === 64, "Container signature must be 64-hex SHA-256");
		assert.ok(typeof container.ciphertext === "string" && container.ciphertext.length > 50);
	});

	await t.test("2. validateDenteBackupContainer verifies container integrity without decryption", () => {
		const payload = {
			mutations: [],
			drafts: [],
			clinicalCache: [],
		};
		const backupString = createEncryptedDenteBackup(payload);

		const result = validateDenteBackupContainer(backupString);
		assert.equal(result.valid, true);
		assert.ok(result.header);
		assert.equal(result.header.magic, DENTE_BACKUP_MAGIC);

		// Tampering test: modify signature
		const tamperedObj = JSON.parse(backupString);
		tamperedObj.containerSignature = "0000000000000000000000000000000000000000000000000000000000000000";
		const tamperedResult = validateDenteBackupContainer(JSON.stringify(tamperedObj));
		assert.equal(tamperedResult.valid, false);
		assert.ok(tamperedResult.error?.includes("Криптографическая подпись"));
	});

	await t.test("3. restoreEncryptedDenteBackup decrypts and verifies roundtrip data with 100% parity", () => {
		const sampleData = {
			mutations: [{ id: 1, action: "PAYMENT_CAPTURE", sum: 150000 }],
			drafts: [{ key: "draft1", form043: { diagnosis: "K02.1" } }],
			clinicalCache: [{ key: "c1", stlMesh: "base64stl..." }],
			meta: { clinicName: "DENTE VIP" },
		};

		const backupString = createEncryptedDenteBackup(sampleData, {
			passphrase: "test-vault-password",
		});

		const restored = restoreEncryptedDenteBackup(backupString, "test-vault-password");
		assert.equal(restored.payload.mutations.length, 1);
		assert.deepEqual(restored.payload.mutations, sampleData.mutations);
		assert.deepEqual(restored.payload.drafts, sampleData.drafts);
		assert.deepEqual(restored.payload.clinicalCache, sampleData.clinicalCache);
		assert.equal(restored.payload.meta?.clinicName, "DENTE VIP");
	});

	await t.test("4. restoreEncryptedDenteBackup rejects invalid passphrase or corrupted payload", () => {
		const sampleData = { mutations: [], drafts: [], clinicalCache: [] };
		const backupString = createEncryptedDenteBackup(sampleData, {
			passphrase: "test-correct-password",
		});

		assert.throws(
			() => restoreEncryptedDenteBackup(backupString, "test-wrong-password"),
			/Неверный пароль расшифровки/i,
		);
	});
});
