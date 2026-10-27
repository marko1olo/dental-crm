import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_CONTACTS,
	DEFAULT_MESSAGES_BY_PATIENT,
	DEFAULT_NPS_REVIEWS,
	DEFAULT_TEMPLATES,
	generateAppointmentConfirmationText,
	generateNpsSurveyText,
	generateSbpPaymentShareText,
	generateTreatmentPlanText,
	generateVisitReminderText,
} from "../omnichannelEngine.js";

describe("omnichannelEngine — Datasets Consistency & Zero-Emoji Law", () => {
	const EMOJI_REGEX =
		/[\uD800-\uDBFF][\uDC00-\uDFFF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDE4F]|\uD83E[\uDD00-\uDDFF]/;
	const testContact = DEFAULT_CONTACTS[0]!;

	it("provides standard templates for mandatory categories", () => {
		const categories = DEFAULT_TEMPLATES.map((t) => t.category);
		assert.ok(categories.includes("visit_reminder"));
		assert.ok(categories.includes("appointment_confirmation"));
		assert.ok(categories.includes("treatment_plan"));
		assert.ok(categories.includes("nps_survey"));
		assert.ok(categories.includes("sbp_payment"));
	});

	it("contains realistic contacts, messages, and NPS reviews", () => {
		assert.ok(DEFAULT_CONTACTS.length >= 3);
		assert.ok(DEFAULT_NPS_REVIEWS.length >= 5);
		assert.ok(DEFAULT_NPS_REVIEWS.some((r) => r.urgency === "critical"));
		assert.ok(DEFAULT_NPS_REVIEWS.some((r) => r.category === "promoter"));
	});

	it("ensures all generated patient-facing text is 100% emoji-free", () => {
		assert.ok(!EMOJI_REGEX.test(generateVisitReminderText(testContact, "Клиника DENTE", "Арбат")));
		assert.ok(!EMOJI_REGEX.test(generateAppointmentConfirmationText(testContact, "Клиника DENTE")));
		assert.ok(!EMOJI_REGEX.test(generateTreatmentPlanText(testContact, "Клиника DENTE")));
		assert.ok(!EMOJI_REGEX.test(generateNpsSurveyText(testContact, "Клиника DENTE")));
		assert.ok(!EMOJI_REGEX.test(generateSbpPaymentShareText({
			patientName: "Волкова М.С.",
			sumRub: 25000,
			orderId: "ORD-99",
			nspkUrl: "https://qr.nspk.ru/SBP-ORD-99",
			clinicName: "DENTE",
		})));
	});

	it("ensures seed templates and chat messages are 100% emoji-free", () => {
		for (const tpl of DEFAULT_TEMPLATES) {
			assert.ok(!EMOJI_REGEX.test(tpl.templateText));
		}
		for (const messages of Object.values(DEFAULT_MESSAGES_BY_PATIENT)) {
			for (const msg of messages) {
				assert.ok(!EMOJI_REGEX.test(msg.body));
			}
		}
	});
});
