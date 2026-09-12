/**
 * Recalls API Routes and WhatsApp Automation Tests
 */

import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import {
	buildRecallNotificationPayload,
	REASON_LABELS_RU,
} from "../services/recallReminderService.js";
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

