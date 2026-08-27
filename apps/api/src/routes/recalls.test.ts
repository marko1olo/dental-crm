/**
 * Recalls API Routes and WhatsApp Automation Tests
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import Fastify from "fastify";
import {
	buildRecallNotificationPayload,
	REASON_LABELS_RU,
} from "../services/recallReminderService.js";
import { registerRecallRoutes } from "./recalls.js";
import { parseIncomingAction } from "./whatsappWebhook.js";

describe("Recall Reminder Service & Payload Builder", () => {
	it("builds interactive WhatsApp recall payload with booking and snooze buttons", () => {
		const recallId = "recall-12345";
		const patientName = "Иван Иванов";
		const payload = buildRecallNotificationPayload(recallId, patientName, "hygiene");

		assert.ok(payload.text.includes("Иван Иванов"));
		assert.ok(payload.text.includes("профессиональная гигиена полости рта"));
		assert.equal(payload.buttons.length, 2);
		assert.equal(payload.buttons[0]?.id, "RECALL_BOOK_recall-12345");
		assert.equal(payload.buttons[0]?.title, "📅 Записаться на прием");
		assert.equal(payload.buttons[1]?.id, "RECALL_SNOOZE_recall-12345");
		assert.equal(payload.buttons[1]?.title, "⏰ Напомнить через месяц");
	});

	it("correctly maps reason keys to Russian clinical labels", () => {
		assert.equal(REASON_LABELS_RU.hygiene, "Профессиональная гигиена полости рта");
		assert.equal(REASON_LABELS_RU.checkup, "Профилактический осмотр");
		assert.equal(REASON_LABELS_RU.implant_review, "Контроль приживления имплантата");
	});

	it("parses incoming RECALL_BOOK interactive button in WhatsApp webhook", () => {
		const action = parseIncomingAction(
			"RECALL_BOOK_rec-999",
			"📅 Записаться на прием",
			"+79161234567",
			"wamid.recall.1",
		);

		assert.equal(action.type, "recall_book");
		assert.equal(action.recallId, "rec-999");
	});

	it("parses incoming RECALL_SNOOZE interactive button in WhatsApp webhook", () => {
		const action = parseIncomingAction(
			"RECALL_SNOOZE_rec-999",
			"⏰ Напомнить через месяц",
			"+79161234567",
			"wamid.recall.2",
		);

		assert.equal(action.type, "recall_snooze");
		assert.equal(action.recallId, "rec-999");
	});
});

import { authTokenSecret } from "../security/authSecret.js";
import { signToken } from "../utils/cryptoHelper.js";

describe("Recalls HTTP Routes (Fastify Inject)", () => {
	const orgId = "00000000-0000-7000-8000-000000000001";
	let staffToken: string;

	async function buildTestApp() {
		process.env.NODE_ENV = "test";
		process.env.DENTE_DEV_ALLOW_HEADER_ORG = "1";

		staffToken = signToken(
			{ organizationId: orgId, userId: "usr-admin-1", role: "admin" },
			authTokenSecret(),
		);

		const app = Fastify();
		await app.register(registerRecallRoutes);
		await app.ready();
		return app;
	}

	it("GET /api/v1/recalls/due returns list of overdue recalls", async () => {
		const app = await buildTestApp();
		try {
			const res = await app.inject({
				method: "GET",
				url: "/api/v1/recalls/due",
				headers: {
					"x-dente-staff-token": staffToken,
					"x-organization-id": orgId,
				},
			});

			assert.equal(res.statusCode, 200);
			const json = JSON.parse(res.body);
			assert.ok(Array.isArray(json.data));
			assert.equal(typeof json.total, "number");
		} finally {
			await app.close();
		}
	});

	it("POST /api/v1/recalls/dispatch processes batch recall reminders", async () => {
		const app = await buildTestApp();
		try {
			const res = await app.inject({
				method: "POST",
				url: "/api/v1/recalls/dispatch",
				headers: {
					"x-dente-staff-token": staffToken,
					"x-organization-id": orgId,
				},
				payload: {
					recallIds: ["synthetic_recall_test_1"],
				},
			});

			assert.equal(res.statusCode, 200);
			const json = JSON.parse(res.body);
			assert.equal(json.ok, true);
			assert.equal(json.total, 1);
		} finally {
			await app.close();
		}
	});

	it("POST /api/v1/recalls/snooze postpones recall date", async () => {
		const app = await buildTestApp();
		try {
			const res = await app.inject({
				method: "POST",
				url: "/api/v1/recalls/snooze",
				headers: {
					"x-dente-staff-token": staffToken,
					"x-organization-id": orgId,
				},
				payload: {
					recallId: "test-recall-1",
					days: 30,
				},
			});

			assert.equal(res.statusCode, 200);
			const json = JSON.parse(res.body);
			assert.equal(json.ok, true);
			assert.equal(json.recallId, "test-recall-1");
			assert.ok(json.snoozedUntil);
		} finally {
			await app.close();
		}
	});

	it("POST /api/v1/recalls/book registers quick booking request", async () => {
		const app = await buildTestApp();
		try {
			const res = await app.inject({
				method: "POST",
				url: "/api/v1/recalls/book",
				headers: {
					"x-dente-staff-token": staffToken,
					"x-organization-id": orgId,
				},
				payload: {
					recallId: "test-recall-1",
				},
			});

			assert.equal(res.statusCode, 200);
			const json = JSON.parse(res.body);
			assert.equal(json.ok, true);
			assert.equal(json.status, "booking_requested");
		} finally {
			await app.close();
		}
	});
});

