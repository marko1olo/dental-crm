import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatOrthodonticPatientMemo } from "../OrthodonticVisitProtocolWidget.js";

describe("Orthodontic Patient Memo Formatter (Mandate 8k)", () => {
	it("formatOrthodonticPatientMemo generates complete clinical instructions for fixed bracket system", () => {
		const text = formatOrthodonticPatientMemo({
			clinicName: "Стоматология DENTE",
			clinicPhone: "+7 (495) 777-99-00",
			doctorName: "Д-р Смирнова",
			patientName: "Анна Петрова",
			visitDate: "25.10.2026",
			bracketSystem: "damon_q2",
			archwireMaterial: "CuNiTi",
			archwireSection: ".014",
			targetArch: "upper",
			elasticScheme: "class_ii",
			elasticSize: "fox_3_16",
			elasticWear: "20-22 часа/сутки",
		});

		assert.ok(text.includes("Ортодонтические рекомендации после приёма (клиника «Стоматология DENTE»):"));
		assert.ok(text.includes("Пациент: Анна Петрова"));
		assert.ok(text.includes("Лечащий врач: Д-р Смирнова"));
		assert.ok(text.includes("Дата приёма: 25.10.2026"));
		assert.ok(text.includes("Аппаратура: Damon Q2"));
		assert.ok(text.includes("Установленная дуга: CuNiTi .014 (верхняя челюсть)"));
		assert.ok(text.includes("Схема межчелюстных эластиков (тяг):"));
		assert.ok(text.includes("Направление: II класс (дистализирующая)"));
		assert.ok(text.includes("Размер/сила: 3/16\" 3.5 oz (Лиса) (Light)"));
		assert.ok(text.includes("Режим ношения: 20-22 часа/сутки"));
		assert.ok(text.includes("1. Первые 2-3 дня возможна умеренная чувствительность зубов при накусывании"));
		assert.ok(text.includes("2. Эластики снимаются только во время еды и чистки зубов"));
		assert.ok(text.includes("3. При натирании щеки или губы нанесите защитный ортодонтический воск"));
		assert.ok(text.includes("4. При отклейке брекета, утере кнопки или дискомфорте от дуги немедленно свяжитесь с клиникой: +7 (495) 777-99-00."));
		assert.ok(text.includes("Следующий контрольный визит: через 4–6 недель."));

		// Zero cartoon emojis
		assert.strictEqual(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text), false);
	});

	it("formatOrthodonticPatientMemo correctly formats aligner block when isAligners=true", () => {
		const text = formatOrthodonticPatientMemo({
			clinicName: "DENTE",
			clinicPhone: "+7 (495) 777-11-22",
			doctorName: "Д-р Кузнецова",
			patientName: "Алексей Иванов",
			visitDate: "10.09.2026",
			bracketSystem: "aligners",
			isAligners: true,
			currentAligner: 12,
			totalAligners: 36,
			elasticScheme: "none",
		});

		assert.ok(text.includes("Аппаратура: Элайнеры"));
		assert.ok(text.includes("Текущий этап: Каппа №12 из 36"));
		assert.ok(text.includes("Режим: ношение 22 часа/сутки, смена через 10-14 дней."));
		assert.strictEqual(text.includes("Установленная дуга:"), false);
		assert.strictEqual(text.includes("Схема межчелюстных эластиков (тяг):"), false);
		assert.strictEqual(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u.test(text), false);
	});

	it("formatOrthodonticPatientMemo falls back to sensible defaults when optional fields are empty", () => {
		const text = formatOrthodonticPatientMemo({
			clinicName: "",
			clinicPhone: "",
			doctorName: "",
			patientName: "",
			bracketSystem: "damon_q2",
		});

		assert.ok(text.includes("клиника «Стоматологическая клиника DENTE»"));
		assert.ok(text.includes("Пациент: Пациент"));
		assert.ok(text.includes("Лечащий врач: Лечащий врач-ортодонт"));
		assert.ok(!text.includes("+7 (495) 123-45-67"));
		assert.ok(text.includes("немедленно свяжитесь с клиникой."));
		assert.ok(text.includes("Установленная дуга: CuNiTi .016 (обе челюсти)"));
	});
});
