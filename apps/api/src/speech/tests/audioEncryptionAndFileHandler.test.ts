import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	decryptAudioBuffer,
	deriveTenantAudioKey,
	encryptAudioBuffer,
	packEncryptedAudio,
	unpackEncryptedAudio,
} from "../audioStorage/audioEncryption.js";
import {
	buildSecureAudioStoragePath,
	queueDurableRecordingWrite,
	validateAudioBuffer,
	validateAudioMimeType,
} from "../audioStorage/audioFileHandler.js";

describe("🛡️ Audio Storage Encryption & File Handler Unit Tests", () => {
	describe("1. AES-256-GCM Tenant Audio Encryption", () => {
		it("derives distinct 32-byte encryption keys for different tenants", () => {
			const org1 = "org-uuid-1111";
			const org2 = "org-uuid-2222";
			const key1 = deriveTenantAudioKey(org1);
			const key2 = deriveTenantAudioKey(org2);

			assert.strictEqual(key1.length, 32);
			assert.strictEqual(key2.length, 32);
			assert.notDeepStrictEqual(key1, key2);
		});

		it("encrypts, packs, unpacks, and decrypts audio payload byte-for-byte", () => {
			const orgId = "tenant-clinic-101";
			const key = deriveTenantAudioKey(orgId);
			const rawAudio = Buffer.from("RIFF_WAV_FAKE_AUDIO_DATA_FOR_CLINICAL_DICTATION_12345");
			const aad = Buffer.from("tenant:tenant-clinic-101;rec:rec-42");

			const encrypted = encryptAudioBuffer(rawAudio, key, aad);
			assert.strictEqual(encrypted.algorithm, "aes-256-gcm");
			assert.strictEqual(encrypted.iv.length, 12);
			assert.strictEqual(encrypted.authTag.length, 16);
			assert.notDeepStrictEqual(encrypted.ciphertext, rawAudio);

			const packed = packEncryptedAudio(encrypted);
			assert.ok(packed.length > encrypted.ciphertext.length + 28);

			const unpacked = unpackEncryptedAudio(packed);
			assert.deepStrictEqual(unpacked.iv, encrypted.iv);
			assert.deepStrictEqual(unpacked.authTag, encrypted.authTag);
			assert.deepStrictEqual(unpacked.ciphertext, encrypted.ciphertext);

			const decrypted = decryptAudioBuffer(unpacked, key, aad);
			assert.deepStrictEqual(decrypted, rawAudio);
		});

		it("fails authentication tag check when ciphertext or AAD is tampered", () => {
			const key = deriveTenantAudioKey("tenant-tamper-test");
			const rawAudio = Buffer.from("CONFIDENTIAL_PATIENT_MEDICAL_RECORD_VOICE");
			const aad = Buffer.from("visit-777");

			const encrypted = encryptAudioBuffer(rawAudio, key, aad);
			// Подменяем 1 байт шифротекста
			encrypted.ciphertext[0] = (encrypted.ciphertext[0]! ^ 0xff);

			assert.throws(() => {
				decryptAudioBuffer(encrypted, key, aad);
			}, /Unsupported state or unable to authenticate data/);
		});
	});

	describe("2. Audio File Validation & Path Security", () => {
		it("validates permissible audio MIME types", () => {
			assert.strictEqual(validateAudioMimeType("audio/webm"), true);
			assert.strictEqual(validateAudioMimeType("audio/webm;codecs=opus"), true);
			assert.strictEqual(validateAudioMimeType("audio/wav"), true);
			assert.strictEqual(validateAudioMimeType("audio/opus"), true);
			assert.strictEqual(validateAudioMimeType("video/mp4"), false);
			assert.strictEqual(validateAudioMimeType("application/json"), false);
		});

		it("enforces non-empty and max buffer limits", () => {
			assert.throws(() => {
				validateAudioBuffer(Buffer.alloc(0));
			}, /Аудиофайл пуст/);

			const smallBuf = Buffer.alloc(1024);
			assert.doesNotThrow(() => validateAudioBuffer(smallBuf, 2048));

			assert.throws(() => {
				validateAudioBuffer(smallBuf, 512);
			}, /превышает допустимый лимит/);
		});

		it("prevents directory traversal attacks in buildSecureAudioStoragePath", () => {
			const baseDir = "C:\\Clinic_MVP\\dental-crm\\apps\\api\\.data\\audio";
			const safePath = buildSecureAudioStoragePath(baseDir, "org-01", "rec-01", ".webm");
			assert.ok(safePath.includes("org-01"));
			assert.ok(safePath.includes("rec-01.webm"));

			// Санитизация убирает ../ и опасные символы
			const sanitizedPath = buildSecureAudioStoragePath(baseDir, "../../../etc", "../../passwd", ".webm");
			assert.ok(sanitizedPath.startsWith(baseDir));
			assert.ok(!sanitizedPath.includes(".."));
		});
	});

	describe("3. Queue Serialization Invariant", () => {
		it("executes tasks sequentially per recordingId", async () => {
			const executionOrder: number[] = [];
			const recId = "rec-serial-test";

			const task1 = () => new Promise<void>((resolve) => {
				setTimeout(() => {
					executionOrder.push(1);
					resolve();
				}, 30);
			});

			const task2 = () => new Promise<void>((resolve) => {
				setTimeout(() => {
					executionOrder.push(2);
					resolve();
				}, 10);
			});

			await Promise.all([
				queueDurableRecordingWrite(recId, task1),
				queueDurableRecordingWrite(recId, task2),
			]);

			assert.deepStrictEqual(executionOrder, [1, 2]);
		});
	});
});
