/**
 * cloudBackupEngine.test.ts — Comprehensive Test Suite for Zero-Knowledge Cloud Backup & Disaster Recovery
 *
 * ТЕСТОВОЕ ПОКРЫТИЕ (16 ТЕСТОВ + АУДИТ РЕДТИМА):
 * 1. Генерация и валидация мнемоники BIP-39 (12 слов, контрольная сумма SHA-256).
 * 2. Деривация мастер-ключа scrypt(mnemonic, salt="DENTE:" + ogrn + orgId).
 * 3. Потоковое сжатие gzip + AES-256-GCM Zero-Knowledge шифрование с AAD защитой заголовка.
 * 4. Полная проверка целостности GCM Auth Tag: гарантированное отклонение любых
 *    модифицированных, обрезанных или поддельных данных (152-ФЗ, Cryptographic Doom Principle).
 * 5. Ротация GFS: хранение 7 ежедневных, 4 еженедельных и 12 ежемесячных бэкапов.
 * 6. Полный сценарий Disaster Recovery: восстановление клиники по 12 словам за RTO <= 8 минут,
 *    с честным аудитом RPO и потоковым наложением без OOM.
 */

import assert from "node:assert";
import crypto from "node:crypto";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { runDisasterRecovery } from "../scripts/restoreDisasterRecovery.js";
import {
	BIP39_WORDLIST,
	DENTE_ZK_MAGIC,
	DENTE_ZK_VERSION,
	LocalMockS3Adapter,
	buildClinicSalt,
	createCloudBackup,
	deriveMasterKey,
	deriveMasterKeySync,
	generateMnemonic,
	mnemonicToEntropy,
	parseContainerHeader,
	restoreCloudBackup,
	restoreCloudBackupToFile,
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
			words[11] = words[11] === "zoo" ? "zone" : "zoo";
			const corrupted = words.join(" ");
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

	describe("3. Streaming AES-256-GCM Zero-Knowledge Encryption & Compression", () => {
		it("encrypts and decrypts realistic clinical data with gzip compression", async () => {
			const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dente-zk-test-"));
			const storage = new LocalMockS3Adapter(tempDir);
			const mnemonic = generateMnemonic();

			// Повторяющиеся клинические записи для наглядной проверки компрессии gzip
			const clinicalRecords = [];
			for (let i = 0; i < 200; i++) {
				clinicalRecords.push({
					id: `p-${i}`,
					fullName: `Пациент Тестовый-${i}`,
					snils: "123-456-789 00",
					diagnosis: "K02.1 Кариес дентина глубокий",
					anamnesis: "Жалобы на боли от термических раздражителей",
				});
			}

			const clinicalPayload = Buffer.from(JSON.stringify(clinicalRecords), "utf8");

			const backup = await createCloudBackup({
				mnemonic,
				orgId: TEST_ORG_ID,
				ogrn: TEST_OGRN,
				payload: clinicalPayload,
				backupType: "daily",
				storage,
				dumpStats: { copyBlocks: 4, dataRows: clinicalRecords.length, populatedTables: 3 },
			});

			assert.ok(backup.key.startsWith(`backups/${TEST_ORG_ID}/daily/`));
			// Сжатие gzip должно сократить объем данных в разы
			assert.ok(
				backup.size < clinicalPayload.length,
				`Gzip-сжатие должно уменьшить размер дампа (оригинал ${clinicalPayload.length}, сжатый ${backup.size})`,
			);

			// Проверка метаданных заголовка
			const rawBlob = await storage.downloadBuffer(backup.key);
			const { header } = parseContainerHeader(rawBlob);

			assert.strictEqual(header.magic, DENTE_ZK_MAGIC.trim());
			assert.strictEqual(header.version, DENTE_ZK_VERSION);
			assert.strictEqual(header.orgId, TEST_ORG_ID);
			assert.strictEqual(header.ogrn, TEST_OGRN);
			assert.strictEqual(header.compression, "gzip");
			assert.strictEqual(header.algorithm, "aes-256-gcm");

			// Расшифровка и декомпрессия
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

		it("encrypts and decrypts streaming SQL dump via verified file", async () => {
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

			const restoredFile = await restoreCloudBackupToFile({
				mnemonic,
				key: backup.key,
				storage,
			});

			const contentOnDisk = await fsPromises.readFile(restoredFile.verifiedPlaintextPath, "utf8");
			assert.strictEqual(contentOnDisk, sqlData.toString("utf8"));
			await fsPromises.unlink(restoredFile.verifiedPlaintextPath).catch(() => {});
			fs.rmSync(tempDir, { recursive: true, force: true });
		});
	});

	describe("4. Cryptographic Integrity & Anti-Doom Principle (152-ФЗ / GCM Auth Tag)", () => {
		it("detects and rejects ciphertext tampering without leaking unverified file", async () => {
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

			const tamperedBlob = Buffer.from(rawBlob);
			const ciphertextIndex = offset + 5;
			tamperedBlob[ciphertextIndex] = (tamperedBlob[ciphertextIndex] ?? 0) ^ 0xff;

			const targetSuspectPath = path.join(tempDir, "suspect.sql");

			await assert.rejects(
				async () => {
					await restoreCloudBackupToFile({
						mnemonic,
						orgId: TEST_ORG_ID,
						ogrn: TEST_OGRN,
						backupBuffer: tamperedBlob,
						targetPlaintextPath: targetSuspectPath,
						storage,
					});
				},
				/Unsupported state or unable to authenticate data|incorrect header check|Z_DATA_ERROR|Invalid GCM payload/i,
				"Tampered ciphertext must cause authentication failure",
			);

			// CRYPTOGRAPHIC DOOM PRINCIPLE CHECK:
			// Файл на диске ОБЯЗАН быть немедленно удален при ошибке аутентификации!
			assert.strictEqual(
				fs.existsSync(targetSuspectPath),
				false,
				"Unauthenticated file must NEVER remain on disk or be accessible to downstream psql",
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
						mnemonic: mnemonicBob,
						key: backup.key,
						storage,
					});
				},
				/Unsupported state or unable to authenticate data|incorrect header check|Z_DATA_ERROR/i,
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

			for (let i = 0; i < 10; i++) {
				await createCloudBackup({
					mnemonic,
					orgId: TEST_ORG_ID,
					ogrn: TEST_OGRN,
					payload: Buffer.from(`Daily backup payload ${i}`),
					backupType: "daily",
					storage,
				});
				await new Promise((r) => setTimeout(r, 10));
			}

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

			assert.ok(lastMonthlyBackup?.rotation.deleted.length! > 0, "createCloudBackup must prune excess backups during rotation");

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

	describe("6. Disaster Recovery Simulation (RTO <= 8 min, Honest RPO & Anti-Doom)", () => {
		it("runs complete automated disaster recovery protocol from cloud backup", async () => {
			const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "dente-dr-test-"));
			const storage = new LocalMockS3Adapter(tempDir);
			const mnemonic = generateMnemonic();

			const simulatedSqlDump = Buffer.from(
				"-- DENTE CRM Complete PostgreSQL 18 Clinical Dump\n" +
				"CREATE TABLE clinical_records (id text primary key, diagnosis text);\n" +
				"INSERT INTO clinical_records VALUES ('rec-1', 'K02.1'), ('rec-2', 'K04.0');\n" +
				"-- PostgreSQL database dump complete\n",
				"utf8",
			);

			const backup = await createCloudBackup({
				mnemonic,
				orgId: TEST_ORG_ID,
				ogrn: TEST_OGRN,
				payload: simulatedSqlDump,
				backupType: "daily",
				storage,
				dumpStats: { copyBlocks: 1, dataRows: 2, populatedTables: 1 },
			});

			const recovery = await runDisasterRecovery({
				mnemonic,
				orgId: TEST_ORG_ID,
				ogrn: TEST_OGRN,
				storage,
				dryRun: true,
				silent: true,
			});

			assert.strictEqual(recovery.success, true, "Disaster recovery must succeed");
			assert.strictEqual(recovery.backupKey, backup.key);
			assert.ok(recovery.rtoSeconds < 480, `RTO must be <= 480s (8 min), got ${recovery.rtoSeconds}s`);
			assert.ok(recovery.rpoMinutes < 15, `RPO must be <= 15 min, got ${recovery.rpoMinutes} min`);
			assert.ok(recovery.verificationReport.includes("Zero-Knowledge соответствие 152-ФЗ"));
			assert.ok(recovery.verificationReport.includes("Anti-Doom Principle"));

			fs.rmSync(tempDir, { recursive: true, force: true });
		});
	});
});
