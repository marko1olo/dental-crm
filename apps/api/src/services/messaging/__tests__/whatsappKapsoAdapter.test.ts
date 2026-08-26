/**
 * WhatsApp Meta Cloud API & Kapso Adapter Unit Tests
 */

import { strict as assert } from "node:assert";
import { createHmac } from "node:crypto";
import { describe, it } from "node:test";
import {
	buildInteractiveButtonsPayload,
	buildNamedComponents,
	buildTemplatePayload,
	buildTextPayload,
	verifyWebhookSignature,
	WhatsappKapsoAdapter,
} from "../whatsappKapsoAdapter.js";

describe("WhatsApp Kapso Adapter Unit Tests", () => {
	it("builds named components skipping internal keys", () => {
		const context = {
			patient_name: "Анна Иванова",
			appointment_date: "15.09.2026",
			appointment_time: "14:30",
			locale: "ru",
			password: "secret_password",
			token: "token123",
		};

		const components = buildNamedComponents(context);
		assert.equal(components.length, 1);
		assert.equal(components[0]?.type, "body");
		assert.equal(components[0]?.parameters.length, 3);

		const paramNames = components[0]?.parameters.map((p) => p.parameter_name);
		assert.deepEqual(paramNames, ["patient_name", "appointment_date", "appointment_time"]);
	});

	it("builds correct Meta template payload", () => {
		const components = buildNamedComponents({ patient_name: "Иван" });
		const payload = buildTemplatePayload("+79161234567", "appointment_reminder", "ru", components);

		assert.equal(payload.messaging_product, "whatsapp");
		assert.equal(payload.recipient_type, "individual");
		assert.equal(payload.to, "+79161234567");
		assert.equal(payload.type, "template");
		assert.deepEqual(payload.template, {
			name: "appointment_reminder",
			language: { code: "ru" },
			components,
		});
	});

	it("builds free-form session text payload", () => {
		const payload = buildTextPayload("+79161234567", "Здравствуйте, ваша запись подтверждена.");
		assert.equal(payload.type, "text");
		assert.deepEqual(payload.text, {
			preview_url: false,
			body: "Здравствуйте, ваша запись подтверждена.",
		});
	});

	it("builds interactive button message payload", () => {
		const buttons = [
			{ id: "CONFIRM_YES", title: "Подтверждаю" },
			{ id: "CONFIRM_NO", title: "Отмена" },
		];
		const payload = buildInteractiveButtonsPayload("+79161234567", "Подтвердите ваш визит:", buttons);

		assert.equal(payload.type, "interactive");
		const interactive = payload.interactive as Record<string, unknown>;
		assert.equal(interactive.type, "button");
		const action = interactive.action as { buttons: Array<{ type: string; reply: { id: string; title: string } }> };
		assert.equal(action.buttons.length, 2);
		assert.equal(action.buttons[0]?.reply.id, "CONFIRM_YES");
		assert.equal(action.buttons[0]?.reply.title, "Подтверждаю");
	});

	it("verifies valid HMAC-SHA256 signature using constant-time comparison", () => {
		const secret = "super_webhook_secret_key_123";
		const rawBody = JSON.stringify({ event: "test", timestamp: 1724716800 });
		const validSig = createHmac("sha256", secret).update(rawBody).digest("hex");

		// Valid with prefix
		assert.equal(verifyWebhookSignature(rawBody, `sha256=${validSig}`, secret), true);
		// Valid without prefix
		assert.equal(verifyWebhookSignature(rawBody, validSig, secret), true);

		// Invalid signature
		assert.equal(verifyWebhookSignature(rawBody, "sha256=deadbeef12345678", secret), false);
		// Wrong secret
		assert.equal(verifyWebhookSignature(rawBody, `sha256=${validSig}`, "wrong_secret"), false);
		// Empty signature
		assert.equal(verifyWebhookSignature(rawBody, null, secret), false);
	});

	it("parses Kapso simplified webhook payload for inbound message", () => {
		const adapter = new WhatsappKapsoAdapter();
		const webhookBody = {
			phone_number_id: "PNID_TEST",
			message: {
				id: "wamid.inbound.1001",
				from: "+79169998877",
				type: "text",
				text: { body: "Я подтверждаю запись" },
				kapso: { direction: "inbound", content: "Я подтверждаю запись" },
			},
		};

		const parsed = adapter.parseWebhook(webhookBody, "org-uuid-1");
		assert.equal(parsed.inboundMessages.length, 1);
		assert.equal(parsed.inboundMessages[0]?.providerMessageId, "wamid.inbound.1001");
		assert.equal(parsed.inboundMessages[0]?.fromAddress, "+79169998877");
		assert.equal(parsed.inboundMessages[0]?.bodyText, "Я подтверждаю запись");
		assert.equal(parsed.inboundMessages[0]?.channel, "whatsapp");
	});

	it("parses Meta standard webhook payload with interactive button reply", () => {
		const adapter = new WhatsappKapsoAdapter();
		const webhookBody = {
			object: "whatsapp_business_account",
			entry: [
				{
					id: "WABA_ID",
					changes: [
						{
							value: {
								messaging_product: "whatsapp",
								metadata: { phone_number_id: "123456" },
								messages: [
									{
										from: "79161112233",
										id: "wamid.btn.reply.1",
										timestamp: "1724716800",
										type: "interactive",
										interactive: {
											type: "button_reply",
											button_reply: {
												id: "APPT_CONFIRM",
												title: "Подтверждаю",
											},
										},
									},
								],
							},
							field: "messages",
						},
					],
				},
			],
		};

		const parsed = adapter.parseWebhook(webhookBody, "org-uuid-2");
		assert.equal(parsed.inboundMessages.length, 1);
		const msg = parsed.inboundMessages[0];
		assert.equal(msg?.providerMessageId, "wamid.btn.reply.1");
		assert.equal(msg?.fromAddress, "79161112233");
		assert.equal(msg?.bodyText, "Подтверждаю");
		assert.equal(msg?.interactivePayload?.type, "button_reply");
		assert.equal(msg?.interactivePayload?.buttonId, "APPT_CONFIRM");
	});

	it("parses delivery receipts from webhook status payload", () => {
		const adapter = new WhatsappKapsoAdapter();
		const webhookBody = {
			object: "whatsapp_business_account",
			entry: [
				{
					changes: [
						{
							value: {
								statuses: [
									{
										id: "wamid.outbound.555",
										status: "delivered",
										timestamp: "1724716850",
										recipient_id: "79161112233",
									},
									{
										id: "wamid.outbound.777",
										status: "read",
										timestamp: "1724716900",
										recipient_id: "79161112233",
									},
								],
							},
						},
					],
				},
			],
		};

		const parsed = adapter.parseWebhook(webhookBody, "org-uuid-1");
		assert.equal(parsed.deliveryReceipts.length, 2);
		assert.equal(parsed.deliveryReceipts[0]?.providerMessageId, "wamid.outbound.555");
		assert.equal(parsed.deliveryReceipts[0]?.status, "delivered");
		assert.equal(parsed.deliveryReceipts[1]?.providerMessageId, "wamid.outbound.777");
		assert.equal(parsed.deliveryReceipts[1]?.status, "read");
	});
});
