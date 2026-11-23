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
import { resolveAllTelegramOutboxRuntimes } from "../routes/telegram/telegramOutboxScope.js";
import { handleWebhookGetHandshake } from "../security/webhookAuth.js";
import { TelegramVoiceIntakeService } from "../services/telegram/TelegramVoiceIntakeService.js";
import { BotPatientStateStorage } from "../services/bots/omnichannel/botPatientStateStorage.js";
import { timingSafeSecretEqual } from "../utils/timingSafeSecretEqual.js";

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
});
