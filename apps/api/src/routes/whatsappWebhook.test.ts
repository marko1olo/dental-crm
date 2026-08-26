/**
 * WhatsApp Webhook & Automated Appointment Confirmation Route Tests
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import Fastify from "fastify";
import {
	parseIncomingAction,
	registerWhatsappWebhookRoutes,
} from "./whatsappWebhook.js";

describe("WhatsApp Webhook Parser & Action Resolver", () => {
	it("parses explicit appointment confirmation button with UUID", () => {
		const apptId = "11111111-2222-3333-4444-555555555555";
		const action = parseIncomingAction(
			`confirm_appointment_${apptId}`,
			"Подтверждаю запись",
			"+79161234567",
			"wamid.123",
		);

		assert.equal(action.type, "confirm_appointment");
		assert.equal(action.appointmentId, apptId);
		assert.equal(action.buttonId, `confirm_appointment_${apptId}`);
	});

	it("parses explicit appointment cancellation button with UUID", () => {
		const apptId = "99999999-8888-7777-6666-555555555555";
		const action = parseIncomingAction(
			`cancel_appointment_${apptId}`,
			"Отменить запись",
			"+79161234567",
			"wamid.124",
		);

		assert.equal(action.type, "cancel_appointment");
		assert.equal(action.appointmentId, apptId);
	});

	it("parses standard APPT_CONFIRM button and natural Russian text", () => {
		const action1 = parseIncomingAction("APPT_CONFIRM", "Подтверждаю", "+79161234567", "wamid.125");
		assert.equal(action1.type, "confirm_appointment");
		assert.equal(action1.appointmentId, null);

		const action2 = parseIncomingAction(null, "да, обязательно буду", "+79161234567", "wamid.126");
		assert.equal(action2.type, "confirm_appointment");
	});

	it("parses standard APPT_CANCEL button and natural Russian text", () => {
		const action1 = parseIncomingAction("APPT_CANCEL", "Отмена", "+79161234567", "wamid.127");
		assert.equal(action1.type, "cancel_appointment");

		const action2 = parseIncomingAction(null, "к сожалению отмена", "+79161234567", "wamid.128");
		assert.equal(action2.type, "cancel_appointment");
	});

	it("parses reschedule request", () => {
		const action = parseIncomingAction("APPT_RESCHEDULE", "Хочу перенести визит", "+79161234567", "wamid.129");
		assert.equal(action.type, "reschedule_request");
	});

	it("parses general conversation message", () => {
		const action = parseIncomingAction(null, "Какая стоимость гигиены?", "+79161234567", "wamid.130");
		assert.equal(action.type, "general_message");
		assert.equal(action.rawText, "Какая стоимость гигиены?");
	});
});

describe("WhatsApp Webhook HTTP Routes (Fastify Inject)", () => {
	async function buildTestApp() {
		const app = Fastify();
		await registerWhatsappWebhookRoutes(app);
		await app.ready();
		return app;
	}

	it("GET /api/v1/webhooks/whatsapp validates Meta handshake on correct verify token", async () => {
		const app = await buildTestApp();
		try {
			const challengeStr = "challenge_code_987654321";
			const res = await app.inject({
				method: "GET",
				url: `/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=dente_whatsapp_verify_token&hub.challenge=${challengeStr}`,
			});

			assert.equal(res.statusCode, 200);
			assert.equal(res.body, challengeStr);
		} finally {
			await app.close();
		}
	});

	it("GET /api/v1/webhooks/whatsapp rejects handshake with 403 on invalid verify token", async () => {
		const app = await buildTestApp();
		try {
			const res = await app.inject({
				method: "GET",
				url: "/api/v1/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong_token&hub.challenge=12345",
			});

			assert.equal(res.statusCode, 403);
			const json = JSON.parse(res.body);
			assert.equal(json.error, "Forbidden");
		} finally {
			await app.close();
		}
	});

	it("POST /api/v1/webhooks/whatsapp returns 200 { received: true } immediately", async () => {
		const app = await buildTestApp();
		try {
			const res = await app.inject({
				method: "POST",
				url: "/api/v1/webhooks/whatsapp",
				payload: {
					object: "whatsapp_business_account",
					entry: [
						{
							id: "WABA_ID",
							changes: [
								{
									value: {
										messaging_product: "whatsapp",
										metadata: { phone_number_id: "non_existent_pn_id" },
										messages: [
											{
												from: "79161234567",
												id: "wamid.test.1",
												timestamp: "1724716800",
												type: "text",
												text: { body: "Тестовое сообщение" },
											},
										],
									},
									field: "messages",
								},
							],
						},
					],
				},
			});

			assert.equal(res.statusCode, 200);
			const json = JSON.parse(res.body);
			assert.equal(json.received, true);
		} finally {
			await app.close();
		}
	});
});
