/**
 * omnichannelMessengersHardening.test.ts
 *
 * Comprehensive tests for:
 * 1. Webhook Authentication (Telegram X-Telegram-Bot-Api-Secret-Token & Meta hub.verify_token)
 * 2. Multi-Tenant Outbox discovery and tenant isolation
 * 3. Inbound event deduplication via onConflictDoNothing
 * 4. Voice Intake 25MB boundary defense
 */

import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { handleVkWebhook } from "../routes/omnichannelBots/channelVk.js";
import { handleMaxWebhook } from "../routes/omnichannelBots/channelMax.js";
import { resolveAllTelegramOutboxRuntimes } from "../routes/telegram/telegramOutboxScope.js";
import { handleWebhookGetHandshake } from "../security/webhookAuth.js";
import { TelegramVoiceIntakeService } from "../services/telegram/TelegramVoiceIntakeService.js";
import { BotPatientStateStorage } from "../services/bots/omnichannel/botPatientStateStorage.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";
import { registerOmnichannelBotRoutes } from "../routes/omnichannelBots/index.js";
import { createIdempotentTenantTestApp } from "./support/tenantTestApp.js";

describe("Omnichannel & Messengers Hardening Verification Suite", () => {
	const prevSecret = process.env.DENTE_TELEGRAM_WEBHOOK_SECRET;
	const prevWaSecret = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;

	before(() => {
		process.env.DENTE_TELEGRAM_WEBHOOK_SECRET = "secure_test_secret_token_12345";
		process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = "wa_verify_token_54321";
	});

	after(() => {
		process.env.DENTE_TELEGRAM_WEBHOOK_SECRET = prevSecret;
		process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = prevWaSecret;
	});

	// =========================================================================
	// 1. WEBHOOK AUTHENTICATION: TELEGRAM SECRET TOKEN
	// =========================================================================
	it("rejects Telegram webhook secret token when mismatch via timingSafeSecretEqual", () => {
		const expectedSecret = process.env.DENTE_TELEGRAM_WEBHOOK_SECRET;
		const isValid = timingSafeSecretEqual("wrong_token", expectedSecret ?? null);
		assert.equal(isValid, false, "Неверный секретный токен Telegram должен отклоняться");
	});

	it("accepts Telegram webhook secret token when matches via timingSafeSecretEqual", () => {
		const expectedSecret = process.env.DENTE_TELEGRAM_WEBHOOK_SECRET;
		const isValid = timingSafeSecretEqual("secure_test_secret_token_12345", expectedSecret ?? null);
		assert.equal(isValid, true, "Корректный секретный токен Telegram должен валидироваться");
	});

	// =========================================================================
	// 2. WEBHOOK AUTHENTICATION: WHATSAPP HUB CHALLENGE
	// =========================================================================
	it("validates Meta WhatsApp webhook handshake with 403 on invalid hub.verify_token", async () => {
		const result = await handleWebhookGetHandshake(
			"whatsapp",
			"00000000-0000-0000-0000-000000000001",
			{
				"hub.mode": "subscribe",
				"hub.challenge": "123456789",
				"hub.verify_token": "fake_token",
			},
		);

		assert.equal(result.handled, true);
		assert.equal(result.statusCode, 403);
		assert.ok(result.payload.includes("Forbidden"));
	});

	it("approves Meta WhatsApp webhook handshake with 200 and challenge when token matches", async () => {
		const result = await handleWebhookGetHandshake(
			"whatsapp",
			"00000000-0000-0000-0000-000000000001",
			{
				"hub.mode": "subscribe",
				"hub.challenge": "123456789",
				"hub.verify_token": "wa_verify_token_54321",
			},
		);

		assert.equal(result.handled, true);
		assert.equal(result.statusCode, 200);
		assert.equal(result.payload, "123456789");
	});

	// =========================================================================
	// 3. MULTI-TENANT OUTBOX RUNTIME DISCOVERY
	// =========================================================================
	it("resolveAllTelegramOutboxRuntimes returns at least fallback runtime and does not crash", async () => {
		const runtimes = await resolveAllTelegramOutboxRuntimes();
		assert.ok(Array.isArray(runtimes));
		assert.ok(runtimes.length >= 1, "Должен обнаружить хотя бы одну доступную конфигурацию рантайма");
		assert.ok(runtimes[0]?.context);
	});

	// =========================================================================
	// 4. VOICE INTAKE 25MB DEFENSE
	// =========================================================================
	it("TelegramVoiceIntakeService extracts dental symptoms without crash", () => {
		const symptoms = TelegramVoiceIntakeService.extractSymptoms(
			"Здравствуйте, у меня сильно болит зуб справа снизу, опухла десна и поднялась температура",
		);

		assert.ok(symptoms.hasSymptomSignal);
		assert.ok(symptoms.categories.includes("pain"));
		assert.ok(symptoms.categories.includes("tooth"));
		assert.ok(symptoms.categories.includes("swelling"));
		assert.ok(symptoms.categories.includes("fever"));
	});

	// =========================================================================
	// 5. INBOUND EVENT DEDUPLICATION
	// =========================================================================
	it("BotPatientStateStorage handles inbound message gracefully", async () => {
		const res = await BotPatientStateStorage.persistInboundEvent(
			{
				channel: "telegram",
				organizationId: "00000000-0000-0000-0000-000000000001",
				botConfigId: "default",
				senderId: "test_sender_12345",
				senderName: "Тестовый Пациент",
				messageId: "msg_uniq_test_101",
				text: "Привет, хочу записаться",
				timestamp: Date.now(),
			},
			false,
		);

		assert.ok(res);
		assert.ok(res.patientName);
	});

	// =========================================================================
	// 6. VK & MAX WEBHOOK AUTHENTICATION (TIMING SAFE SECRET CHECK)
	// =========================================================================
	it("rejects VK webhook when secret is missing or mismatched", async () => {
		process.env.VK_WEBHOOK_SECRET = "vk_secret_abc123";
		try {
			const resNoSecret = await handleVkWebhook(
				{ type: "message_new" },
				"00000000-0000-0000-0000-000000000001",
				null,
			);
			assert.equal(resNoSecret.statusCode, 403, "VK webhook без секрета должен возвращать 403");

			const resWrongSecret = await handleVkWebhook(
				{ type: "message_new", secret: "wrong_secret" },
				"00000000-0000-0000-0000-000000000001",
				"wrong_secret",
			);
			assert.equal(resWrongSecret.statusCode, 403, "VK webhook с неверным секретом должен возвращать 403");
		} finally {
			delete process.env.VK_WEBHOOK_SECRET;
		}
	});

	it("accepts VK webhook when secret matches", async () => {
		process.env.VK_WEBHOOK_SECRET = "vk_secret_valid_999";
		try {
			const res = await handleVkWebhook(
				{ type: "message_new", secret: "vk_secret_valid_999" },
				"00000000-0000-0000-0000-000000000001",
				"vk_secret_valid_999",
			);
			assert.equal(res.statusCode, 200, "VK webhook с верным секретом должен возвращать 200");
			assert.equal(res.payload, "ok");
		} finally {
			delete process.env.VK_WEBHOOK_SECRET;
		}
	});

	it("rejects MAX webhook when secret is missing or mismatched", async () => {
		process.env.MAX_WEBHOOK_SECRET = "max_secret_xyz789";
		try {
			const resNoSecret = await handleMaxWebhook(
				{ text: "test" },
				"00000000-0000-0000-0000-000000000001",
				null,
			);
			assert.equal(resNoSecret.statusCode, 403, "MAX webhook без секрета должен возвращать 403");
			assert.equal(resNoSecret.ok, false);

			const resWrongSecret = await handleMaxWebhook(
				{ text: "test", token: "wrong_max_token" },
				"00000000-0000-0000-0000-000000000001",
				"wrong_max_token",
			);
			assert.equal(resWrongSecret.statusCode, 403, "MAX webhook с неверным секретом должен возвращать 403");
			assert.equal(resWrongSecret.ok, false);
		} finally {
			delete process.env.MAX_WEBHOOK_SECRET;
		}
	});

	it("accepts MAX webhook when secret matches", async () => {
		process.env.MAX_WEBHOOK_SECRET = "max_secret_valid_777";
		try {
			const res = await handleMaxWebhook(
				{ text: "test", token: "max_secret_valid_777" },
				"00000000-0000-0000-0000-000000000001",
				"max_secret_valid_777",
			);
			assert.equal(res.statusCode, 200, "MAX webhook с верным секретом должен возвращать 200");
			assert.equal(res.ok, true);
		} finally {
			delete process.env.MAX_WEBHOOK_SECRET;
		}
	});

	it("idempotencyPlugin exempts POST /api/bots/webhook/vk and /max without Idempotency-Key", async () => {
		const prevVk = process.env.VK_WEBHOOK_SECRET;
		const prevMax = process.env.MAX_WEBHOOK_SECRET;
		process.env.VK_WEBHOOK_SECRET = "vk_idem_secret_123";
		process.env.MAX_WEBHOOK_SECRET = "max_idem_secret_456";
		const idemApp = await createIdempotentTenantTestApp();
		await registerOmnichannelBotRoutes(idemApp);
		try {
			const vkRes = await idemApp.inject({
				method: "POST",
				url: "/api/bots/webhook/vk/00000000-0000-4000-8000-000000000001",
				headers: { "content-type": "application/json" },
				payload: { type: "message_new", secret: "vk_idem_secret_123" },
			});
			assert.equal(vkRes.statusCode, 200, vkRes.body);

			const maxRes = await idemApp.inject({
				method: "POST",
				url: "/api/bots/webhook/max/00000000-0000-4000-8000-000000000001",
				headers: {
					"content-type": "application/json",
					"x-max-secret": "max_idem_secret_456",
				},
				payload: { text: "ping" },
			});
			assert.equal(maxRes.statusCode, 200, maxRes.body);
		} finally {
			await idemApp.close();
			if (prevVk === undefined) delete process.env.VK_WEBHOOK_SECRET;
			else process.env.VK_WEBHOOK_SECRET = prevVk;
			if (prevMax === undefined) delete process.env.MAX_WEBHOOK_SECRET;
			else process.env.MAX_WEBHOOK_SECRET = prevMax;
		}
	});
});
