import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	importCompetitorPatientDb,
	parseRublesAmount,
	parseRuDateToIso,
	splitFullName,
	classifyCloserCandidate,
} from "./competitorDbImporter.js";

describe("competitorDbImporter (Universal Competitor DB Parser)", () => {
	it("parses rubles amounts from dirty text strings", () => {
		assert.equal(parseRublesAmount("125 000,00 ₽"), 125000);
		assert.equal(parseRublesAmount("85.500 руб."), 85500);
		assert.equal(parseRublesAmount("45000"), 45000);
		assert.equal(parseRublesAmount("12 345,67"), 12345.67);
		assert.equal(parseRublesAmount("не указано"), 0);
		assert.equal(parseRublesAmount(null), 0);
	});

	it("parses Russian and ISO dates correctly", () => {
		assert.equal(parseRuDateToIso("05.10.2026"), "2026-10-05");
		assert.equal(parseRuDateToIso("12.04.2026 14:30"), "2026-04-12");
		assert.equal(parseRuDateToIso("2026-08-20"), "2026-08-20");
		assert.equal(parseRuDateToIso("25/11/2025"), "2025-11-25");
		assert.equal(parseRuDateToIso("неизвестно"), null);
	});

	it("splits full names cleanly into components", () => {
		const res1 = splitFullName("Иванов Иван Иванович");
		assert.equal(res1.lastName, "Иванов");
		assert.equal(res1.firstName, "Иван");
		assert.equal(res1.middleName, "Иванович");

		const res2 = splitFullName("Смирнова Анна");
		assert.equal(res2.lastName, "Смирнова");
		assert.equal(res2.firstName, "Анна");
		assert.equal(res2.middleName, undefined);

		const res3 = splitFullName("Мария");
		assert.equal(res3.firstName, "Мария");
	});

	it("correctly classifies closer candidate stages based on days elapsed", () => {
		// 3 дня со дня консультации и сумма > 0 -> hot
		assert.equal(classifyCloserCandidate(3, null, 75000), "abandoned_estimate_hot");
		// 7 дней -> warm
		assert.equal(classifyCloserCandidate(7, null, 75000), "abandoned_estimate_warm");
		// 15 дней -> cold
		assert.equal(classifyCloserCandidate(15, null, 75000), "abandoned_estimate_cold");
		// 165 дней с посл визита -> recall_due
		assert.equal(classifyCloserCandidate(null, 165, 0), "recall_due");
		// 240 дней -> recall_overdue
		assert.equal(classifyCloserCandidate(null, 240, 0), "recall_overdue");
	});

	it("parses IDENT CSV export with Russian headers and kopecks", () => {
		const fixedNow = new Date("2026-10-09T12:00:00Z");
		const identCsv = `Пациент ФИО;Мобильный телефон;Сумма плана;Дата консультации;Лечащий врач;Услуга
Иванов Алексей Петрович;+7 (926) 111-22-33;180 000,00 ₽;06.10.2026;Д-р Смирнов К.А.;Имплантация Nobel 2 ед.
Петрова Елена Сергеевна;89162223344;95 500,00 ₽;02.10.2026;Д-р Ковалева М.В.;Ортодонтия элайнеры
Сидоров Иван Васильевич;8 (903) 444-55-66;320 000,00 ₽;20.09.2026;Д-р Смирнов К.А.;Тотальное протезирование
Козлов Невалидный;000-111;50 000 ₽;06.10.2026;Д-р Смирнов К.А.;Терапия`;

		const result = importCompetitorPatientDb(identCsv, { now: fixedNow });

		assert.equal(result.totalRows, 4);
		assert.equal(result.validCandidatesCount, 3);
		assert.equal(result.invalidPhonesCount, 1);
		assert.equal(result.totalEstimateVolumeRub, 645500);

		// Проверяем Иванова (3 дня со дня 06.10.2026 при now 09.10.2026) -> abandoned_estimate_hot
		const ivanov = result.candidates[0];
		assert.ok(ivanov);
		assert.equal(ivanov.fullName, "Иванов Алексей Петрович");
		assert.equal(ivanov.firstName, "Алексей");
		assert.equal(ivanov.phone, "+79261112233");
		assert.equal(ivanov.isPhoneValid, true);
		assert.equal(ivanov.estimateSumRub, 180000);
		assert.equal(ivanov.category, "abandoned_estimate_hot");
		assert.equal(ivanov.doctorName, "Д-р Смирнов К.А.");

		// Проверяем Петрову (7 дней с 02.10.2026) -> abandoned_estimate_warm
		const petrova = result.candidates[1];
		assert.ok(petrova);
		assert.equal(petrova.phone, "+79162223344");
		assert.equal(petrova.category, "abandoned_estimate_warm");

		// Проверяем Козлова с битым телефоном
		const kozlov = result.candidates[3];
		assert.ok(kozlov);
		assert.equal(kozlov.isPhoneValid, false);
	});

	it("parses Infodent comma-delimited export with recall candidates", () => {
		const fixedNow = new Date("2026-10-09T12:00:00Z");
		const infodentCsv = `ФИО,Телефон,Стоимость,Дата последнего визита,Врач
Васильев Олег Игоревич,+79051112233,0,2026-04-20,Д-р Столяров
Михайлова Ирина Павловна,+79109998877,0,2025-11-10,Д-р Столяров`;

		const result = importCompetitorPatientDb(infodentCsv, { now: fixedNow });

		assert.equal(result.totalRows, 2);
		assert.equal(result.validCandidatesCount, 2);

		// Васильев: визит 20.04.2026 -> ~172 дня назад -> recall_due
		const vasiliev = result.candidates[0];
		assert.ok(vasiliev);
		assert.equal(vasiliev.category, "recall_due");

		// Михайлова: визит 10.11.2025 -> > 300 дней назад -> recall_overdue
		const mikhailova = result.candidates[1];
		assert.ok(mikhailova);
		assert.equal(mikhailova.category, "recall_overdue");
	});
});
