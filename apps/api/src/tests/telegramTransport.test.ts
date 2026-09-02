import assert from "node:assert";
import { afterEach, describe, mock, test } from "node:test";
import { sendTelegramPhotoMessage, sendTelegramTextMessage } from "../telegramTransport.js";

describe("sendTelegramTextMessage", () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
		mock.restoreAll();
	});

	const baseInput = {
		botToken: "fake_bot_token",
		chatId: "fake_chat_id",
		text: "Hello, World!",
	};

	test("handles successful response", async () => {
		globalThis.fetch = mock.fn(async () => {
			return new Response(JSON.stringify({ result: { message_id: 12345 } }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		}) as any;

		const result = await sendTelegramTextMessage(baseInput);

		assert.deepStrictEqual(result, {
			ok: true,
			telegramMessageId: 12345,
			retryAfterSeconds: null,
			errorCode: null,
			errorClass: null,
		});
	});

	test("handles rate limit error (429) with retry_after", async () => {
		globalThis.fetch = mock.fn(async () => {
			return new Response(JSON.stringify({ parameters: { retry_after: 42 } }), {
				status: 429,
				headers: { "content-type": "application/json" },
			});
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		}) as any;

		const result = await sendTelegramTextMessage(baseInput);

		assert.deepStrictEqual(result, {
			ok: false,
			telegramMessageId: null,
			retryAfterSeconds: 42,
			errorCode: 429,
			errorClass: "rate_limited",
		});
	});

	test("handles auth error (401)", async () => {
		globalThis.fetch = mock.fn(async () => {
			return new Response(JSON.stringify({}), {
				status: 401,
				headers: { "content-type": "application/json" },
			});
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		}) as any;

		const result = await sendTelegramTextMessage(baseInput);

		assert.deepStrictEqual(result, {
			ok: false,
			telegramMessageId: null,
			retryAfterSeconds: null,
			errorCode: 401,
			errorClass: "auth",
		});
	});

	test("handles timeout error (AbortError)", async () => {
		globalThis.fetch = mock.fn(async () => {
			const error = new DOMException("The operation was aborted", "AbortError");
			throw error;
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		}) as any;

		const result = await sendTelegramTextMessage(baseInput);

		assert.deepStrictEqual(result, {
			ok: false,
			telegramMessageId: null,
			retryAfterSeconds: null,
			errorCode: null,
			errorClass: "timeout",
		});
	});

	test("handles generic network error", async () => {
		globalThis.fetch = mock.fn(async () => {
			throw new Error("Network failure");
			// biome-ignore lint/suspicious/noExplicitAny: automated suppression
		}) as any;

		const result = await sendTelegramTextMessage(baseInput);

		assert.deepStrictEqual(result, {
			ok: false,
			telegramMessageId: null,
			retryAfterSeconds: null,
			errorCode: null,
			errorClass: "network",
		});
	});

	test("152-FZ / 323-ФЗ: blocks outgoing message with clinical diagnosis before sending to Telegram socket", async () => {
		let fetchCalled = false;
		globalThis.fetch = mock.fn(async () => {
			fetchCalled = true;
			return new Response(JSON.stringify({ result: { message_id: 1 } }), { status: 200 });
			// biome-ignore lint/suspicious/noExplicitAny: test mock
		}) as any;

		const result = await sendTelegramTextMessage({
			botToken: "fake_token",
			chatId: "12345",
			text: "Здравствуйте, Иван! У вас острый пульпит зуба 46 и кариес. Ждем на лечение.",
		});

		assert.strictEqual(fetchCalled, false, "Запрос к Telegram Bot API не должен выполняться при утечке тайны");
		assert.strictEqual(result.ok, false);
		assert.strictEqual(result.errorClass, "medical_secrecy_violation");
		assert.strictEqual(result.errorCode, 422);
		assert.ok(result.details?.includes("врачебной тайны"));
	});

	test("152-FZ / 323-ФЗ: blocks photo message with clinical diagnosis in caption", async () => {
		let fetchCalled = false;
		globalThis.fetch = mock.fn(async () => {
			fetchCalled = true;
			return new Response(JSON.stringify({ result: { message_id: 2 } }), { status: 200 });
			// biome-ignore lint/suspicious/noExplicitAny: test mock
		}) as any;

		const result = await sendTelegramPhotoMessage({
			botToken: "fake_token",
			chatId: "12345",
			photoUrl: "https://clinic.example.com/xray.jpg",
			caption: "Снимок КЛКТ: обнаружен периодонтит зуба 26 и гранулема.",
		});

		assert.strictEqual(fetchCalled, false);
		assert.strictEqual(result.ok, false);
		assert.strictEqual(result.errorClass, "medical_secrecy_violation");
		assert.strictEqual(result.errorCode, 422);
	});
});
