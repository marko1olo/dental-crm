import assert from "node:assert";
import { describe, test } from "node:test";
import {
	exportBatchToSanpinSummary,
	generateRetroactiveSanpinBatch,
	type RetroactiveSanpinBatchOptions,
} from "../index.js";

describe("Retroactive SanPiN 3.3686-21 Batch Generation Engine", () => {
	// ─── 1. DATE RANGE & CALENDAR STRUCTURE ────────────────────────────────────
	describe("1. Date Range & Calendar Scheduling", () => {
		test("generates complete calendar day coverage without missing dates", () => {
			const batch = generateRetroactiveSanpinBatch({
				startDate: "2026-08-01",
				endDate: "2026-08-31", // 31 days
				seed: 101,
			});

			assert.strictEqual(batch.period.totalCalendarDays, 31);
			assert.strictEqual(batch.dailySummaries.length, 31);

			// Exactly 31 days * 2 measurements (morning + evening) = 62 temperature logs
			assert.strictEqual(batch.refrigeratorRecords.length, 62);

			// Verify chronological continuity
			for (let i = 0; i < batch.dailySummaries.length; i++) {
				const dayNum = String(i + 1).padStart(2, "0");
				assert.strictEqual(batch.dailySummaries[i]!.date, `2026-08-${dayNum}`);
			}
		});

		test("correctly differentiates working days, weekends, and holidays", () => {
			// August 2026:
			// 2026-08-01 = Saturday (working in default 6-day week)
			// 2026-08-02 = Sunday (weekend)
			// 2026-08-03..08 = Mon..Sat (working)
			const batch = generateRetroactiveSanpinBatch({
				startDate: "2026-08-01",
				endDate: "2026-08-07",
				holidays: ["2026-08-05"], // Wednesday holiday
				seed: 202,
			});

			assert.strictEqual(batch.period.totalCalendarDays, 7);

			const sunday = batch.dailySummaries.find((d) => d.date === "2026-08-02");
			assert.ok(sunday);
			assert.strictEqual(sunday.isWorkingDay, false);
			assert.strictEqual(sunday.totalPatients, 0);
			assert.strictEqual(sunday.autoclaveCyclesCount, 0);

			const holiday = batch.dailySummaries.find((d) => d.date === "2026-08-05");
			assert.ok(holiday);
			assert.strictEqual(holiday.isWorkingDay, false);
			assert.strictEqual(holiday.totalPatients, 0);

			const monday = batch.dailySummaries.find((d) => d.date === "2026-08-03");
			assert.ok(monday);
			assert.strictEqual(monday.isWorkingDay, true);
			assert.ok(monday.totalPatients > 0);
		});

		test("throws error if startDate is later than endDate", () => {
			assert.throws(() => {
				generateRetroactiveSanpinBatch({
					startDate: "2026-08-31",
					endDate: "2026-08-01",
				});
			}, /Некорректный диапазон дат/);
		});
	});

	// ─── 2. ПСО (ФОРМА № 366/у) ────────────────────────────────────────────────
	describe("2. Pre-sterilization Cleaning (PSO / Форма № 366/у)", () => {
		test("generates compliant PSO records with >= 1% sample (min 3-5 pcs) and negative tests", () => {
			const batch = generateRetroactiveSanpinBatch({
				startDate: "2026-08-03", // Mon
				endDate: "2026-08-08", // Sat
				nurseFullName: "Кузнецова О. В.",
				psoDetergentBrand: "Биолот 0.5%",
				seed: 303,
			});

			assert.ok(batch.psoRecords.length > 0);

			for (const pso of batch.psoRecords) {
				// 1% rule validation (min 3 items, min 5 for surgical)
				const isSurgical = pso.categoryId === "surgical_kit";
				const minExpected = isSurgical
					? Math.max(5, Math.ceil(pso.batchItemCount * 0.01))
					: Math.max(3, Math.ceil(pso.batchItemCount * 0.01));

				assert.ok(
					pso.testedSampleCount >= minExpected,
					`Sample ${pso.testedSampleCount} must be >= minExpected ${minExpected} for batch ${pso.batchItemCount}`,
				);

				// Chemical tests must be strictly negative (norm)
				assert.strictEqual(pso.isAzopyramNegative, true, "Azopyram must be negative (no blood)");
				assert.strictEqual(
					pso.isPhenolphthaleinNegative,
					true,
					"Phenolphthalein must be negative (no alkali)",
				);
				assert.strictEqual(pso.isSudanNegative, true, "Sudan III must be negative");
				assert.strictEqual(pso.isBatchApproved, true, "Batch must be approved");
				assert.strictEqual(pso.operatorStaffFullName, "Кузнецова О. В.");
				assert.strictEqual(pso.detergentBrand, "Биолот 0.5%");
				assert.strictEqual(pso.electronicStampVerified, true);
			}
		});
	});

	// ─── 3. АВТОКЛАВЫ (ФОРМА № 257/у) ─────────────────────────────────────────
	describe("3. Autoclave Control (Form 257/u / 134°C B-Class)", () => {
		test("generates 1-3 autoclave cycles per working day matching statutory B-class parameters", () => {
			const batch = generateRetroactiveSanpinBatch({
				startDate: "2026-08-10",
				endDate: "2026-08-15",
				autoclaveCode: "АК-ЦСО-01",
				autoclaveModel: "Melag Vacuklav 23B+",
				seed: 404,
			});

			assert.ok(batch.autoclaveRecords.length > 0);

			for (const cycle of batch.autoclaveRecords) {
				assert.strictEqual(cycle.sterilizerCode, "АК-ЦСО-01");
				assert.strictEqual(cycle.sterilizerBrandModel, "Melag Vacuklav 23B+");
				assert.strictEqual(cycle.regimeId, "steam_134_5min");

				// Physical parameters must strictly meet B-class statutory limits
				assert.ok(
					cycle.actualTemperatureCelsius >= 134.0 && cycle.actualTemperatureCelsius <= 138.0,
					`Temperature ${cycle.actualTemperatureCelsius}°C must be within [134..138]`,
				);
				assert.ok(
					cycle.actualPressureBar >= 2.0 && cycle.actualPressureBar <= 2.3,
					`Pressure ${cycle.actualPressureBar} bar must be within [2.0..2.3]`,
				);
				assert.ok(
					cycle.actualExposureMinutes >= 5.0,
					`Exposure ${cycle.actualExposureMinutes} min must be >= 5.0`,
				);

				// Chemical indicators: all 5 chamber points must pass (Class 5 Integral)
				assert.strictEqual(cycle.areAllPointsPassed, true);
				assert.strictEqual(cycle.chamberPoints.length, 5);
				for (const pt of cycle.chamberPoints) {
					assert.strictEqual(pt.status, "passed");
				}

				assert.strictEqual(cycle.isCyclePassed, true);
				assert.strictEqual(cycle.status, "sterile_passed");
				assert.ok(cycle.digitalStampHash.startsWith("DENTE-CSO-257-"));
				assert.strictEqual(cycle.isHeadNurseVerified, true);
			}
		});

		test("scales autoclave cycles count proportionally with daily patient volume", () => {
			// Low volume (5 patients -> 1 cycle) vs High volume (30 patients -> 3 cycles)
			const batch = generateRetroactiveSanpinBatch({
				startDate: "2026-08-17",
				endDate: "2026-08-18",
				customDailyPatientCounts: {
					"2026-08-17": 6,
					"2026-08-18": 32,
				},
				seed: 505,
			});

			const day1 = batch.dailySummaries.find((d) => d.date === "2026-08-17");
			const day2 = batch.dailySummaries.find((d) => d.date === "2026-08-18");

			assert.strictEqual(day1?.autoclaveCyclesCount, 1);
			assert.strictEqual(day2?.autoclaveCyclesCount, 3);
		});
	});

	// ─── 4. БАКТЕРИЦИДНЫЕ УСТАНОВКИ (ДЕЗАР / Р 3.5.1904-04) ────────────────────
	describe("4. UV Recirculators Fleet (Dezar / Lamp Hours)", () => {
		test("logs 8-10 hours per working day with cumulative tracking without exceeding 8000 hours", () => {
			const batch = generateRetroactiveSanpinBatch({
				startDate: "2026-08-03",
				endDate: "2026-08-22", // 3 weeks
				initialLampHours: 1200,
				maxLampHours: 8000,
				seed: 606,
			});

			assert.ok(batch.bactericidalSessions.length > 0);

			for (const session of batch.bactericidalSessions) {
				assert.ok(
					session.durationHours >= 8.0 && session.durationHours <= 10.0,
					`Duration ${session.durationHours}h must be within 8-10h`,
				);
				assert.strictEqual(session.operatingMode, "continuous_presence");
			}

			// Verify cumulative progression
			for (const eq of batch.bactericidalEquipments) {
				assert.ok(
					eq.totalOperatingHours > 1200,
					`Equipment ${eq.id} total hours ${eq.totalOperatingHours} must exceed initial 1200h`,
				);
				assert.ok(
					eq.totalOperatingHours <= 8000,
					`Equipment ${eq.id} must not exceed 8000h`,
				);
				assert.strictEqual(eq.lampStatus, "normal");
				assert.strictEqual(eq.isLampCritical, false);
			}
		});
	});

	// ─── 5. ГЕНЕРАЛЬНЫЕ УБОРКИ (7-ДНЕВНЫЙ ЦИКЛ) ────────────────────────────────
	describe("5. General Cleanings Schedule (7-Day Cadence)", () => {
		test("schedules general cleanings strictly every 7 days without gaps", () => {
			const batch = generateRetroactiveSanpinBatch({
				startDate: "2026-08-01",
				endDate: "2026-08-31", // Month with 5 Saturdays (1, 8, 15, 22, 29)
				generalCleaningDayOfWeek: 6, // Saturday
				generalCleaningDisinfectant: "Оптимакс 2.0%",
				seed: 707,
			});

			assert.ok(batch.generalCleaningRecords.length > 0);

			// Extract unique cleaning dates
			const cleaningDates = Array.from(
				new Set(batch.generalCleaningRecords.map((r) => r.scheduledDate)),
			).sort();

			assert.strictEqual(cleaningDates.length, 5);
			assert.deepStrictEqual(cleaningDates, [
				"2026-08-01",
				"2026-08-08",
				"2026-08-15",
				"2026-08-22",
				"2026-08-29",
			]);

			// Verify all records are verified and use correct disinfectant
			for (const rec of batch.generalCleaningRecords) {
				assert.strictEqual(rec.disinfectantName, "Оптимакс 2.0%");
				assert.strictEqual(rec.solutionConcentrationPercent, 2.0);
				assert.strictEqual(rec.status, "completed");
				assert.strictEqual(rec.isInspectorVerified, true);
				assert.ok(rec.exposureTimeMinutes >= 60);
			}
		});
	});

	// ─── 6. ТЕМПЕРАТУРНЫЙ РЕЖИМ ХОЛОДИЛЬНИКА (+2..+8°C) ───────────────────────
	describe("6. Refrigerator Temperature Monitoring (+2..+8°C)", () => {
		test("generates morning and evening logs strictly within statutory range +2..+8°C", () => {
			const batch = generateRetroactiveSanpinBatch({
				startDate: "2026-08-01",
				endDate: "2026-08-14", // 14 days = 28 logs
				seed: 808,
			});

			assert.strictEqual(batch.refrigeratorRecords.length, 28);

			for (const log of batch.refrigeratorRecords) {
				assert.strictEqual(log.isWithinNorm, true);
				assert.strictEqual(log.deviationReason, null);

				if (log.measurementPeriod === "morning") {
					assert.ok(
						log.temperatureCelsius >= 3.5 && log.temperatureCelsius <= 4.8,
						`Morning temp ${log.temperatureCelsius}°C must be within [3.5..4.8]`,
					);
				} else {
					assert.ok(
						log.temperatureCelsius >= 4.0 && log.temperatureCelsius <= 5.2,
						`Evening temp ${log.temperatureCelsius}°C must be within [4.0..5.2]`,
					);
				}
			}
		});
	});

	// ─── 7. ЭКСПОРТ СВОДКИ И ВАЛИДАЦИЯ (exportBatchToSanpinSummary) ───────────
	describe("7. Export Summary & Validation Report", () => {
		test("exports valid summary report confirming 100% compliance", () => {
			const batch = generateRetroactiveSanpinBatch({
				startDate: "2026-08-01",
				endDate: "2026-08-31",
				clinicLegalInfo: {
					name: "ООО «ДЕНТЕ ПРЕМИУМ»",
					inn: "7705123456",
					chiefDoctor: "Соколов Д. М.",
					headNurse: "Васильева Т. А.",
				},
				seed: 909,
			});

			const summary = exportBatchToSanpinSummary(batch);

			assert.strictEqual(summary.isValid, true);
			assert.strictEqual(summary.complianceAudit.psoSamplingCompliant, true);
			assert.strictEqual(summary.complianceAudit.psoChemicalTestsNegative, true);
			assert.strictEqual(summary.complianceAudit.autoclaveParametersCompliant, true);
			assert.strictEqual(summary.complianceAudit.autoclave5PointsPassed, true);
			assert.strictEqual(summary.complianceAudit.bactericidalNoOverflow, true);
			assert.strictEqual(summary.complianceAudit.generalCleaningCadenceCompliant, true);
			assert.strictEqual(summary.complianceAudit.refrigeratorTempWithinGost, true);
			assert.strictEqual(summary.complianceAudit.zeroMissingDates, true);

			assert.ok(summary.summaryMarkdown.includes("ООО «ДЕНТЕ ПРЕМИУМ»"));
			assert.ok(summary.summaryMarkdown.includes("7705123456"));
			assert.ok(summary.summaryMarkdown.includes("Соколов Д. М."));
			assert.ok(summary.summaryMarkdown.includes("ПАКЕТ ПОЛНОСТЬЮ ВАЛИДЕН"));
			assert.ok(summary.registryTotals.form366uRecordCount > 0);
			assert.ok(summary.registryTotals.form257uRecordCount > 0);
			assert.ok(summary.registryTotals.dezarSessionCount > 0);
			assert.ok(summary.registryTotals.generalCleaningCount > 0);
			assert.strictEqual(summary.registryTotals.refrigeratorLogCount, 62);
		});
	});
});
