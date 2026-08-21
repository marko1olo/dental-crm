import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	buildSmsUrl,
	buildWhatsAppUrl,
	generateAppointmentSmsMessage,
	generateAppointmentWhatsAppMessage,
	getPreparationInstructionForReason,
} from "./generateAppointmentWhatsAppMessage";

describe("generateAppointmentWhatsAppMessage Suite", () => {
	it("generates structured appointment reminder with patient name, clinic name and date", () => {
		const text = generateAppointmentWhatsAppMessage({
			patientName: "Алексей Смирнов",
			doctorName: "Д-р Иванов А.С.",
			appointmentStartsAt: "2026-08-21T10:00:00.000Z",
			clinicName: "Клиника DENTE",
			clinicAddress: "ул. Ленина, д. 42",
			clinicPhone: "+7 (495) 123-45-67",
		});

		assert.ok(text.includes("Здравствуйте, Алексей Смирнов!"));
		assert.ok(text.includes("Клиника DENTE по адресу: ул. Ленина, д. 42"));
		assert.ok(text.includes("Д-р Иванов А.С."));
		assert.ok(text.includes("+7 (495) 123-45-67"));
		assert.ok(text.includes("Пожалуйста, подтвердите визит ответным сообщением ДА"));
	});

	it("tailors surgical preparation instruction: aspirin prohibition for extractions and implants", () => {
		const instruction = getPreparationInstructionForReason("Удаление сложного зуба мудрости и имплантация");
		assert.ok(instruction?.includes("аспирина"));
		assert.ok(instruction?.includes("24 часа"));

		const text = generateAppointmentWhatsAppMessage({
			patientName: "Елена Кузнецова",
			appointmentStartsAt: "2026-08-21T14:00:00.000Z",
			treatmentReason: "Удаление зуба",
		});
		assert.ok(text.includes("Памятка к приему"));
		assert.ok(text.includes("аспирина"));
	});

	it("tailors hygiene preparation instruction: coffee/smoking prohibition", () => {
		const instruction = getPreparationInstructionForReason("Комплексная гигиена полости рта Air Flow");
		assert.ok(instruction?.includes("красящих продуктов"));
		assert.ok(instruction?.includes("2 часа"));
	});

	it("tailors therapy preparation instruction: meal before local anesthesia", () => {
		const instruction = getPreparationInstructionForReason("Лечение глубокого кариеса с анестезией");
		assert.ok(instruction?.includes("Рекомендуем перекусить за 1–1.5 часа"));
	});

	it("tailors orthodontics preparation instruction: aligners and cases", () => {
		const instruction = getPreparationInstructionForReason("Ортодонтия: коррекция элайнеров");
		assert.ok(instruction?.includes("каппы/элайнеры и защитный кейс"));
	});

	it("tailors consultation preparation instruction: bring CT / X-rays", () => {
		const instruction = getPreparationInstructionForReason("Первичная консультация ортопеда");
		assert.ok(instruction?.includes("КТ / ОПТГ"));
	});

	it("tailors orthopedics preparation instruction: crowns, veneers and prosthetics", () => {
		const instruction = getPreparationInstructionForReason("Примерка металлокерамической коронки и слепки");
		assert.ok(instruction?.includes("съемными конструкциями или протезами"));
	});

	it("tailors periodontics preparation instruction: gums and vector", () => {
		const instruction = getPreparationInstructionForReason("Вектор-терапия десен и кюретаж пародонтальных карманов");
		assert.ok(instruction?.includes("мягкую гигиену полости рта"));
	});

	it("tailors pediatric dentistry preparation instruction: children", () => {
		const instruction = getPreparationInstructionForReason("Детский прием: лечение молочного зуба");
		assert.ok(instruction?.includes("ребенок отдохнул и поел"));
		assert.ok(instruction?.includes("любимую игрушку"));
	});

	it("generates concise SMS message correctly", () => {
		const sms = generateAppointmentSmsMessage({
			patientName: "Ольга",
			doctorName: "Д-р Петров",
			appointmentStartsAt: "2026-08-21T11:00:00.000Z",
			clinicName: "Клиника DENTE",
			clinicPhone: "+74951234567",
		});

		assert.ok(sms.includes("Ольга, запись в Клиника DENTE"));
		assert.ok(sms.includes("Д-р Петров"));
		assert.ok(sms.includes("+74951234567"));

		const smsUrl = buildSmsUrl("+7 (999) 000-11-22", "Тест");
		assert.equal(smsUrl, "sms:+79990001122?body=%D0%A2%D0%B5%D1%81%D1%82");
	});

	it("normalizes phone numbers in buildWhatsAppUrl correctly", () => {
		const url1 = buildWhatsAppUrl("+7 (999) 111-22-33", "Привет");
		assert.equal(url1, "https://wa.me/79991112233?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82");

		const url2 = buildWhatsAppUrl("89991112233", "ДА");
		assert.equal(url2, "https://wa.me/79991112233?text=%D0%94%D0%90");
	});
});

