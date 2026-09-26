/**
 * cloudBackupEngine.test.ts — Comprehensive Test Suite for Zero-Knowledge Cloud Backup & Disaster Recovery
 *
 * ТЕСТОВОЕ ПОКРЫТИЕ:
 * 1. Генерация и валидация мнемоники BIP-39 (12 слов, контрольная сумма SHA-256).
 * 2. Деривация мастер-ключа scrypt(mnemonic, salt="DENTE:" + ogrn + orgId).
 * 3. Потоковое Zero-Knowledge шифрование AES-256-GCM с защитой заголовка через AAD.
 * 4. Полная проверка целостности GCM Auth Tag: гарантированное отклонение любых
 *    модифицированных, обрезанных или поддельных данных (152-ФЗ).
 * 5. Ротация GFS: хранение 7 ежедневных, 4 еженедельных и 12 ежемесячных бэкапов.
 * 6. Полный сценарий Disaster Recovery: восстановление клиники по 12 словам за RTO <= 8 минут, RPO <= 15 минут.
 */

import assert from "node:assert";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { runDisasterRecovery } from "../scripts/restoreDisasterRecovery.js";
import {
	BIP39_WORDLIST,
	DENTE_ZK_MAGIC,
	DENTE_ZK_VERSION,
	GCM_TAG_LENGTH,
	LocalMockS3Adapter,
	buildClinicSalt,
	createCloudBackup,
	deriveMasterKey,
	deriveMasterKeySync,
	generateMnemonic,
	mnemonicToEntropy,
	parseContainerHeader,
	restoreCloudBackup,
	rotateCloudBackups,
	validateMnemonic,
} from "../services/cloudBackupEngine.js";

describe("CloudBackupEngine — Zero-Knowledge 152-ФЗ Backup & Disaster Recovery", () => {
	const TEST_OGRN = "1237700123456";
	const TEST_ORG_ID = "clinic-alpha-001";

	describe("1. BIP-39 Mnemonic Generator and Validator", () => {
		it("generates a 12-word mnemonic with valid checksum", () => {
			const mnemonic = generateMnemonic();
			assert.strictEqual(typeof mnemonic, "string");
			const words = mnemonic.split(" ");
			assert.strictEqual(words.length, 12, "Mnemonic must consist of exactly 12 words");

			for (const word of words) {
				assert.ok(BIP39_WORDLIST.includes(word), `Word '${word}' must exist in BIP-39 wordlist`);
			}
			assert.strictEqual(validateMnemonic(mnemonic), true, "Generated mnemonic must pass validation");
		});

		it("rejects mnemonics with invalid word counts", () => {
			assert.strictEqual(validateMnemonic(""), false);
			assert.strictEqual(validateMnemonic("abandon ability able"), false);
			assert.strictEqual(
				validateMnemonic(
					"abandon ability able about above absent absorb abstract absurd abuse access accident account",
				),
				false,
			);
		});

		it("rejects mnemonics with words not present in the dictionary", () => {
			const valid = generateMnemonic();
			const words = valid.split(" ");
			words[0] = "stomatologia";
			assert.strictEqual(validateMnemonic(words.join(" ")), false);
		});

		it("rejects mnemonics with checksum mismatch (corrupted word)", () => {
			const valid = generateMnemonic();
			const words = valid.split(" ");
			// Swap word to another valid dictionary word to violate checksum
			words[11] = words[11] === "zoo" ? "zone" : "zoo";
			const corrupted = words.join(" ");
			// Validate checksum
			const isValid = validateMnemonic(corrupted);
			assert.strictEqual(isValid, false, "Corrupted mnemonic must fail checksum check");
		});

		it("converts mnemonic back to entropy round-trip", () => {
			const originalEntropy = crypto.randomBytes(16);
			const mnemonic = generateMnemonic(originalEntropy);
			const recoveredEntropy = mnemonicToEntropy(mnemonic);
			assert.deepStrictEqual(recoveredEntropy, originalEntropy, "Recovered entropy must match original");
		});
	});

	describe("2. Master Key Derivation (scrypt)", () => {
		it("derives a 32-byte key using clinical salt DENTE:<ogrn><orgId>", async () => {
			const mnemonic = generateMnemonic();
			const keyAsync = await deriveMasterKey(mnemonic, TEST_OGRN, TEST_ORG_ID);
			const keySync = deriveMasterKeySync(mnemonic, TEST_OGRN, TEST_ORG_ID);

			assert.strictEqual(keyAsync.length, 32, "Key must be 32 bytes for AES-256");
			assert.deepStrictEqual(keyAsync, keySync, "Async and Sync scrypt must yield identical keys");
		});

		it("is strictly deterministic for identical parameters", async () => {
			const mnemonic = generateMnemonic();
			const key1 = await deriveMasterKey(mnemonic, TEST_OGRN, TEST_ORG_ID);
			const key2 = await deriveMasterKey(mnemonic, TEST_OGRN, TEST_ORG_ID);
			assert.deepStrictEqual(key1, key2);
		});

		it("produces completely different keys if ogrn or orgId changes", async () => {
			const mnemonic = generateMnemonic();
			const keyA = await deriveMasterKey(mnemonic, TEST_OGRN, "clinic-01");
			const keyB = await deriveMasterKey(mnemonic, TEST_OGRN, "clinic-02");
			const keyC = await deriveMasterKey(mnemonic, "9999999999999", "clinic-01");

			assert.notDeepStrictEqual(keyA, keyB);
			assert.notDeepStrictEqual(keyA, keyC);
		});

		it("throws when salt parameters are empty", () => {
			assert.throws(() => buildClinicSalt("", ""), /Clinic OGRN and Organization ID are required/);
		});
	});

	describe("3. Streaming AES-256-GCM Zero-Knowledge Encryption & Decryption", () => {
		it("encrypts and decrypts realistic clinical data with 100% fidelity", async () => {
			const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dente-zk-test-"));
			const storage = new LocalMockS3Adapter(tempDir);
			const mnemonic = generateMnemonic();

			const clinicalPayload = Buffer.from(
				JSON.stringify({
					clinic: "ООО 'ДЕНТЕ СТОМАТОЛОГИЯ'",
					patients: [
						{ id: "p-1", fullName: "Барабаш С.В.", snils: "123-456-789 00", birthDate: "1985-04-12" },
						{ id: "p-2", fullName: "Смирнова Е.А.", snils: "987-654-321 11", birthDate: "1992-11-20" },
					],
					visits: [
						{ id: "v-101", tooth: 16, diagnosis: "K04.0 Пульпит", totalRub: 8500 },
						{ id: "v-102", tooth: 21, diagnosis: "K02.1 Кариес дентина", totalRub: 4200 },
					],
					fiscalTransactions: [
						{ receiptId: "rec-01", sumKopecks: 850000, ffd: "1.2", paymentType: "CARD" },
					],
				}),
				"utf8",
			);

			const backup = await createCloudBackup({
				mnemonic,
				orgId: TEST_ORG_ID,
				ogrn: TEST_OGRN,
				payload: clinicalPayload,
				backupType: "daily",
				storage,
				dumpStats: { copyBlocks: 4, dataRows: 5, populatedTables: 3 },
			});

			assert.ok(backup.key.startsWith(`backups/${TEST_ORG_ID}/daily/`));
			assert.ok(backup.size > clinicalPayload.length, "Encrypted blob must include header and auth tag");

			// Read raw blob from storage and verify header
			const rawBlob = await storage.downloadBuffer(backup.key);
			const { header, offset } = parseContainerHeader(rawBlob);

			assert.strictEqual(header.magic, DENTE_ZK_MAGIC.trim());
			assert.strictEqual(header.version, DENTE_ZK_VERSION);
			assert.strictEqual(header.orgId, TEST_ORG_ID);
			assert.strictEqual(header.ogrn, TEST_OGRN);
			assert.strictEqual(header.algorithm, "aes-256-gcm");

			// Decrypt backup
			const restoreResult = await restoreCloudBackup({
				mnemonic,
				orgId: TEST_ORG_ID,
				ogrn: TEST_OGRN,
				backupBuffer: rawBlob,
				storage,
			});

			assert.deepStrictEqual(restoreResult.plaintext, clinicalPayload, "Decrypted data must match original payload");
			fs.rmSync(tempDir, { recursive: true, force: true });
		});

		it("encrypts and decrypts streaming SQL dump", async () => {
			const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dente-sql-test-"));
			const storage = new LocalMockS3Adapter(tempDir);
			const mnemonic = generateMnemonic();

			const sqlData = Buffer.from(
				"CREATE TABLE patients (id text, name text);\n" +
				"COPY patients (id, name) FROM stdin;\n" +
				"1\tИванов И.И.\n" +
				"2\tПетров П.П.\n" +
				"\\.\n" +
				"-- PostgreSQL database dump complete\n",
				"utf8",
			);

			const backup = await createCloudBackup({
				mnemonic,
				orgId: TEST_ORG_ID,
				ogrn: TEST_OGRN,
				payload: sqlData,
				storage,
			});

			const restored = await restoreCloudBackup({
				mnemonic,
				key: backup.key,
				storage,
			});

			assert.strictEqual(restored.plaintext.toString("utf8"), sqlData.toString("utf8"));
			fs.rmSync(tempDir, { recursive: true, force: true });
		});
	});

	describe("4. Cryptographic Integrity & Tamper Detection (152-ФЗ / GCM Auth Tag)", () => {
		it("detects and rejects ciphertext tampering", async () => {
			const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dente-tamper-test-"));
			const storage = new LocalMockS3Adapter(tempDir);
			const mnemonic = generateMnemonic();

			const originalData = Buffer.from("Секретные персональные медицинские данные по 152-ФЗ", "utf8");
			const backup = await createCloudBackup({
				mnemonic,
				orgId: TEST_ORG_ID,
				ogrn: TEST_OGRN,
				payload: originalData,
				storage,
			});

			const rawBlob = await storage.downloadBuffer(backup.key);
			const { offset } = parseContainerHeader(rawBlob);

			// Tamper a byte in the ciphertext portion (between header offset and trailing tag)
			const tamperedBlob = Buffer.from(rawBlob);
			const ciphertextIndex = offset + 5;
			tamperedBlob[ciphertextIndex] = (tamperedBlob[ciphertextIndex] ?? 0) ^ 0xff;

			await assert.rejects(
				async () => {
					await restoreCloudBackup({
						mnemonic,
						orgId: TEST_ORG_ID,
						ogrn: TEST_OGRN,
						backupBuffer: tamperedBlob,
						storage,
					});
				},
				/Unsupported state or unable to authenticate data|Invalid GCM payload/i,
				"Tampered ciphertext must cause GCM authentication failure",
			);

			fs.rmSync(tempDir, { recursive: true, force: true });
		});

		it("detects and rejects Auth Tag tampering", async () => {
			const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dente-tag-tamper-"));
			const storage = new LocalMockS3Adapter(tempDir);
			const mnemonic = generateMnemonic();

			const originalData = Buffer.from("Конфиденциальный план лечения", "utf8");
			const backup = await createCloudBackup({
				mnemonic,
				orgId: TEST_ORG_ID,
				ogrn: TEST_OGRN,
				payload: originalData,
				storage,
			});

			const rawBlob = await storage.downloadBuffer(backup.key);
			const tamperedBlob = Buffer.from(rawBlob);
			// Tamper last byte of the 16-byte auth tag
			tamperedBlob[tamperedBlob.length - 1] = (tamperedBlob[tamperedBlob.length - 1] ?? 0) ^ 0x01;

			await assert.rejects(
				async () => {
					await restoreCloudBackup({
						mnemonic,
						backupBuffer: tamperedBlob,
						storage,
					});
				},
				/Unsupported state or unable to authenticate data/i,
				"Corrupted auth tag must fail authentication",
			);

			fs.rmSync(tempDir, { recursive: true, force: true });
		});

		it("fails decryption if wrong mnemonic is used", async () => {
			const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dente-wrong-key-"));
			const storage = new LocalMockS3Adapter(tempDir);
			const mnemonicAlice = generateMnemonic();
			const mnemonicBob = generateMnemonic();

			const data = Buffer.from("Врачебная тайна", "utf8");
			const backup = await createCloudBackup({
				mnemonic: mnemonicAlice,
				orgId: TEST_ORG_ID,
				ogrn: TEST_OGRN,
				payload: data,
				storage,
			});

			await assert.rejects(
				async () => {
					await restoreCloudBackup({
						mnemonic: mnemonicBob, // Bob tries to decrypt Alice's data
						key: backup.key,
						storage,
					});
				},
				/Unsupported state or unable to authenticate data/i,
				"Wrong mnemonic must fail decryption without leaking plaintext",
			);

			fs.rmSync(tempDir, { recursive: true, force: true });
		});
	});

	describe("5. GFS Rotation Engine (7 Daily, 4 Weekly, 12 Monthly)", () => {
		it("strictly rotates backups according to GFS limits", async () => {
			const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dente-rotation-test-"));
			const storage = new LocalMockS3Adapter(tempDir);
			const mnemonic = generateMnemonic();

			// 1. Create 10 daily backups
			for (let i = 0; i < 10; i++) {
				await createCloudBackup({
					mnemonic,
					orgId: TEST_ORG_ID,
					ogrn: TEST_OGRN,
					payload: Buffer.from(`Daily backup payload ${i}`),
					backupType: "daily",
					storage,
				});
				// Small delay to ensure distinct mtime
				await new Promise((r) => setTimeout(r, 10));
			}

			// 2. Create 6 weekly backups
			for (let i = 0; i < 6; i++) {
				await createCloudBackup({
					mnemonic,
					orgId: TEST_ORG_ID,
					ogrn: TEST_OGRN,
					payload: Buffer.from(`Weekly backup payload ${i}`),
					backupType: "weekly",
					storage,
				});
				await new Promise((r) => setTimeout(r, 10));
			}

			// 3. Create 15 monthly backups
			let lastMonthlyBackup;
			for (let i = 0; i < 15; i++) {
				lastMonthlyBackup = await createCloudBackup({
					mnemonic,
					orgId: TEST_ORG_ID,
					ogrn: TEST_OGRN,
					payload: Buffer.from(`Monthly backup payload ${i}`),
					backupType: "monthly",
					storage,
				});
				await new Promise((r) => setTimeout(r, 10));
			}

			// Automatic rotation occurred on each backup creation
			assert.ok(lastMonthlyBackup?.rotation.deleted.length! > 0, "createCloudBackup must prune excess backups during rotation");

			// Add an extra unrotated file directly to test explicit rotateCloudBackups invocation
			await storage.upload(`backups/${TEST_ORG_ID}/daily/dente_daily_000000000_old.dente.enc`, Buffer.from("old"));
			const explicitRotation = await rotateCloudBackups(storage, TEST_ORG_ID);
			assert.ok(explicitRotation.deleted.length > 0, "Explicit rotateCloudBackups must prune extra old files");

			const allInStorage = await storage.list(`backups/${TEST_ORG_ID}/`);
			const dailyCount = allInStorage.filter((b) => b.backupType === "daily").length;
			const weeklyCount = allInStorage.filter((b) => b.backupType === "weekly").length;
			const monthlyCount = allInStorage.filter((b) => b.backupType === "monthly").length;

			assert.strictEqual(dailyCount, 7, "Must retain exactly 7 daily backups");
			assert.strictEqual(weeklyCount, 4, "Must retain exactly 4 weekly backups");
			assert.strictEqual(monthlyCount, 12, "Must retain exactly 12 monthly backups");

			fs.rmSync(tempDir, { recursive: true, force: true });
		});
	});

	describe("6. Disaster Recovery Simulation (RTO <= 8 min, RPO <= 15 min)", () => {
		it("runs complete automated disaster recovery protocol from cloud backup", async () => {
			const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dente-dr-test-"));
			const storage = new LocalMockS3Adapter(tempDir);
			const mnemonic = generateMnemonic();

			// Generate a simulated complete database dump
			const simulatedSqlDump = Buffer.from(
				"-- DENTE CRM Complete PostgreSQL 18 Clinical Dump\n" +
				"CREATE TABLE clinical_records (id text primary key, diagnosis text);\n" +
				"INSERT INTO clinical_records VALUES ('rec-1', 'K02.1'), ('rec-2', 'K04.0');\n" +
				"-- PostgreSQL database dump complete\n",
				"utf8",
			);

			// Clinic uploads snapshot
			const backup = await createCloudBackup({
				mnemonic,
				orgId: TEST_ORG_ID,
				ogrn: TEST_OGRN,
				payload: simulatedSqlDump,
				backupType: "daily",
				storage,
				dumpStats: { copyBlocks: 1, dataRows: 2, populatedTables: 1 },
			});

			// Equipment dies. Doctor runs Disaster Recovery script on clean laptop
			const recovery = await runDisasterRecovery({
				mnemonic,
				orgId: TEST_ORG_ID,
				ogrn: TEST_OGRN,
				storage,
				dryRun: true, // Simulation dry-run
				silent: true,
			});

			assert.strictEqual(recovery.success, true, "Disaster recovery must succeed");
			assert.strictEqual(recovery.backupKey, backup.key);
			assert.ok(recovery.rtoSeconds < 480, `RTO must be <= 480s (8 min), got ${recovery.rtoSeconds}s`);
			assert.ok(recovery.rpoMinutes < 15, `RPO must be <= 15 min, got ${recovery.rpoMinutes} min`);
			assert.ok(recovery.verificationReport.includes("Zero-Knowledge соответствие 152-ФЗ"));

			fs.rmSync(tempDir, { recursive: true, force: true });
		});
	});
});
