/**
 * ============================================================================
 * RETROACTIVE SANPIN ENGINE DECOMPOSITION TEST SUITE
 * Comprehensive verification of modularized retroactive SanPiN 3.3686-21 engine.
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	AUTOCLAVE_REGIME_PRESETS,
	STATUTORY_CLINIC_CABINETS,
	calculatePeriodDateRange,
	calculateRetroactiveBatchStats,
	exportRetroactiveBatchToCsv,
	generateRetroactiveDossierPrintHtml,
	generateRetroactiveSanpinDays,
	type RetroactiveGenerationOptions,
} from "../retroactiveSanpinEngine.js";
import {
	calculateAutoclaveCycles,
	calculateEstimatedTrays,
	calculatePsoSampleSize,
} from "../retroactiveSanpin/retroactiveCycleGenerator.js";
import {
	matchDisinfectantForCleaning,
	matchPsoDetergent,
	resolveAutoclaveRegime,
} from "../retroactiveSanpin/retroactiveDisinfectionMatcher.js";
import {
	validateRetroactiveBatchSanpin,
	validateRetroactiveDaySanpin,
} from "../retroactiveSanpin/retroactiveSanpinValidator.js";

describe("Retroactive SanPiN 3.3686-21 Engine (Decomposed Architecture)", () => {
	describe("1. Statutory Presets and Disinfection Matching (Layer 1)", () => {
		it("provides statutory clinical cabinets without hardcoded doctor names", () => {
			assert.equal(STATUTORY_CLINIC_CABINETS.length, 4);
			const cabinetNames = STATUTORY_CLINIC_CABINETS.map((c) => c.defaultDoctor);
			assert.ok(cabinetNames.includes("Врач-стоматолог 1"));
			assert.ok(cabinetNames.includes("Врач-стоматолог 2"));
			assert.ok(cabinetNames.includes("Врач-стоматолог 3"));
			assert.ok(cabinetNames.includes("Медсестра ЦСО"));
			// Absence of synthetic names
			assert.equal(cabinetNames.some((n) => n.includes("Иванов")), false);
			assert.equal(cabinetNames.some((n) => n.includes("Смирнов")), false);
		});

		it("contains autoclave regimes with Class 4 and 5 chemical indicators", () => {
			assert.ok(AUTOCLAVE_REGIME_PRESETS.length >= 4);
			const standardB = resolveAutoclaveRegime("steam_134_5min");
			assert.equal(standardB.temperatureCelsius, 134);
			assert.equal(standardB.durationMinutes, 5);
			assert.equal(standardB.pressureBar, 2.15);
			assert.ok(standardB.indicatorClass.includes("Класс 5"));
		});

		it("matches statutory disinfectants for general and routine cleaning", () => {
			const general = matchDisinfectantForCleaning(true);
			assert.ok(general.cleaningTypeRu.includes("Генеральная уборка"));
			assert.ok(general.cleaningDisinfectant.includes("Аламинол 3.0%"));

			const routine = matchDisinfectantForCleaning(false);
			assert.ok(routine.cleaningTypeRu.includes("Текущая дезинфекция"));
			assert.ok(routine.cleaningDisinfectant.includes("Оптимакс"));

			assert.equal(matchPsoDetergent(), "Биолот 0.5% + Аламинол 1.5%");
		});

		it("calculates statutory period date ranges correctly", () => {
			const ref = "2026-10-15";
			const lastWeek = calculatePeriodDateRange("last_week", undefined, undefined, ref);
			assert.equal(lastWeek.startDate, "2026-10-09");
			assert.equal(lastWeek.endDate, "2026-10-15");

			const currentMonth = calculatePeriodDateRange("current_month", undefined, undefined, ref);
			assert.equal(currentMonth.startDate, "2026-10-01");
			assert.equal(currentMonth.endDate, "2026-10-15");

			const custom = calculatePeriodDateRange("custom", "2026-09-01", "2026-09-30");
			assert.equal(custom.startDate, "2026-09-01");
			assert.equal(custom.endDate, "2026-09-30");
		});
	});

	describe("2. Cycle & Sample Generation Formulas (Layer 2)", () => {
		it("calculates trays, PSO samples (1% min 3-5), and autoclave cycles correctly", () => {
			assert.equal(calculateEstimatedTrays(10), 40);
			// 1% of 40 is 0.4 -> Math.max(3, ceil(0.4)) = 3
			assert.equal(calculatePsoSampleSize(40), 3);
			// 1% of 400 is 4 -> Math.max(3, ceil(4)) = 4
			assert.equal(calculatePsoSampleSize(400), 4);
			// 1% of 800 is 8 -> Math.max(3, ceil(8)) = 8
			assert.equal(calculatePsoSampleSize(800), 8);

			// 40 trays / 12 per cycle = 4 cycles
			assert.equal(calculateAutoclaveCycles(40), 4);
			// Min 2 cycles
			assert.equal(calculateAutoclaveCycles(5), 2);
		});

		it("generates deterministic day records with full statutory compliance", () => {
			const options: RetroactiveGenerationOptions = {
				preset: "custom",
				startDate: "2026-10-05", // Monday
				endDate: "2026-10-11", // Sunday
				selectedCabinets: ["cabinet_1", "cabinet_2"],
				dutyNurseFullName: "Петрова Елена Сергеевна",
				dutyNursePosition: "Старшая медсестра",
				autoclaveRegimeId: "steam_134_5min",
				sterilizerModelName: "Melag Vacuklav 23B+",
				excludeSundays: true,
				averageVisitsPerCabinetDay: 5,
			};

			const days = generateRetroactiveSanpinDays(options);
			assert.equal(days.length, 7);

			// Monday to Saturday are working days (6), Sunday is non-working (1)
			const working = days.filter((d) => d.isWorkingDay);
			const nonWorking = days.filter((d) => !d.isWorkingDay);
			assert.equal(working.length, 6);
			assert.equal(nonWorking.length, 1);

			// Sunday check
			const sunday = nonWorking[0]!;
			assert.equal(sunday.dayOfWeekRu, "Воскресенье");
			assert.equal(sunday.visitsCount, 0);
			assert.equal(sunday.traysProcessedCount, 0);
			assert.ok(sunday.electronicStampHash.includes("SUNDAY-OFF"));

			// Working day checks
			const monday = working[0]!;
			assert.equal(monday.cabinetsCount, 2);
			assert.equal(monday.visitsCount, 10); // 2 cabs * 5 visits
			assert.equal(monday.traysProcessedCount, 40); // 10 * 4
			assert.equal(monday.psoSampleCount, 3);
			assert.equal(monday.points5Passed, true);
			assert.equal(monday.sanpinCompliance100, true);
			assert.equal(monday.nurseFullName, "Петрова Елена Сергеевна");

			// Aggregate stats
			const stats = calculateRetroactiveBatchStats(days);
			assert.equal(stats.totalDays, 7);
			assert.equal(stats.workingDaysCount, 6);
			assert.ok(stats.totalTraysProcessed > 0);
			assert.ok(stats.totalPsoSamplesTested > 0);
			assert.ok(stats.totalAutoclaveCycles > 0);
			assert.equal(stats.compliancePercentage, 100);
		});
	});

	describe("3. SanPiN Validation, Dossier & CSV Export (Layer 3)", () => {
		it("validates day record compliance under SanPiN 3.3686-21", () => {
			const options: RetroactiveGenerationOptions = {
				preset: "custom",
				startDate: "2026-10-05",
				endDate: "2026-10-06",
				selectedCabinets: ["cabinet_1"],
				dutyNurseFullName: "Медсестра ЦСО",
				dutyNursePosition: "Медсестра",
				autoclaveRegimeId: "steam_134_5min",
				sterilizerModelName: "Melag Vacuklav 23B+",
			};
			const days = generateRetroactiveSanpinDays(options);
			const audit = validateRetroactiveBatchSanpin(days);
			assert.equal(audit.compliantDaysCount, 2);
			assert.equal(audit.totalIssuesFound, 0);
			assert.equal(audit.complianceRatePercent, 100);

			// Introduce violation to verify adversarial detection
			const defective = { ...days[0]!, psoSampleCount: 1, isAzopyramNegative: false };
			const singleResult = validateRetroactiveDaySanpin(defective);
			assert.equal(singleResult.isCompliant, false);
			assert.equal(singleResult.issues.length, 2);
			assert.equal(singleResult.issues.some((i) => i.code === "PSO_SAMPLE_UNDERSIZED"), true);
			assert.equal(singleResult.issues.some((i) => i.code === "AZOPYRAM_POSITIVE"), true);
		});

		it("generates A4 landscape print dossier with inspection tables", () => {
			const options: RetroactiveGenerationOptions = {
				preset: "custom",
				startDate: "2026-10-01",
				endDate: "2026-10-03",
				selectedCabinets: ["cabinet_1", "cabinet_2"],
				dutyNurseFullName: "Медсестра ЦСО",
				dutyNursePosition: "Медсестра",
				autoclaveRegimeId: "steam_134_5min",
				sterilizerModelName: "Melag Vacuklav 23B+",
			};
			const days = generateRetroactiveSanpinDays(options);
			const html = generateRetroactiveDossierPrintHtml(days, {
				clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
				periodLabelRu: "Октябрь 2026",
			});

			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("СВОДНОЕ ДОСЬЕ ПРОИЗВОДСТВЕННОГО КОНТРОЛЯ И РЕЕСТРЫ САНПИН"));
			assert.ok(html.includes("СанПиН 3.3686-21"));
			assert.ok(html.includes("Форма № 257/у"));
			assert.ok(html.includes("Форма № 366/у"));
			assert.ok(html.includes("ООО «Стоматологическая клиника ДЕНТЕ»"));
		});

		it("exports RFC 4180 CSV with UTF-8 BOM", () => {
			const options: RetroactiveGenerationOptions = {
				preset: "custom",
				startDate: "2026-10-01",
				endDate: "2026-10-02",
				selectedCabinets: ["cabinet_1"],
				dutyNurseFullName: "Медсестра ЦСО",
				dutyNursePosition: "Медсестра",
				autoclaveRegimeId: "steam_134_5min",
				sterilizerModelName: "Melag Vacuklav 23B+",
			};
			const days = generateRetroactiveSanpinDays(options);
			const csv = exportRetroactiveBatchToCsv(days);

			assert.ok(csv.startsWith("\uFEFF")); // UTF-8 BOM
			assert.ok(csv.includes("Дата;День недели;Рабочий день"));
			assert.ok(csv.includes("Азопирам проба"));
			assert.ok(csv.includes("5 точек камеры (КТ-1..5)"));
			assert.ok(csv.includes("2026-10-01"));
		});
	});
});
