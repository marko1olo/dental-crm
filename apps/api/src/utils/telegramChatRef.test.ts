import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	decryptTelegramChatId,
	encryptTelegramChatId,
	telegramChatEncryptionKey,
} from "./telegramChatRef.js";

describe("telegramChatRef", () => {
	const sampleHexBufStr = "0".repeat(64);
	const validKey32Base64 = Buffer.from("hello".repeat(6).slice(0, 32)).toString(
		"base64",
	);

	describe("telegramChatEncryptionKey", () => {
		test("returns null if no key is provided", () => {
			assert.strictEqual(telegramChatEncryptionKey({}), null);
			assert.strictEqual(
				telegramChatEncryptionKey({
					DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY: "   ",
				}),
				null,
			);
		});

		test("returns Buffer for 32-byte hex key", () => {
			const key = telegramChatEncryptionKey({
				DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY: sampleHexBufStr,
			});
			assert.ok(Buffer.isBuffer(key));
			assert.strictEqual(key?.length, 32);
		});

		test("returns Buffer for 32-byte base64 key", () => {
			const key = telegramChatEncryptionKey({
				DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY: validKey32Base64,
			});
			assert.ok(Buffer.isBuffer(key));
			assert.strictEqual(key?.length, 32);
		});

		test("returns Buffer for arbitrary password phrase (hashed)", () => {
			const key = telegramChatEncryptionKey({
				DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY: "my secret password",
			});
			assert.ok(Buffer.isBuffer(key));
			assert.strictEqual(key?.length, 32);
		});
	});

	describe("encrypt and decrypt", () => {
		const env = { DENTE_TELEGRAM_CHAT_ENCRYPTION_KEY: sampleHexBufStr };

		test("encrypt and decrypt a chat ID successfully", () => {
			const chatId = "123456789";
			const encrypted = encryptTelegramChatId(chatId, env);
			assert.ok(encrypted);
			assert.match(
				encrypted,
				/^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
			);

			const decrypted = decryptTelegramChatId(encrypted, env);
			assert.strictEqual(decrypted, chatId);
		});

		test("returns null if chatId is missing", () => {
			assert.strictEqual(encryptTelegramChatId(null, env), null);
			assert.strictEqual(decryptTelegramChatId(null, env), null);
		});

		test("returns null if key is missing", () => {
			const chatId = "123456789";
			const encrypted = encryptTelegramChatId(chatId, env);
			assert.strictEqual(encryptTelegramChatId(chatId, {}), null);
			if (encrypted) {
				assert.strictEqual(decryptTelegramChatId(encrypted, {}), null);
			}
		});

		test("returns null for malformed ref string", () => {
			assert.strictEqual(decryptTelegramChatId("invalid_format", env), null);
			assert.strictEqual(decryptTelegramChatId("v1.iv.tag", env), null);
			assert.strictEqual(
				decryptTelegramChatId("v2.iv.tag.encrypted", env),
				null,
			);
		});

		test("returns null for valid format but invalid base64 lengths", () => {
			const invalidIv = Buffer.alloc(10).toString("base64url");
			const validTag = Buffer.alloc(16).toString("base64url");
			const validEncrypted = Buffer.alloc(16).toString("base64url");
			assert.strictEqual(
				decryptTelegramChatId(
					`v1.${invalidIv}.${validTag}.${validEncrypted}`,
					env,
				),
				null,
			);

			const validIv = Buffer.alloc(12).toString("base64url");
			const invalidTag = Buffer.alloc(15).toString("base64url");
			assert.strictEqual(
				decryptTelegramChatId(
					`v1.${validIv}.${invalidTag}.${validEncrypted}`,
					env,
				),
				null,
			);
		});

		test("returns null when ciphertext is tampered with (fails auth tag validation)", () => {
			const encrypted = encryptTelegramChatId("123456789", env);
			assert.ok(encrypted);
			const parts = encrypted.split(".");
			const cipherText = parts[3] || "";

			// Change the last character of the ciphertext
			const tamperedCiphertext =
				cipherText.substring(0, cipherText.length - 1) +
				(cipherText.endsWith("a") ? "b" : "a");
			const tamperedRef = `v1.${parts[1]}.${parts[2]}.${tamperedCiphertext}`;

			assert.strictEqual(decryptTelegramChatId(tamperedRef, env), null);
		});

		test("returns null when tag is tampered with (fails auth tag validation)", () => {
			const encrypted = encryptTelegramChatId("123456789", env);
			assert.ok(encrypted);
			const parts = encrypted.split(".");

			const tamperedTagBuffer = Buffer.from(parts[2] || "", "base64url");
			tamperedTagBuffer[0] = (tamperedTagBuffer[0] || 0) ^ 1; // flip a bit
			const tamperedTag = tamperedTagBuffer.toString("base64url");
			const tamperedRef = `v1.${parts[1]}.${tamperedTag}.${parts[3]}`;

			assert.strictEqual(decryptTelegramChatId(tamperedRef, env), null);
		});
	});
});
