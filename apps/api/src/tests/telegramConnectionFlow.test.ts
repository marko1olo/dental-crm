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

	describe("2. TelegramAccountService: Phone Normalization & Code Flow", () => {
		it("normalizes phone numbers to standard E.164 (+7...)", () => {
			assert.strictEqual(TelegramAccountService.normalizePhone("+7 (999) 123-45-67"), "+79991234567");
			assert.strictEqual(TelegramAccountService.normalizePhone("89991234567"), "+79991234567");
			assert.strictEqual(TelegramAccountService.normalizePhone("9991234567"), "+79991234567");
		});

		it("requests 5-digit verification code with timeout", async () => {
			const res = await TelegramAccountService.requestCode({
				organizationId: orgA,
				phone: "+7 999 111-22-33",
			});

			assert.strictEqual(res.ok, true);
			assert.strictEqual(res.formattedPhone, "+79991112233");
			assert.strictEqual(res.timeoutSeconds, 120);
			assert.ok(res.phoneCodeHash.length > 10);
			assert.ok(res.testCode && res.testCode.length === 5);
		});

		it("rejects invalid or wrong verification code", async () => {
			const req = await TelegramAccountService.requestCode({
				organizationId: orgA,
				phone: "+7 999 333-44-55",
			});

			const verify = await TelegramAccountService.verifyCode({
				organizationId: orgA,
				phone: "+7 999 333-44-55",
				phoneCodeHash: req.phoneCodeHash,
				code: "00000",
			});

			assert.strictEqual(verify.ok, false);
			assert.strictEqual(verify.connected, false);
			assert.match(verify.error ?? "", /Неверный или просроченный код/);
		});

		it("successfully verifies valid code and connects personal account", async () => {
			const req = await TelegramAccountService.requestCode({
				organizationId: orgA,
				phone: "+7 999 555-66-77",
			});

			assert.ok(req.testCode);
			const verify = await TelegramAccountService.verifyCode({
				organizationId: orgA,
				phone: "+7 999 555-66-77",
				phoneCodeHash: req.phoneCodeHash,
				code: req.testCode,
			});

			assert.strictEqual(verify.ok, true);
			assert.strictEqual(verify.connected, true);
			assert.strictEqual(verify.requires2fa, false);
			assert.ok(verify.account);
			assert.strictEqual(verify.account.phone, "+79995556677");
			assert.strictEqual(verify.account.status, "online");

			// Check status
			const status = await TelegramAccountService.getAccountStatus({
				organizationId: orgA,
				phone: "+7 999 555-66-77",
			});
			assert.strictEqual(status.connected, true);
			assert.ok(status.account);
			assert.strictEqual(status.account.status, "online");

			// Disconnect
			const disc = await TelegramAccountService.disconnectAccount({
				organizationId: orgA,
				phone: "+7 999 555-66-77",
			});
			assert.strictEqual(disc.ok, true);

			const statusAfter = await TelegramAccountService.getAccountStatus({
				organizationId: orgA,
				phone: "+7 999 555-66-77",
			});
			assert.strictEqual(statusAfter.connected, false);
		});

		it("triggers 2FA flow when cloud password is required", async () => {
			// Phone ending in 2 simulates 2FA requirement
			const req = await TelegramAccountService.requestCode({
				organizationId: orgA,
				phone: "+7 999 777-88-92",
			});

			assert.ok(req.testCode);
			const verifyCodeRes = await TelegramAccountService.verifyCode({
				organizationId: orgA,
				phone: "+7 999 777-88-92",
				phoneCodeHash: req.phoneCodeHash,
				code: req.testCode,
			});

			assert.strictEqual(verifyCodeRes.ok, true);
			assert.strictEqual(verifyCodeRes.connected, false);
			assert.strictEqual(verifyCodeRes.requires2fa, true);

			// Submit 2FA password
			const verify2faRes = await TelegramAccountService.verify2fa({
				organizationId: orgA,
				phone: "+7 999 777-88-92",
				password: "ClinicMasterPassword2026",
			});

			assert.strictEqual(verify2faRes.ok, true);
			assert.strictEqual(verify2faRes.connected, true);
			assert.ok(verify2faRes.account);
			assert.strictEqual(verify2faRes.account.is2faEnabled, true);
		});
	});

	describe("3. TelegramAccountService: QR-Code Authentication", () => {
		it("generates tg://login QR-code payload and valid SVG matrix", async () => {
			const qr = await TelegramAccountService.requestQr({
				organizationId: orgA,
			});

			assert.strictEqual(qr.ok, true);
			assert.ok(qr.qrPayload.startsWith("tg://login?token="));
			assert.ok(qr.qrSvg.startsWith("<svg"));
			assert.ok(qr.qrSvg.includes("viewBox="));
			assert.strictEqual(qr.expiresIn, 120);

			// Confirm QR
			const confirm = await TelegramAccountService.confirmQr({
				organizationId: orgA,
				token: qr.token,
				phone: "+7 999 444-33-22",
			});

			assert.strictEqual(confirm.ok, true);
			assert.strictEqual(confirm.connected, true);
			assert.ok(confirm.account);
			assert.strictEqual(confirm.account.phone, "+79994443322");
			assert.strictEqual(confirm.account.status, "online");
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
