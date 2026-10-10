/**
 * sterilizationJournal.test.ts — Тесты 1-кликовых пресетов СанПиН 3.3686-21,
 * автогенератора циклов автоклавирования (Форма 257/у), контроля качества ПСО (Форма 366/у)
 * и стандартных стерильных лотков без бюрократии.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	AUTOCLAVE_CYCLE_PRESETS,
	CHEMICAL_DISINFECTION_PRESETS,
	createQuickAutoclaveCycle,
	createQuickAzopyramRecord,
	createQuickCombinedPsoRecord,
	createQuickDailyShiftAutoclaveCycles,
	createQuickDailyShiftPsoRecords,
	createQuickPhenolphthaleinRecord,
	createStandardSterileTrayBarcode,
	getChemicalDisinfectionPresetById,
	PSO_QUALITY_CONTROL_PRESETS,
	SANPIN_AUTOCLAVE_CLASS_B_PRESET,
	SANPIN_AUTOCLAVE_VACUUM_TEST_PRESET,
	SANPIN_AZOPYRAM_TEST_PRESET,
	SANPIN_PHENOLPHTHALEIN_TEST_PRESET,
	STANDARD_TRAY_OPTIONS,
} from "../sterilizationPresets";

describe("SterilizationSanPiN — 1-Click Presets & Quick Tray Generation", () => {
	it("содержит стандартные пресеты лотков (терапия, хирургия, эндодонтия)", () => {
		assert.equal(STANDARD_TRAY_OPTIONS.length, 3);
		
		const therapy = STANDARD_TRAY_OPTIONS.find((t) => t.id === "therapy");
		assert.ok(therapy);
		assert.equal(therapy.toolSetCode, "set_therapeutic_tray");
		assert.ok(therapy.labelRu.includes("смотровой лоток терапевта"));

		const surgery = STANDARD_TRAY_OPTIONS.find((t) => t.id === "surgery");
		assert.ok(surgery);
		assert.equal(surgery.toolSetCode, "set_surgery_basic");

		const endo = STANDARD_TRAY_OPTIONS.find((t) => t.id === "endo");
		assert.ok(endo);
		assert.equal(endo.toolSetCode, "set_endo_instruments");
	});

	it("генерирует 1-кликовый крафт-пакет со свежей датой и индикатором 5 класса", () => {
		const fixedDate = new Date("2026-09-04T08:00:00.000Z");
		const tray = createStandardSterileTrayBarcode("therapy", fixedDate, "Смирнова А.В.");

		assert.equal(tray.isValid, true);
		assert.equal(tray.isExpired, false);
		assert.equal(tray.packDateIso, "2026-09-04");
		assert.equal(tray.expDateIso, "2026-10-24"); // +50 суток
		assert.equal(tray.daysRemaining, 50);
		assert.equal(tray.autoclaveId, "АК-01 (Melag 23B+)");
		assert.equal(tray.indicatorPassed, true);
		assert.ok(tray.indicatorClassRu.includes("5 класса"));
		assert.ok(tray.formattedProtocolRecord043.includes("ИнтеТЕСТ 134°C"));
	});

	it("формирует экспресс-цикл автоклавирования B-класса (134°C, 2.1 бар, 5 мин)", () => {
		const cycle = createQuickAutoclaveCycle(1, "Смирнова А.В. (медсестра)");
		assert.equal(cycle.cycleNumber, 1);
		assert.equal(cycle.autoclaveCode, "АК-01");
		assert.equal(cycle.temperatureC, 134);
		assert.equal(cycle.pressureBar, 2.1);
		assert.equal(cycle.exposureMinutes, 5);
		assert.equal(cycle.batchVerdict, "ГОДНА");
		assert.equal(cycle.bowieDickResult, "passed");
		assert.ok(cycle.indicatorPointsStatus.includes("Индикаторы 5 класса"));
	});

	it("формирует экспресс-пробы ПСО (азопирам + фенолфталеин: 100% норма)", () => {
		const azo = createQuickAzopyramRecord("Смирнова А.В.");
		assert.equal(azo.azopyramResult, "negative");
		assert.equal(azo.isApproved, true);
		assert.equal(azo.testedSampleCount, 5);

		const ph = createQuickPhenolphthaleinRecord("Смирнова А.В.");
		assert.equal(ph.phenolphthaleinResult, "negative");
		assert.equal(ph.isApproved, true);

		const combined = createQuickCombinedPsoRecord("Смирнова А.В.");
		assert.equal(combined.testType, "both");
		assert.equal(combined.azopyramResult, "negative");
		assert.equal(combined.phenolphthaleinResult, "negative");
		assert.equal(combined.isApproved, true);
	});

	it("генерирует пакет смены медсестры ЦСО в 1 клик (3 цикла автоклавирования и пробы)", () => {
		const shiftCycles = createQuickDailyShiftAutoclaveCycles("Смирнова А.В.");
		assert.equal(shiftCycles.length, 3);
		assert.equal(shiftCycles[0]?.cycleNumber, 1);
		assert.equal(shiftCycles[1]?.cycleNumber, 2);
		assert.equal(shiftCycles[2]?.cycleNumber, 3);

		const shiftPso = createQuickDailyShiftPsoRecords("Смирнова А.В.");
		assert.equal(shiftPso.length, 2);
		assert.equal(shiftPso[0]?.isApproved, true);
		assert.equal(shiftPso[1]?.isApproved, true);
	});

	it("предоставляет модульные справочники AUTOCLAVE_CYCLE_PRESETS, CHEMICAL_DISINFECTION_PRESETS и PSO_QUALITY_CONTROL_PRESETS по СанПиН 3.3686-21", () => {
		assert.ok(AUTOCLAVE_CYCLE_PRESETS.length >= 7);
		assert.equal(SANPIN_AUTOCLAVE_CLASS_B_PRESET.temperatureC, 134);
		assert.equal(SANPIN_AUTOCLAVE_VACUUM_TEST_PRESET.bowieDickResult, "passed");

		assert.ok(CHEMICAL_DISINFECTION_PRESETS.length >= 6);
		const alaminol = getChemicalDisinfectionPresetById("alaminol_instruments_immersion");
		assert.ok(alaminol);
		assert.equal(alaminol.concentrationPercent, 1.5);
		assert.equal(alaminol.exposureMinutes, 60);

		const ultrasonicBurs = getChemicalDisinfectionPresetById("optimax_pro_rotary_ultrasonic");
		assert.ok(ultrasonicBurs);
		assert.equal(ultrasonicBurs.methodRu, "ультразвуковая_ванна");
		assert.equal(ultrasonicBurs.exposureMinutes, 15);

		assert.equal(PSO_QUALITY_CONTROL_PRESETS.length, 2);
		assert.equal(SANPIN_AZOPYRAM_TEST_PRESET.azopyramResult, "negative");
		assert.equal(SANPIN_PHENOLPHTHALEIN_TEST_PRESET.phenolphthaleinResult, "negative");
	});
});

