import assert from "node:assert";
import { afterEach, describe, mock, test } from "node:test";
import {
	normalizeWhatsappRecipient,
	readWhatsappCredentials,
	sendWhatsappTextMessage,
} from "../whatsappTransport.js";

describe("sendWhatsappTextMessage & 152-FZ Secrecy Defense", () => {
	const originalFetch = globalThis.fetch;

	afterEach(() => {
		globalThis.fetch = originalFetch;
		mock.restoreAll();
	});

	const baseInput = {
		phoneNumberId: "10987654321",
		accessToken: "test_access_token_secret",
		toPhoneE164: "79161234567",
		text: "Здравствуйте! Напоминаем о вашей записи на прием завтра в 14:00.",
	};

	test("readWhatsappCredentials: parses valid credentials", () => {
		const creds = readWhatsappCredentials({
			phoneNumberId: "123456",
			accessToken: "abc_token",
		});
		assert.deepStrictEqual(creds, {
			phoneNumberId: "123456",
			accessToken: "abc_token",
		});

		assert.strictEqual(readWhatsappCredentials({ phoneNumberId: "", accessToken: "abc" }), null);
		assert.strictEqual(readWhatsappCredentials({ phoneNumberId: "123", accessToken: "  " }), null);
	});

	test("normalizeWhatsappRecipient: normalizes Russian phone numbers", () => {
		assert.strictEqual(normalizeWhatsappRecipient("+7 (916) 123-45-67"), "79161234567");
		assert.strictEqual(normalizeWhatsappRecipient("8 (916) 123-45-67"), "79161234567");
		assert.strictEqual(normalizeWhatsappRecipient("123"), null);
	});

	test("sendWhatsappTextMessage: successful delivery returns providerMessageId", async () => {
		globalThis.fetch = mock.fn(async () => {
			return new Response(
				JSON.stringify({
					messages: [{ id: "wamid.HBgLMTIzNDU2Nzg5MA==" }],
				}),
				{
					status: 200,
					headers: { "content-type": "application/json" },
				},
			);
			// biome-ignore lint/suspicious/noExplicitAny: test mock
		}) as any;

		const result = await sendWhatsappTextMessage(baseInput);

		assert.strictEqual(result.ok, true);
		assert.strictEqual(result.providerMessageId, "wamid.HBgLMTIzNDU2Nzg5MA==");
		assert.strictEqual(result.errorCode, null);
	});

	test("sendWhatsappTextMessage: 152-FZ blocks clinical diagnosis before sending to Meta API", async () => {
		let fetchCalled = false;
		globalThis.fetch = mock.fn(async () => {
			fetchCalled = true;
			return new Response(JSON.stringify({ messages: [{ id: "should_not_be_called" }] }), {
				status: 200,
			});
			// biome-ignore lint/suspicious/noExplicitAny: test mock
		}) as any;

		const result = await sendWhatsappTextMessage({
			...baseInput,
			text: "Здравствуйте! У вас обнаружен кариес 36 зуба и глубокий пульпит. Ждем в клинике.",
		});

		assert.strictEqual(fetchCalled, false, "Запрос к Meta WhatsApp Cloud API не должен происходить при наличии диагнозов");
		assert.strictEqual(result.ok, false);
		assert.strictEqual(result.errorClass, "medical_secrecy_violation");
		assert.strictEqual(result.errorCode, 422);
		assert.ok(result.errorMessage.includes("врачебной тайны"));
		assert.ok(result.errorMessage.includes("кариес"));
		assert.ok(result.errorMessage.includes("пульпит"));
	});

	test("sendWhatsappTextMessage: 152-FZ blocks ICD-10 code (K02.1)", async () => {
		let fetchCalled = false;
		globalThis.fetch = mock.fn(async () => {
			fetchCalled = true;
			return new Response(JSON.stringify({}), { status: 200 });
			// biome-ignore lint/suspicious/noExplicitAny: test mock
		}) as any;

		const result = await sendWhatsappTextMessage({
			...baseInput,
			text: "У вас установлен диагноз K02.1, требуется немедленное препарирование.",
		});

		assert.strictEqual(fetchCalled, false);
		assert.strictEqual(result.ok, false);
		assert.strictEqual(result.errorClass, "medical_secrecy_violation");
		assert.strictEqual(result.errorCode, 422);
	});
});
