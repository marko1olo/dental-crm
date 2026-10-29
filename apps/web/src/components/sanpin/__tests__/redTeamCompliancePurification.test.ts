/**
 * redTeamCompliancePurification.test.ts
 *
 * Инструментальная верификация Инквизиции Клинического Соответствия (Red Team):
 * Пакетное проведение стерилизации и предстерилизационной очистки в 1 клик,
 * автоматическое списание расходников со склада (Мандат 8n), изоляция моков (Мандат 8c),
 * ликвидация поштучного сканирования штрихкодов и академического блоата.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	AUTOCLAVE_PROGRAMS,
	CLINIC_STERILIZERS,
	PSO_QUALITY_STANDARD,
	calculateBatchStockDeduction,
	createOneClickShiftBatch,
	generateSanpinPrintHtml,
	getSanpinBatchRecords,
} from "../sanpinCatalogData";
import {
	createQuickAutoclaveCycle,
	createQuickCombinedPsoRecord,
	fetchPsoLogsFromApi,
	fetchSterilizationLogsFromApi,
	saveQuickAutoclaveCycleToApi,
	saveQuickPsoRecordToApi,
} from "../sterilization/sterilizationPresets";

describe("Red Team Compliance: Пакетная стерилизация СанПиН 3.3686-21 и Zero-Mocks изоляция", () => {
	it("в боевом режиме (isDemo = false) реестр циклов строго пуст (0% синтетических моков)", () => {
		const cyclesProd = getSanpinBatchRecords(false);
		assert.equal(
			cyclesProd.length,
			0,
			"В боевом аккаунте клиники не должно быть синтетических записей стерилизации!",
		);
	});

	it("в демонстрационном режиме (isDemo = true) возвращаются обучающие циклы смены", () => {
		const cyclesDemo = getSanpinBatchRecords(true);
		assert.ok(cyclesDemo.length >= 2, "В демо-режиме должны присутствовать образцы");
		const standard = cyclesDemo.find((c) => c.programId === "standard_134");
		assert.ok(standard, "Образец стандартного цикла 134°C обязан присутствовать");
		assert.equal(standard.chemicalIndicatorVerdict, "ПРОЙДЕН");
	});

	it("функции REST API стерилизации экспортированы и готовы к вызову Fastify бэкенда", () => {
		assert.equal(typeof saveQuickAutoclaveCycleToApi, "function");
		assert.equal(typeof saveQuickPsoRecordToApi, "function");
		assert.equal(typeof fetchSterilizationLogsFromApi, "function");
		assert.equal(typeof fetchPsoLogsFromApi, "function");
	});

	it("генератор цикла автоклавирования создает валидную модель для /api/registers/sterilization", () => {
		const cycle = createQuickAutoclaveCycle(1, "Иванова М.И. (медсестра ЦСО)");
		assert.equal(cycle.cycleNumber, 1);
		assert.equal(cycle.temperatureC, 134);
		assert.equal(cycle.pressureBar, 2.1);
		assert.equal(cycle.batchVerdict, "ГОДНА");
		assert.ok(cycle.autoclaveCode.length > 0);
	});

	it("генератор контроля очистки формирует валидный протокол для /api/registers/pso", () => {
		const pso = createQuickCombinedPsoRecord("Иванова М.И. (медсестра ЦСО)");
		assert.equal(pso.azopyramResult, "negative");
		assert.equal(pso.phenolphthaleinResult, "negative");
		assert.equal(pso.isApproved, true);
	});
});

describe("Red Team Compliance: Пакетное проведение смены ЦСО в 1 клик и списание расходников", () => {
	it("формирует полный пакет смены в 1 вызов (цикл автоклавирования + пробы очистки + списание)", () => {
		const batch = createOneClickShiftBatch({
			packagesCount: 16,
			operatorName: "Иванова Е. С., ассистент ЦСО",
			programId: "standard_134",
		});

		// 1. Проверка параметров стерилизации
		assert.equal(batch.sterilizationCycle.packagesCount, 16);
		assert.equal(batch.sterilizationCycle.temperatureCelsius, 134);
		assert.equal(batch.sterilizationCycle.pressureBar, 2.1);
		assert.equal(batch.sterilizationCycle.exposureMinutes, 5);
		assert.equal(batch.sterilizationCycle.chemicalIndicatorVerdict, "ПРОЙДЕН");
		assert.equal(batch.sterilizationCycle.status, "completed");

		// 2. Проверка предстерилизационной очистки
		assert.equal(batch.psoRecord.azopyramResult, "negative");
		assert.equal(batch.psoRecord.phenolphthaleinResult, "negative");
		assert.equal(batch.psoRecord.verdict, "ГОДНО");
		assert.ok(batch.psoRecord.testedItemsCount >= 3, "Норматив выборки: не менее 3 изделий");

		// 3. Автоматическое пакетное списание расходников со склада (Мандат 8n: Soft Negative Stock)
		assert.ok(batch.deductedStock.length >= 4, "Должно быть списано минимум 4 номенклатурных позиции");
		const kraftPacks = batch.deductedStock.find((i) => i.sku === "KRAFT-100X200");
		assert.ok(kraftPacks, "Крафт-пакеты должны быть списаны");
		assert.equal(kraftPacks.quantity, 16);

		const indicators = batch.deductedStock.find((i) => i.sku === "IND-CLASS5-MEDIS");
		assert.ok(indicators, "Индикаторы 5 класса должны быть списаны");
		assert.ok(indicators.quantity >= 2);
	});

	it("расчет списания расходников корректно масштабируется под размер партии", () => {
		const deductionSmall = calculateBatchStockDeduction(6);
		const deductionLarge = calculateBatchStockDeduction(24);

		const kraftSmall = deductionSmall.find((i) => i.sku === "KRAFT-100X200");
		const kraftLarge = deductionLarge.find((i) => i.sku === "KRAFT-100X200");

		assert.equal(kraftSmall?.quantity, 6);
		assert.equal(kraftLarge?.quantity, 24);
	});

	it("содержит валидные программы автоклавирования по СанПиН 3.3686-21", () => {
		assert.ok(AUTOCLAVE_PROGRAMS.length >= 2);
		const p134 = AUTOCLAVE_PROGRAMS.find((p) => p.temperatureCelsius === 134);
		const p121 = AUTOCLAVE_PROGRAMS.find((p) => p.temperatureCelsius === 121);

		assert.ok(p134, "Программа 134°C обязана присутствовать");
		assert.ok(p121, "Программа 121°C обязана присутствовать");
		assert.equal(p134.pressureBar, 2.1);
		assert.equal(p121.pressureBar, 1.15);
	});

	it("стандарты очистки устанавливают отрицательные результаты проб", () => {
		assert.equal(PSO_QUALITY_STANDARD.azopyramResult, "negative");
		assert.equal(PSO_QUALITY_STANDARD.phenolphthaleinResult, "negative");
		assert.equal(PSO_QUALITY_STANDARD.minItemsCount, 3);
	});

	it("генератор бланка печати формирует валидный HTML без советских шифров", () => {
		const sampleCycles = getSanpinBatchRecords(true);
		const html = generateSanpinPrintHtml(sampleCycles);

		assert.ok(html.includes("Журнал контроля стерилизации инструментов"));
		assert.ok(html.includes("Melag Vacuklav"));
		assert.ok(html.includes("ПРОЙДЕН"));
		assert.ok(!html.includes("Форма 257/у"), "Запрещен советский шифр 257/у");
	});
});
