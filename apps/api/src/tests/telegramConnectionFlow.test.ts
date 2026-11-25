import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TelegramTokenVault } from "../services/telegram/TelegramTokenVault.js";
import { TelegramAccountService } from "../services/telegram/TelegramAccountService.js";
import { TelegramBotHostingService } from "../services/telegram/TelegramBotHostingService.js";

describe("Telegram Connection & Security Suite (Bot + MTProto Personal Account)", () => {
	const orgA = "00000000-0000-0000-0000-000000000001";
	const orgB = "00000000-0000-0000-0000-000000000002";

	describe("1. TelegramTokenVault: AES-256-GCM & Tenant Isolation", () => {
		it("encrypts and decrypts bot token for the same tenant", () => {
			const rawToken = "7123456789:AAFn_SecretBotTokenSampleForClinic";
			const encrypted = TelegramTokenVault.encryptToken(rawToken, orgA);

			assert.ok(encrypted.startsWith("enc:v1:"));
			assert.notStrictEqual(encrypted, rawToken);

			const decrypted = TelegramTokenVault.decryptToken(encrypted, orgA);
			assert.strictEqual(decrypted, rawToken);
		});

		it("strictly fails decryption when accessed from a different tenant (Cross-Tenant Breach Defense)", () => {
			const rawToken = "7123456789:AAFn_SecretBotTokenSampleForClinic";
			const encrypted = TelegramTokenVault.encryptToken(rawToken, orgA);

			assert.throws(
				() => {
					TelegramTokenVault.decryptToken(encrypted, orgB);
				},
				/Ошибка криптографической аутентификации|AuthTag mismatch/i,
			);
		});

		it("masks tokens for safe logging and UI display", () => {
			assert.strictEqual(TelegramTokenVault.maskToken("7123456789:AAFn_xyz"), "7123****...");
			assert.strictEqual(TelegramTokenVault.maskToken("enc:v1:abc:def:123"), "enc:v1:****...");
			assert.strictEqual(TelegramTokenVault.maskToken(""), "");
		});
	});

	describe("2. TelegramAccountService: Phone Normalization & Honest Unconfigured MTProto", () => {
		it("normalizes phone numbers to standard E.164 (+7...)", () => {
			assert.strictEqual(TelegramAccountService.normalizePhone("+7 (999) 123-45-67"), "+79991234567");
			assert.strictEqual(TelegramAccountService.normalizePhone("89991234567"), "+79991234567");
			assert.strictEqual(TelegramAccountService.normalizePhone("9991234567"), "+79991234567");
		});

		it("rejects invalid phone number on requestCode", async () => {
			const res = await TelegramAccountService.requestCode({
				organizationId: orgA,
				phone: "123",
			});

			assert.strictEqual(res.ok, false);
			assert.match(res.error ?? "", /корректный номер телефона/i);
		});

		it("returns honest structured MTProtoNotConfigured refusal instead of simulating codes/sessions", async () => {
			const req = await TelegramAccountService.requestCode({
				organizationId: orgA,
				phone: "+7 999 111-22-33",
			});

			assert.strictEqual(req.ok, false);
			assert.strictEqual(req.configured, false);
			assert.strictEqual(req.errorCode, "MTProtoNotConfigured");
			assert.strictEqual((req as { testCode?: string }).testCode, undefined);

			const verify = await TelegramAccountService.verifyCode({
				organizationId: orgA,
				phone: "+7 999 555-66-77",
				phoneCodeHash: "hash",
				code: "12345",
			});

			assert.strictEqual(verify.ok, false);
			assert.strictEqual(verify.configured, false);
			assert.strictEqual(verify.connected, false);
			assert.strictEqual(verify.errorCode, "MTProtoNotConfigured");

			const verify2fa = await TelegramAccountService.verify2fa({
				organizationId: orgA,
				phone: "+7 999 777-88-92",
				password: "ClinicMasterPassword2026",
			});

			assert.strictEqual(verify2fa.ok, false);
			assert.strictEqual(verify2fa.configured, false);
			assert.strictEqual(verify2fa.connected, false);
			assert.strictEqual(verify2fa.errorCode, "MTProtoNotConfigured");
		});

		it("reads status and disconnects account cleanly via DB", async () => {
			const status = await TelegramAccountService.getAccountStatus({
				organizationId: orgA,
				phone: "+7 999 555-66-77",
			});
			assert.strictEqual(status.ok, true);
			assert.strictEqual(status.connected, false);

			const disc = await TelegramAccountService.disconnectAccount({
				organizationId: orgA,
				phone: "+7 999 555-66-77",
			});
			assert.strictEqual(disc.ok, true);
		});
	});

	describe("3. TelegramAccountService: Honest Unconfigured QR Authentication", () => {
		it("returns honest MTProtoNotConfigured for requestQr and confirmQr without faking sessions", async () => {
			const qr = await TelegramAccountService.requestQr({
				organizationId: orgA,
			});

			assert.strictEqual(qr.ok, false);
			assert.strictEqual(qr.configured, false);
			assert.strictEqual(qr.errorCode, "MTProtoNotConfigured");

			const confirm = await TelegramAccountService.confirmQr({
				organizationId: orgA,
				token: "any-token",
				phone: "+7 999 444-33-22",
			});

			assert.strictEqual(confirm.ok, false);
			assert.strictEqual(confirm.configured, false);
			assert.strictEqual(confirm.connected, false);
			assert.strictEqual(confirm.errorCode, "MTProtoNotConfigured");
		});
	});

	describe("4. TelegramBotHostingService: Bot Verification & Status", () => {
		it("rejects invalid bot token format", async () => {
			const res = await TelegramBotHostingService.connectBot({
				organizationId: orgA,
				botToken: "invalid_without_colon",
			});

			assert.strictEqual(res.ok, false);
			assert.match(res.error ?? "", /Некорректный формат токена/);
		});

		it("returns disconnected status when no bot is configured", async () => {
			const emptyOrg = "99999999-9999-9999-9999-999999999999";
			const status = await TelegramBotHostingService.getBotStatus({
				organizationId: emptyOrg,
			});

			assert.strictEqual(status.ok, true);
			assert.strictEqual(status.connected, false);
			assert.strictEqual(status.bot, null);
		});
	});
});
