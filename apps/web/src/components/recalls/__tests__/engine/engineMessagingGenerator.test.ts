import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	extractFirstName,
	generate1ClickBookingLink,
	generateSmsRecallMessage,
	generateTelegramRecallMessage,
	generateWhatsAppRecallMessage,
	sanitizePhoneNumber,
	type PatientRecallRecord,
} from "../../patientRecallEngine";

describe("Patient Recall Engine - Personalized Messaging Generator", () => {
	const sampleRecord: PatientRecallRecord = {
		id: "r1",
		patientId: "p101",
		fullName: "Иванов Иван Иванович",
		phone: "+7 (916) 123-45-67",
		cycleType: "standard_prophylaxis",
		lastVisitDate: "2026-02-15",
		dueDate: "2026-08-15",
		daysOverdue: 13,
		urgencyStatus: "due_now",
		status: "due_now",
		attendingDoctorName: "Д-р Кузнецова Е.В.",
		historicalRevenueRub: 35000,
	};

	it("extracts first name and sanitizes phone numbers reliably", () => {
		assert.equal(extractFirstName("Иванов Иван Иванович"), "Иван");
		assert.equal(extractFirstName("Смирнова Елена"), "Елена");
		assert.equal(extractFirstName("Петров"), "Петров");
		assert.equal(extractFirstName(""), "Пациент");

		assert.equal(sanitizePhoneNumber("+7 (916) 123-45-67"), "79161234567");
		assert.equal(sanitizePhoneNumber("8 (925) 987-65-43"), "79259876543");
	});

	it("generates 1-click booking link with tracking and prefilled parameters", () => {
		const link = generate1ClickBookingLink({
			baseUrl: "https://dente.ru",
			patientId: "p101",
			doctorId: "doc-1",
			cycleType: "standard_prophylaxis",
			source: "whatsapp",
		});
		assert.ok(link.startsWith("https://dente.ru/booking?"));
		assert.ok(link.includes("patient_id=p101"));
		assert.ok(link.includes("doctor_id=doc-1"));
		assert.ok(link.includes("recall_cycle=standard_prophylaxis"));
		assert.ok(link.includes("source=whatsapp"));
	});

	it("generates WhatsApp message with doctor, clinic and last visit date", () => {
		const msg = generateWhatsAppRecallMessage(sampleRecord, { clinicName: "DENTE VIP" });
		assert.match(msg, /Здравствуйте, Иван!/);
		assert.match(msg, /DENTE VIP/);
		assert.match(msg, /Д-р Кузнецова Е\.В\./);
		assert.match(msg, /2026-02-15/);
		assert.match(msg, /booking\?patient_id=p101/);
	});

	it("generates SMS and Telegram messages concisely", () => {
		const sms = generateSmsRecallMessage(sampleRecord, { clinicName: "DENTE" });
		assert.match(sms, /Иван, прошло 6 мес с визита в DENTE/);
		assert.match(sms, /booking\?patient_id=p101/);

		const tg = generateTelegramRecallMessage(sampleRecord, { clinicName: "DENTE" });
		assert.match(tg, /Здравствуйте, Иван!/);
	});
});
