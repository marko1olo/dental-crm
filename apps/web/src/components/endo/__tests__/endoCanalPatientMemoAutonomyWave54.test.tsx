import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatEndoPatientMemo } from "../EndoCanalLogModal";

describe("Wave 54 / Feature 243: Endo Patient Memo Pure Function (Mandate 8k, 8n)", () => {
	it("formats structured patient endo memo for permanent obturation", () => {
		const memo = formatEndoPatientMemo({
			clinicName: "Стоматологическая клиника DENTE",
			clinicPhone: "+7 (495) 123-45-67",
			patientName: "Смирнова Елена Сергеевна",
			doctorName: "Д-р Васильев В.В.",
			toothNumber: 16,
			toothAnatomicalNameRu: "Первый моляр верхней челюсти справа",
			isPermanentObturation: true,
			date: "08.09.2026",
		});

		assert.ok(memo.includes("Памятка пациенту после эндодонтического лечения корневых каналов"));
		assert.ok(memo.includes("Стоматологическая клиника DENTE"));
		assert.ok(memo.includes("Смирнова Елена Сергеевна"));
		assert.ok(memo.includes("Д-р Васильев В.В."));
		assert.ok(memo.includes("08.09.2026"));
		assert.ok(memo.includes("16 (Первый моляр верхней челюсти справа)"));
		assert.ok(memo.includes("Постоянная трёхмерная обтурация корневых каналов"));
		assert.ok(memo.includes("Не принимайте пищу в течение 2 часов"));
		assert.ok(memo.includes("Умеренная болезненность при накусывании в течение 2–5 дней"));
		assert.ok(memo.includes("+7 (495) 123-45-67"));
	});

	it("formats structured patient endo memo for temporary Ca(OH)2 dressing", () => {
		const memo = formatEndoPatientMemo({
			clinicName: "DENTE Clinic",
			clinicPhone: "+7 (495) 999-88-77",
			patientName: "Ковалев К.К.",
			doctorName: "Д-р Васильев В.В.",
			toothNumber: 26,
			isTemporaryCaOh2: true,
			isPermanentObturation: false,
		});

		assert.ok(memo.includes("Антисептическая обработка каналов и временное пломбирование гидроксидом кальция Ca(OH)2"));
		assert.ok(memo.includes("через 10-14 дней для замены лекарства или постоянной пломбировки каналов"));
	});

	it("contains strictly ZERO cartoon emojis (Mandate 8d pt 7)", () => {
		const memo = formatEndoPatientMemo({
			clinicName: "Клиника",
			clinicPhone: "+79990000000",
			patientName: "Пациент",
			doctorName: "Врач",
			toothNumber: 46,
		});

		const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
		assert.equal(emojiRegex.test(memo), false, "Memo must not contain cartoon emojis");
	});

	it("falls back to robust clinical defaults when optional params are omitted", () => {
		const memo = formatEndoPatientMemo({
			clinicName: "",
			clinicPhone: "",
			patientName: "",
			doctorName: "",
			toothNumber: 11,
		});

		assert.ok(memo.includes("Стоматологическая клиника DENTE"));
		assert.ok(!memo.includes("+7 (495) 123-45-67"));
		assert.ok(memo.includes("Пациент"));
		assert.ok(memo.includes("Врач-стоматолог-терапевт (эндодонтист)"));
		assert.ok(memo.includes("зуб 11"));
	});
});
