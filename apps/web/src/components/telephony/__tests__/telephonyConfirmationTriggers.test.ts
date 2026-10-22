import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	generateAppointmentConfirmationMessage,
	generateSmsConfirmationUrl,
	generateTelegramConfirmationUrl,
	generateWhatsAppConfirmationUrl,
} from "../../../store/telephonyStore.js";

describe("Telephony: 1-Click WhatsApp & SMS Confirmation Triggers", () => {
	test("generateAppointmentConfirmationMessage formats standard confirmation", () => {
		const msg = generateAppointmentConfirmationMessage({
			patientName: "Иван Иванович",
			doctorName: "Петров П.С.",
			appointmentStartsAt: "2026-12-30T10:00:00Z",
			clinicName: "клинике DENTE",
		});

		assert.ok(msg.includes("Иван Иванович"));
		assert.ok(msg.includes("DENTE"));
		assert.ok(msg.includes("Петров П.С."));
		assert.ok(msg.includes("Подтверждаете визит?"));
	});

	test("generateAppointmentConfirmationMessage formats urgent and reminder templates", () => {
		const urgent = generateAppointmentConfirmationMessage({
			patientName: "Анна Сергеевна",
			doctorName: "Петров П.С.",
			appointmentStartsAt: "2026-12-30T10:00:00Z",
			clinicName: "DENTE",
			templateType: "urgent",
		});
		assert.ok(urgent.includes("срочный приём"));
		assert.ok(urgent.includes("паспорт"));

		const reminder = generateAppointmentConfirmationMessage({
			patientName: "Анна Сергеевна",
			doctorName: "Петров П.С.",
			appointmentStartsAt: "2026-12-30T10:00:00Z",
			clinicName: "DENTE",
			templateType: "reminder",
		});
		assert.ok(reminder.includes("сегодняшнем визите"));
		assert.ok(reminder.includes("5-10 минут"));
	});

	test("generates valid wa.me, sms: and t.me URLs", () => {
		const wa = generateWhatsAppConfirmationUrl("+7 (916) 123-45-67", "Напоминание");
		assert.ok(wa.startsWith("https://wa.me/79161234567?text="));

		const sms = generateSmsConfirmationUrl("89161234567", "Напоминание");
		assert.ok(sms.startsWith("sms:+79161234567?body="));

		const tg = generateTelegramConfirmationUrl("+7 (916) 123-45-67", "Напоминание");
		assert.ok(tg.startsWith("https://t.me/share/url?"));
	});
});
