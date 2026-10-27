import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_CONTACTS,
	formatCurrencyRu,
	formatKopecksRu,
	formatRussianPhone,
	formatTelegramUrl,
	formatWhatsAppUrl,
	generateAppointmentConfirmationText,
	generateNpsSurveyText,
	generateSbpPaymentShareText,
	generateTreatmentPlanText,
	generateVisitReminderText,
	maskRussianPhone,
	replaceTemplateVariables,
} from "../omnichannelEngine.js";

describe("omnichannelEngine — Formatters & Quick Message Generators", () => {
	const testContact = DEFAULT_CONTACTS[0]!;

	it("replaces template variables properly", () => {
		const tpl = "Здравствуйте, {patientName}! Запись к {doctorName} на {appointmentDate} в {appointmentTime}.";
		const ctx = {
			patientName: "Смирнов А.В.",
			doctorName: "д-р Кузнецова",
			appointmentDate: "29.08.2026",
			appointmentTime: "15:00",
		};
		assert.equal(replaceTemplateVariables(tpl, ctx), "Здравствуйте, Смирнов А.В.! Запись к д-р Кузнецова на 29.08.2026 в 15:00.");
	});

	it("generates clinical messages without bird-language", () => {
		const reminder = generateVisitReminderText(testContact, "Клиника DENTE", "Ленина 1");
		assert.ok(reminder.includes(testContact.fullName));
		assert.ok(reminder.includes("Клиника DENTE"));

		const conf = generateAppointmentConfirmationText(testContact, "Клиника DENTE");
		assert.ok(conf.includes(testContact.fullName));

		const plan = generateTreatmentPlanText(testContact, "Клиника DENTE");
		assert.ok(plan.includes(formatCurrencyRu(testContact.activeTreatmentPlan!.totalRub)));

		const nps = generateNpsSurveyText(testContact, "Клиника DENTE");
		assert.ok(nps.includes("от 1 до 10"));
	});

	it("generates SBP payment share text with NSPK URL", () => {
		const text = generateSbpPaymentShareText({
			patientName: "Волкова М.С.",
			sumRub: 25000,
			orderId: "ORD-99",
			nspkUrl: "https://qr.nspk.ru/SBP-ORD-99",
			clinicName: "DENTE",
		});
		assert.ok(text.includes("Волкова М.С."));
		assert.ok(text.includes(formatCurrencyRu(25000)));
		assert.ok(text.includes("https://qr.nspk.ru/SBP-ORD-99"));
	});

	it("formats Russian phone numbers and masks correctly", () => {
		assert.equal(formatRussianPhone("+79164501234"), "+7 (916) 450-12-34");
		assert.equal(formatRussianPhone("89257809911"), "+7 (925) 780-99-11");
		assert.equal(maskRussianPhone("+79164501234"), "+7 (916) ***-**-34");
		assert.equal(maskRussianPhone("123"), "+7 (***) ***-**-**");
	});

	it("formats currency in rubles and kopecks", () => {
		assert.ok(formatCurrencyRu(14500).includes("14"));
		assert.ok(formatKopecksRu(1450000).includes("14"));
	});

	it("generates direct WhatsApp and Telegram links", () => {
		assert.equal(formatWhatsAppUrl("+7 (916) 450-12-34"), "https://wa.me/79164501234");
		assert.equal(formatTelegramUrl("@doctor_smith"), "https://t.me/doctor_smith");
	});
});
