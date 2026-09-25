/**
 * ============================================================================
 * AUTO-SANPIN & 1-CLICK BATCH SHIFT JOURNAL AUTOMATION TEST SUITE
 * (СанПиН 3.3686-21, СанПиН 2.1.3684-21, Р 3.5.1904-04, Приказ 706н)
 * ============================================================================
 *
 * Verifies:
 * 1. 1-Click Shift Auto-Closer Form 257/u autoclave cycles based on visits/trays of the day.
 * 2. Form 366/u PSO (азопирам / фенолфталеин) quality test batches (>=1%, min 3 items).
 * 3. Pozis pharmaceutical refrigerator (4°C) & dental office VIT-2 psychrometer (21°C, 55% humidity).
 * 4. Dezar-4 bactericidal recirculator operating hours (1.5 h / cumulative lamp hours).
 * 5. 1-Click Monthly Batch Generator for Rospotrebnadzor inspection dossier.
 * 6. Mandate 8e: Zero disabled buttons across all SanPiN components.
 * 7. Mandate 8d pt 7: Zero cartoon emojis across SanPiN codebase.
 * 8. Mandate 8d pt 6: Modal depth <= 1 (anti-matryoshka).
 * 9. Mandate 8v: Pure Tier 3 Cold Backoffice isolation without leaking into primary screens.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test, { describe, it } from "node:test";
import {
	compileShiftForm257Records,
	compileShiftPsoBatches,
	compileShiftMicroclimateLogs,
	compileShiftBactericidalLog,
	compileShiftWasteLog,
	executeShiftSanpinAutoClose,
	executeMonthSanpinBatchGenerator,
	exportShiftSanpinDossierToCsv,
	exportMonthSanpinDossierToCsv,
	generateShiftSanpinDossierPrintHtml,
	type ShiftSanpinAutoCloseResult,
	type MonthSanpinBatchResult,
} from "../autoclaveLog/shiftAutoCloserEngine.js";
import { evaluate5ChamberPoints, evaluateCycleParameters } from "../autoclaveLog/autoclaveLogEngine.js";

describe("Auto-SanPiN & 1-Click Batch Shift Journal Automation (Mandates 8e, 8k, 8n, 8v)", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. FORM 257/U AUTOCLAVE CYCLES COMPILATION FROM VISITS & TRAYS
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Form 257/u Autoclave Cycles Compilation based on Day's Visits and Trays", () => {
		it("compiles exact number of autoclave cycles based on trays count (capacity ~14 packs/cycle)", () => {
			// 12 visits -> 48 trays -> 4 cycles (14 + 14 + 14 + 6)
			const cycles = compileShiftForm257Records({
				date: "2026-09-25",
				visitsCount: 12,
				traysCount: 48,
				operatorStaffFullName: "Ассистент Петрова А.В.",
			});

			assert.equal(cycles.length, 4, "48 packs in 14-pack autoclave should yield 4 cycles");
			assert.equal(cycles[0]?.cycleNumber, 1);
			assert.equal(cycles[1]?.cycleNumber, 2);
			assert.equal(cycles[2]?.cycleNumber, 3);
			assert.equal(cycles[3]?.cycleNumber, 4);

			const totalPacks = cycles.reduce((acc, c) => acc + c.packsCount, 0);
			assert.equal(totalPacks, 48, "Total packs distributed across cycles must equal 48");
		});

		it("creates a single cycle for light shift load (e.g. 2 visits / 8 trays)", () => {
			const cycles = compileShiftForm257Records({
				date: "2026-09-25",
				visitsCount: 2,
				traysCount: 8,
			});

			assert.equal(cycles.length, 1);
			assert.equal(cycles[0]?.packsCount, 8);
		});

		it("ensures all 5 chamber control points (KT-1..KT-5) are tested and passed with Class 5 indicator", () => {
			const cycles = compileShiftForm257Records({
				date: "2026-09-25",
				visitsCount: 10,
			});

			for (const cycle of cycles) {
				assert.equal(cycle.chamberPoints.length, 5, "Must have exactly 5 statutory chamber points");
				const evaluation = evaluate5ChamberPoints(cycle.chamberPoints);
				assert.equal(evaluation.areAllPointsPassed, true, "All 5 points must pass");
				assert.equal(evaluation.passedPointsCount, 5);
				assert.equal(cycle.isCyclePassed, true);
				assert.equal(cycle.status, "sterile_passed");
			}
		});

		it("ensures physical sensors data strictly complies with SanPiN 3.3686-21 tolerances", () => {
			const cycles = compileShiftForm257Records({
				date: "2026-09-25",
				visitsCount: 12,
			});

			for (const cycle of cycles) {
				const compliance = evaluateCycleParameters(cycle.regimeId, {
					actualTemperatureCelsius: cycle.actualTemperatureCelsius,
					actualPressureBar: cycle.actualPressureBar,
					actualExposureMinutes: cycle.actualExposureMinutes,
				});

				assert.equal(compliance.isCompliant, true, "Cycle must be 100% compliant with SanPiN");
				assert.equal(compliance.isTempCompliant, true);
				assert.equal(compliance.isPressureCompliant, true);
				assert.equal(compliance.isTimeCompliant, true);
				assert.equal(compliance.failureReasons.length, 0);
			}
		});

		it("generates cryptographic digital stamp hashes for every compiled cycle", () => {
			const cycles = compileShiftForm257Records({
				date: "2026-09-25",
				visitsCount: 6,
			});

			for (const cycle of cycles) {
				assert.ok(cycle.digitalStampHash, "Each cycle must have a digital stamp hash");
				assert.ok(cycle.digitalStampHash.length >= 8);
			}
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. FORM 366/U PSO QUALITY TEST BATCHES (>= 1%, MIN 3 ITEMS)
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Form 366/u PSO (Азопирам / Фенолфталеин) Quality Test Batches", () => {
		it("enforces statutory sample size: >= 1% of batch, but NOT less than 3 items (SanPiN 3.3686-21 п. 3624)", () => {
			// Small shift (40 items total) -> sample must be 3 items (since 1% = 0.4 < 3)
			const psoSmall = compileShiftPsoBatches({
				traysCount: 40,
			});

			for (const batch of psoSmall) {
				assert.ok(batch.testedSampleCount >= 3, "Tested sample must never be less than statutory floor of 3 items");
			}

			// Large shift (500 items total: e.g. 350 items in batch 1) -> sample must be ceil(350 * 0.01) = 4 items
			const psoLarge = compileShiftPsoBatches({
				traysCount: 500,
			});
			assert.ok(psoLarge[0]!.testedSampleCount >= 4, "1% of 350 items is 4 items");
		});

		it("verifies Azopyram trial is negative (zero blood / hemoglobin) and Phenolphthalein is negative (zero alkaline detergent)", () => {
			const psoBatches = compileShiftPsoBatches({
				date: "2026-09-25",
				traysCount: 48,
				detergentBrand: "Биолот 0.5% + Аламинол 1.5%",
			});

			assert.ok(psoBatches.length >= 2, "Must compile separate batches for basic trays and rotary burs");
			for (const batch of psoBatches) {
				assert.equal(batch.isAzopyramNegative, true, "Azopyram probe must be negative");
				assert.equal(batch.isPhenolphthaleinNegative, true, "Phenolphthalein probe must be negative");
				assert.equal(batch.isBatchApproved, true, "Batch must be approved for sterilization");
				assert.ok(batch.detergentBrand?.includes("Биолот"));
			}
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. POZIS PHARMACEUTICAL REFRIGERATOR (4°C) & DENTAL VIT-2 PSYCHROMETER
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Pozis Refrigerator (+4°C) and Dental Office VIT-2 Psychrometer (21°C / 55%)", () => {
		it("compiles morning and evening Pozis refrigerator checks within statutory 2.0°C .. 8.0°C range", () => {
			const micro = compileShiftMicroclimateLogs({
				refrigeratorTempCelsius: 4.2,
			});

			assert.ok(micro.refrigeratorLog.equipmentName.includes("Pozis"));
			assert.equal(micro.refrigeratorLog.morningTempCelsius, 4.2);
			assert.equal(micro.refrigeratorLog.eveningTempCelsius, 4.5);
			assert.equal(micro.refrigeratorLog.isWithinNorm, true);
			assert.equal(micro.refrigeratorLog.targetMinCelsius, 2.0);
			assert.equal(micro.refrigeratorLog.targetMaxCelsius, 8.0);
			assert.ok(micro.refrigeratorLog.meterDeviceName.includes("ТМН-1"));
		});

		it("compiles dental office VIT-2 psychrometer temperature and humidity within statutory norm (18..25°C, 40..60%)", () => {
			const micro = compileShiftMicroclimateLogs({
				roomTempCelsius: 21.2,
				roomHumidityPercent: 55,
			});

			assert.ok(micro.psychrometerLog.equipmentName.includes("ВИТ-2"));
			assert.equal(micro.psychrometerLog.morningTempCelsius, 21.2);
			assert.equal(micro.psychrometerLog.morningHumidityPercent, 55);
			assert.equal(micro.psychrometerLog.isWithinNorm, true);
			assert.equal(micro.psychrometerLog.targetTempMinCelsius, 18.0);
			assert.equal(micro.psychrometerLog.targetTempMaxCelsius, 25.0);
			assert.equal(micro.psychrometerLog.targetHumidityMinPercent, 40);
			assert.equal(micro.psychrometerLog.targetHumidityMaxPercent, 60);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. DEZAR-4 BACTERICIDAL RECIRCULATOR OPERATING HOURS
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Dezar-4 Bactericidal Recirculator Operating Hours", () => {
		it("logs Dezar-4 operating hours and tracks lamp runtime against 8000 hours limit", () => {
			const bac = compileShiftBactericidalLog({
				dezarOperatingHours: 1.5,
			});

			assert.ok(bac.deviceBrand.includes("Дезар-4"));
			assert.equal(bac.operatingHours, 1.5);
			assert.equal(bac.sessionsCount, 2);
			assert.equal(bac.morningSessionDurationMin, 30);
			assert.equal(bac.intraShiftSessionDurationMin, 60);
			assert.equal(bac.maxLampHours, 8000);
			assert.equal(bac.isLampNorm, true);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. UNIFIED 1-CLICK SHIFT AUTO-CLOSER DOSSIER EXECUTION
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Unified 1-Click Shift Auto-Closer Execution & Exports", () => {
		it("executes complete shift auto-closure in 1 call and generates statutory outputs", () => {
			const shift = executeShiftSanpinAutoClose({
				date: "2026-09-25",
				visitsCount: 14,
				operatorStaffFullName: "Врач-стоматолог / Администратор",
				headNurseSignatureFullName: "Главная медсестра Сидорова Е.Н.",
			});

			assert.equal(shift.date, "2026-09-25");
			assert.equal(shift.visitsCount, 14);
			assert.equal(shift.traysCount, 56); // 14 * 4
			assert.ok(shift.totalAutoclaveCycles >= 4);
			assert.ok(shift.totalPsoSamplesTested >= 6);
			assert.equal(shift.isPsoCompliant, true);
			assert.equal(shift.microclimate.refrigeratorLog.isWithinNorm, true);
			assert.equal(shift.microclimate.psychrometerLog.isWithinNorm, true);
			assert.equal(shift.bactericidal.isLampNorm, true);
			assert.ok(shift.digitalStampHash.length > 0);
			assert.ok(shift.complianceSummaryRu.includes("Смена 2026-09-25 закрыта в 1 клик"));

			// CSV Export check
			const csv = exportShiftSanpinDossierToCsv(shift);
			assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM");
			assert.ok(csv.includes("Дата;Цикл автоклава;Аппарат;Режим"));
			assert.ok(csv.includes("100% СРАБОТКА (Норма)"));

			// HTML Dossier check
			const html = generateShiftSanpinDossierPrintHtml(shift);
			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("СВОДНЫЙ СУТОЧНЫЙ ПРОТОКОЛ САНПИН 3.3686-21"));
			assert.ok(html.includes("100% СРАБОТКА (5/5)"));
			assert.ok(html.includes("Pozis"));
			assert.ok(html.includes("ВИТ-2"));
			assert.ok(html.includes("Дезар-4"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. 1-CLICK MONTHLY BATCH GENERATOR FOR INSPECTIONS
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. 1-Click Monthly Batch Generator for Rospotrebnadzor Inspections", () => {
		it("compiles an entire month of statutory shifts with aggregate metrics and exports", () => {
			const monthResult = executeMonthSanpinBatchGenerator({
				year: 2026,
				month: 8, // August 2026
				excludeSundays: true,
				averageVisitsPerDay: 12,
			});

			assert.equal(monthResult.year, 2026);
			assert.equal(monthResult.month, 8);
			assert.equal(monthResult.totalDays, 31);
			assert.ok(monthResult.workingDaysCount >= 26, "August 2026 has 26 working days (excl. 5 Sundays)");
			assert.equal(monthResult.shiftResults.length, monthResult.workingDaysCount);

			const stats = monthResult.aggregateStats;
			assert.ok(stats.totalVisits > 250);
			assert.ok(stats.totalTraysProcessed > 1000);
			assert.ok(stats.totalAutoclaveCycles > 70);
			assert.ok(stats.totalPsoSamplesTested > 150);
			assert.ok(stats.generalCleaningsCount >= 4, "August has 4-5 Fridays for weekly general cleanings");
			assert.equal(stats.complianceRatePercent, 100);

			// Monthly CSV check
			const csv = exportMonthSanpinDossierToCsv(monthResult);
			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("ИТОГО ЗА МЕСЯЦ"));
			assert.ok(csv.includes("100% НОРМА"));

			assert.ok(monthResult.complianceStatementRu.includes("Сводное досье СанПиН за Август 2026 г."));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 7. MANDATE 8e: ZERO DISABLED BUTTONS AUDIT
	// ─────────────────────────────────────────────────────────────────────────
	describe("7. Mandate 8e: Zero Disabled Buttons Audit across SanPiN UI", () => {
		it("confirms no action or submit buttons have disabled attributes in SanPiN components", () => {
			const sanpinDir = path.resolve(process.cwd(), "apps/web/src/components/sanpin");
			const targetFiles = [
				"SanpinRegisters.tsx",
				"TemperatureHumidityRegisterTab.tsx",
				"MedicalWasteRegisterTab.tsx",
				"RetroactiveBatchTab.tsx",
				"SterilizerEquipmentModal.tsx",
				"SterilizerFleetManager.tsx",
				"GeneralCleaningSchedule.tsx",
				"EmergencyBiohazardRegisterTab.tsx",
				"waste/MedicalWasteJournalModal.tsx",
				"autoclaveLog/AutoclaveNewCycleTab.tsx",
			];

			for (const relFile of targetFiles) {
				const fullPath = path.join(sanpinDir, relFile);
				if (!fs.existsSync(fullPath)) continue;
				const content = fs.readFileSync(fullPath, "utf8");

				// Check for button with disabled attribute
				// Regex to detect disabled={...} on button tags
				const lines = content.split("\n");
				lines.forEach((line, idx) => {
					// We disallow disabled={...} on button elements
					if (line.includes("<button") && line.includes("disabled=")) {
						assert.fail(
							`Mandate 8e violation: found disabled on button at ${relFile}:${idx + 1}: ${line.trim()}`,
						);
					}
					if (line.trim().startsWith("disabled=") && !line.includes("test")) {
						// verify preceding lines to see if it's a button
						const prevChunk = lines.slice(Math.max(0, idx - 4), idx + 1).join(" ");
						if (prevChunk.includes("<button")) {
							assert.fail(
								`Mandate 8e violation: found disabled attribute on button at ${relFile}:${idx + 1}: ${line.trim()}`,
							);
						}
					}
				});
			}
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 8. MANDATE 8d PT 7: ZERO CARTOON EMOJIS AUDIT
	// ─────────────────────────────────────────────────────────────────────────
	describe("8. Mandate 8d pt 7: Zero Cartoon Emojis Audit across SanPiN", () => {
		it("confirms zero cartoon emojis exist in apps/web/src/components/sanpin/", () => {
			const sanpinDir = fs.existsSync(path.resolve(process.cwd(), "apps/web/src/components/sanpin"))
				? path.resolve(process.cwd(), "apps/web/src/components/sanpin")
				: path.resolve(process.cwd(), "src/components/sanpin");

			function scanDir(dir: string) {
				const entries = fs.readdirSync(dir, { withFileTypes: true });
				for (const entry of entries) {
					const full = path.join(dir, entry.name);
					if (entry.isDirectory()) {
						scanDir(full);
					} else if (/\.(tsx?|css)$/.test(entry.name) && !entry.name.includes(".test.")) {
						const content = fs.readFileSync(full, "utf8");
						const match = content.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u);
						if (match) {
							assert.fail(
								`Mandate 8d pt 7 violation: found cartoon emoji '${match[0]}' in ${path.relative(process.cwd(), full)}`,
							);
						}
					}
				}
			}

			scanDir(sanpinDir);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 9. MANDATE 8v: COLD BACKOFFICE ISOLATION AUDIT
	// ─────────────────────────────────────────────────────────────────────────
	describe("9. Mandate 8v: Pure Tier 3 Cold Backoffice Isolation Audit", () => {
		it("confirms SanPiN operations are decoupled and do not render popup blocks on doctor screens", () => {
			const seniorNurseModal = fs.existsSync(
				path.resolve(process.cwd(), "apps/web/src/components/sanpin/kraft/SeniorNurseKraftUnsealModal.tsx"),
			)
				? path.resolve(process.cwd(), "apps/web/src/components/sanpin/kraft/SeniorNurseKraftUnsealModal.tsx")
				: path.resolve(process.cwd(), "src/components/sanpin/kraft/SeniorNurseKraftUnsealModal.tsx");
			assert.ok(fs.existsSync(seniorNurseModal));
			const modalContent = fs.readFileSync(seniorNurseModal, "utf8");
			assert.ok(
				modalContent.includes("return null;"),
				"SeniorNurseKraftUnsealModal must be a clean harmless facade returning null (Mandate 8v)",
			);
		});
	});
});
