/**
 * anesthesiaDosagePrintAutonomyWave54.test.tsx
 * Pure function tests for formatAnesthesiaPatientMemo (Mandate 8b <= 120 lines)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAnesthesiaPatientMemo } from "../AnesthesiaQuickBar";

describe("Wave 54: Pure Function formatAnesthesiaPatientMemo", () => {
	it("formats structured patient anesthesia memo with all required clinical attributes", () => {
		const memo = formatAnesthesiaPatientMemo({
			clinicName: "Стоматологическая клиника DENTE",
			clinicPhone: "+7 (495) 123-45-67",
			patientName: "Иванов Иван Иванович",
			doctorName: "Д-р Петров П.П.",
			drugTradeName: "Ультракаин Д-С (Артикаин 4% + 1:200 000)",
			carpulesCount: 1.5,
			targetArea: "зуб 16 (инфильтрационная анестезия)",
			expectedDurationHours: "2–3 часа",
			date: "08.09.2026",
		});

		assert.ok(memo.includes("Памятка пациенту после проведения местной анестезии"));
		assert.ok(memo.includes("Стоматологическая клиника DENTE"));
		assert.ok(memo.includes("Иванов Иван Иванович"));
		assert.ok(memo.includes("Д-р Петров П.П."));
		assert.ok(memo.includes("08.09.2026"));
		assert.ok(memo.includes("Ультракаин Д-С (Артикаин 4% + 1:200 000)"));
		assert.ok(memo.includes("1.5 карп."));
		assert.ok(memo.includes("зуб 16 (инфильтрационная анестезия)"));
		assert.ok(memo.includes("2–3 часа"));
		assert.ok(memo.includes("Не принимайте горячую пищу"));
		assert.ok(memo.includes("+7 (495) 123-45-67"));
	});

	it("contains strictly ZERO cartoon emojis (Mandate 8d pt 7)", () => {
		const memo = formatAnesthesiaPatientMemo({
			clinicName: "Клиника",
			clinicPhone: "+79991112233",
			patientName: "Пациент",
			doctorName: "Врач",
			drugTradeName: "Скандонест 3%",
			carpulesCount: 1,
			targetArea: "зуб 36 (мандибулярная анестезия)",
			expectedDurationHours: "1.5–2 часа",
		});

		const emojiRegex = /[🌀-🧿]|[☀-⛿]|[✀-➿]/u;
		assert.equal(emojiRegex.test(memo), false, "Memo must not contain cartoon emojis");
	});

	it("falls back to robust clinical defaults when optional parameters are omitted", () => {
		const memo = formatAnesthesiaPatientMemo({
			clinicName: "",
			clinicPhone: "",
			patientName: "",
			doctorName: "",
			drugTradeName: "Артикаин",
			carpulesCount: 1,
			targetArea: "зуб 21",
		});

		assert.ok(memo.includes("Стоматологическая клиника DENTE"));
		assert.ok(!memo.includes("+7 (495) 123-45-67"));
		assert.ok(memo.includes("Пациент"));
		assert.ok(memo.includes("Лечащий врач-стоматолог"));
		assert.ok(memo.includes("2–3 часа"));
	});
});
