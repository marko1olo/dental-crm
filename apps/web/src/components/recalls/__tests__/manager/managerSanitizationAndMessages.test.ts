import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildRecallMessageContent,
	cleanPhoneDigits,
	extractPatientFirstName,
	type PatientRecallItem,
} from "../../index";

describe("1 & 2. Name & Phone Sanitization and Messages", () => {
	it("extracts first name and sanitizes phone numbers", () => {
		assert.strictEqual(extractPatientFirstName("Смирнов Алексей Викторович"), "Алексей");
		assert.strictEqual(extractPatientFirstName("Волкова Мария Сергеевна"), "Мария");
		assert.strictEqual(extractPatientFirstName(""), "Пациент");
		assert.strictEqual(cleanPhoneDigits("+7 (916) 450-12-34"), "79164501234");
		assert.strictEqual(cleanPhoneDigits(null), "");
	});

	const sampleCandidate: PatientRecallItem = {
		id: "rec-test-1",
		patientId: "pat-101",
		fullName: "Смирнов Алексей Викторович",
		phone: "+7 (916) 450-12-34",
		category: "hygiene",
		categoryLabel: "Гигиена 6 мес.",
		lastVisitDate: "2026-02-15",
		dueDate: "2026-08-15",
		daysOverdue: 14,
		urgency: "due_now",
		attendingDoctorName: "Д-р Кузнецова Е.В.",
		status: "pending",
	};

	it("generates WhatsApp, Telegram and SMS messages", () => {
		const wa = buildRecallMessageContent(sampleCandidate, "whatsapp", "ДЕНТЕ");
		assert.ok(wa.includes("Алексей"));
		assert.ok(wa.includes("ДЕНТЕ"));

		const tg = buildRecallMessageContent(sampleCandidate, "telegram", "ДЕНТЕ");
		assert.ok(tg.includes("Алексей"));

		const sms = buildRecallMessageContent(sampleCandidate, "sms", "ДЕНТЕ");
		assert.ok(sms.includes("Алексей"));
		assert.ok(sms.length <= 160);
	});

	it("generates specialized messages for Implants and Orthodontics", () => {
		const implantCand: PatientRecallItem = { ...sampleCandidate, category: "implants" };
		const waMsg = buildRecallMessageContent(implantCand, "whatsapp", "ДЕНТЕ");
		assert.ok(waMsg.includes("имплант"));

		const orthoCand: PatientRecallItem = { ...sampleCandidate, category: "orthodontics" };
		const tgMsg = buildRecallMessageContent(orthoCand, "telegram", "ДЕНТЕ");
		assert.ok(tgMsg.includes("ортодонт") || tgMsg.includes("ретейнер"));
	});
});
