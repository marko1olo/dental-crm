import assert from "node:assert/strict";
import test from "node:test";
import {
	generateAppointmentConfirmationMessage,
	generateWhatsAppConfirmationUrl,
} from "../../../store/telephonyStore";
import {
	generateAppointmentSmsMessage,
	generateAppointmentWhatsAppMessage,
	getPreparationInstructionForReason,
} from "../../schedule/generateAppointmentWhatsAppMessage";

test("WhatsApp - Clinical preparation instructions logic", () => {
	const surgeryPrep = getPreparationInstructionForReason("Удаление сложного зуба мудрости");
	assert.ok(surgeryPrep);
	assert.ok(surgeryPrep.includes("перекусите"));
	assert.ok(surgeryPrep.includes("аспирин"));

	const hygienePrep = getPreparationInstructionForReason("Комплексная гигиена полости рта и AirFlow");
	assert.ok(hygienePrep);
	assert.ok(hygienePrep.includes("кофе"));

	const orthoPrep = getPreparationInstructionForReason("Коррекция брекет-системы и замена дуги");
	assert.ok(orthoPrep);
	assert.ok(orthoPrep.includes("каппы"));

	const therapyPrep = getPreparationInstructionForReason("Лечение глубокого кариеса 46 зуба");
	assert.ok(therapyPrep);
	assert.ok(therapyPrep.includes("анестезии"));
});

test("WhatsApp - Full message template composition with clinical notes", () => {
	const message = generateAppointmentWhatsAppMessage({
		patientName: "Алексей Смирнов",
		doctorName: "д-р Петров",
		appointmentStartsAt: "2026-08-25T14:30:00",
		clinicName: "Клиника DENTE",
		clinicAddress: "ул. Ленина, 15",
		treatmentReason: "Удаление зуба",
	});

	assert.ok(message.includes("Алексей Смирнов"));
	assert.ok(message.includes("д-р Петров"));
	assert.ok(message.includes("Клиника DENTE"));
	assert.ok(message.includes("Памятка к приему:"));
	assert.ok(message.includes("перекусите"));
	assert.ok(message.includes("ДА"));
});

test("WhatsApp - URL generator formats wa.me links with encoded text", () => {
	const url = generateWhatsAppConfirmationUrl("+7 (999) 123-45-67", "Тестовое сообщение");
	assert.ok(url.startsWith("https://wa.me/79991234567?text="));
	assert.ok(url.includes(encodeURIComponent("Тестовое сообщение")));
});

test("SMS - Compact reminder message generation", () => {
	const sms = generateAppointmentSmsMessage({
		patientName: "Иванов И.И.",
		doctorName: "Петров П.С.",
		appointmentStartsAt: "2026-08-25T10:00:00",
		clinicName: "DENTE",
		clinicAddress: "ул. Тверская 1",
	});

	assert.ok(sms.includes("Иванов И.И."));
	assert.ok(sms.includes("DENTE"));
	assert.ok(sms.includes("10:00"));
});
