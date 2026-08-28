import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateKraftSterilityExpiration,
	calculatePsoSampleRequirements,
	createDefaultChamberPoints,
	DailyShiftSanpinLogBundle,
	DEFAULT_CLINIC_REQUISITES,
	evaluatePsoTrial,
	exportForm257ToCsv,
	exportKraftPackagesToCsv,
	exportPsoToCsv,
	Form257CycleRecord,
	generateCombinedInspectionDossierHtml,
	generateDailyShiftSanpinLog,
	generateDigitalStampHash,
	generateForm257PrintHtml,
	generateKraftBarcode,
	generateMonthlySanpinJournal,
	generatePso366PrintHtml,
	KraftPackageItem,
	MonthlySanpinJournalBundle,
	parseKraftBarcode,
	PsoTestRecord,
	SANPIN_REGULATORY_META,
	STATUTORY_CHEMICAL_INDICATORS,
	STATUTORY_PACKAGING_TYPES,
	STATUTORY_REGIMES,
	STATUTORY_STERILIZERS,
	STATUTORY_TRAY_SETS,
	validateSterilizationCycle,
} from "../sterilizationSanpinEngine";

describe("SanPiN 3.3686-21 — Sterilization & PSO Quality Control Auto-Generator Engine", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. PSO SAMPLING REQUIREMENTS & MATH
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Statutory PSO Sampling Mathematics (SanPiN 3.3686-21: >=1%, min 3-5 items)", () => {
		it("calculates minimum 3 items for standard small batches (< 300 pcs)", () => {
			const batch10 = calculatePsoSampleRequirements(10, false);
			assert.equal(batch10.minSampleCount, 3);
			assert.equal(batch10.statutoryPercent, 1);

			const batch50 = calculatePsoSampleRequirements(50, false);
			assert.equal(batch50.minSampleCount, 3);

			const batch200 = calculatePsoSampleRequirements(200, false);
			assert.equal(batch200.minSampleCount, 3);
		});

		it("calculates 1% rounded up for large batches (> 300 pcs)", () => {
			const batch350 = calculatePsoSampleRequirements(350, false);
			assert.equal(batch350.minSampleCount, 4); // ceil(3.5) = 4

			const batch500 = calculatePsoSampleRequirements(500, false);
			assert.equal(batch500.minSampleCount, 5); // ceil(5.0) = 5

			const batch1200 = calculatePsoSampleRequirements(1200, false);
			assert.equal(batch1200.minSampleCount, 12); // ceil(12.0) = 12
		});

		it("enforces higher minimum threshold of 5 items for surgical / critical instrument sets", () => {
			const surgicalSmall = calculatePsoSampleRequirements(30, true);
			assert.equal(surgicalSmall.minSampleCount, 5);

			const surgicalLarge = calculatePsoSampleRequirements(800, true);
			assert.equal(surgicalLarge.minSampleCount, 8);
		});

		it("handles zero, negative or invalid inputs gracefully by defaulting to min 1 item", () => {
			const zero = calculatePsoSampleRequirements(0, false);
			assert.equal(zero.minSampleCount, 3);

			const negative = calculatePsoSampleRequirements(-50, false);
			assert.equal(negative.minSampleCount, 3);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. PSO CHEMICAL PROBE EVALUATION (AZOPYRAM, PHENOLPHTHALEIN, SUDAN III)
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. PSO Chemical Probes Evaluation (Form № 366/у)", () => {
		it("approves batch when all probes are negative and sample count meets statutory minimum", () => {
			const res = evaluatePsoTrial({
				batchCount: 200,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: true,
			});
			assert.equal(res.isBatchApproved, true);
			assert.equal(res.isSamplingSufficient, true);
			assert.equal(res.minSampleRequired, 3);
			assert.equal(res.rejectionReason, null);
			assert.match(res.clinicalAdviceRu, /успешно прошла контроль/);
		});

		it("rejects batch if tested count is less than minimum sample required", () => {
			const res = evaluatePsoTrial({
				batchCount: 150,
				testedSampleCount: 2, // required: 3
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
			});
			assert.equal(res.isBatchApproved, false);
			assert.equal(res.isSamplingSufficient, false);
			assert.match(res.rejectionReason ?? "", /Недостаточный объем выборки/);
			assert.match(res.clinicalAdviceRu, /Необходимо отобрать еще минимум 1 шт/);
		});

		it("rejects batch on positive Azopyram trial (occult blood / hemoglobin)", () => {
			const res = evaluatePsoTrial({
				batchCount: 100,
				testedSampleCount: 3,
				isAzopyramNegative: false, // POSITIVE -> BLOOD DETECTED
				isPhenolphthaleinNegative: true,
			});
			assert.equal(res.isBatchApproved, false);
			assert.match(res.rejectionReason ?? "", /Положительная азопирамовая проба/);
			assert.match(res.rejectionReason ?? "", /скрытая кровь/);
			assert.match(res.clinicalAdviceRu, /повторной дезинфекции, предстерилизационной очистке/);
		});

		it("rejects batch on positive Phenolphthalein trial (alkaline detergent residue)", () => {
			const res = evaluatePsoTrial({
				batchCount: 100,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: false, // POSITIVE -> ALKALINE RESIDUE
			});
			assert.equal(res.isBatchApproved, false);
			assert.match(res.rejectionReason ?? "", /Положительная фенолфталеиновая проба/);
			assert.match(res.rejectionReason ?? "", /щелочных компонентов/);
			assert.match(res.clinicalAdviceRu, /повторному тщательному ополаскиванию/);
		});

		it("rejects batch on positive Sudan III trial (oils / lubricants)", () => {
			const res = evaluatePsoTrial({
				batchCount: 80,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: false, // POSITIVE -> OIL RESIDUE
			});
			assert.equal(res.isBatchApproved, false);
			assert.match(res.rejectionReason ?? "", /проба с суданом III/);
			assert.match(res.clinicalAdviceRu, /обезжириванию в ультразвуковой ванне/);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. STERILIZER CYCLE PHYSICAL PARAMETERS VALIDATION (FORM 257/U)
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Sterilization Cycle Parameters & Chemical Indicators (Form № 257/у)", () => {
		it("validates rapid Class B cycle (134°C / 2.15 bar / 5 min) as COMPLIANT", () => {
			const res = validateSterilizationCycle({
				regimeId: "steam_134_5min",
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 2.15,
				actualExposureMinutes: 5.2,
				chamberPoints: createDefaultChamberPoints("Интетест-В-134/5", true),
			});
			assert.equal(res.isValid, true);
			assert.equal(res.isTempCompliant, true);
			assert.equal(res.isPressureCompliant, true);
			assert.equal(res.isTimeCompliant, true);
			assert.equal(res.areIndicatorsCompliant, true);
			assert.equal(res.failureReasons.length, 0);
		});

		it("validates surgical prion Class B cycle (134°C / 2.15 bar / 20 min) as COMPLIANT", () => {
			const res = validateSterilizationCycle({
				regimeId: "steam_134_20min_prion",
				actualTemperatureCelsius: 135.0,
				actualPressureBar: 2.18,
				actualExposureMinutes: 20.5,
			});
			assert.equal(res.isValid, true);
			assert.equal(res.isTempCompliant, true);
		});

		it("validates delicate Class B cycle (121°C / 1.15 bar / 20 min) as COMPLIANT", () => {
			const res = validateSterilizationCycle({
				regimeId: "steam_121_20min",
				actualTemperatureCelsius: 121.5,
				actualPressureBar: 1.15,
				actualExposureMinutes: 20.0,
			});
			assert.equal(res.isValid, true);
		});

		it("validates dry heat air sterilizer (180°C / 0 bar / 60 min) as COMPLIANT", () => {
			const res = validateSterilizationCycle({
				regimeId: "dry_heat_180_60min",
				actualTemperatureCelsius: 181.2,
				actualPressureBar: 0.0,
				actualExposureMinutes: 60.0,
			});
			assert.equal(res.isValid, true);
		});

		it("rejects cycle if temperature drops below statutory minimum (<134°C)", () => {
			const res = validateSterilizationCycle({
				regimeId: "steam_134_5min",
				actualTemperatureCelsius: 132.0,
				actualPressureBar: 2.15,
				actualExposureMinutes: 5.0,
			});
			assert.equal(res.isValid, false);
			assert.equal(res.isTempCompliant, false);
			assert.ok(res.failureReasons.some((r) => r.includes("Температура")));
		});

		it("rejects steam cycle if pressure drops below 2.05 bar", () => {
			const res = validateSterilizationCycle({
				regimeId: "steam_134_5min",
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 1.8,
				actualExposureMinutes: 5.0,
			});
			assert.equal(res.isValid, false);
			assert.equal(res.isPressureCompliant, false);
			assert.ok(res.failureReasons.some((r) => r.includes("Давление пара")));
		});

		it("rejects cycle if exposure time is less than statutory duration", () => {
			const res = validateSterilizationCycle({
				regimeId: "steam_134_5min",
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 2.15,
				actualExposureMinutes: 3.5, // Required: 5.0 min
			});
			assert.equal(res.isValid, false);
			assert.equal(res.isTimeCompliant, false);
			assert.ok(res.failureReasons.some((r) => r.includes("Недостаточная экспозиция")));
		});

		it("rejects cycle if any of the 5 chamber control points failed", () => {
			const points = createDefaultChamberPoints("Интетест-В-134/5", true);
			const basePoint = points[1]!;
			// Point 2 failed (cold spot at bottom back corner)
			points[1] = {
				pointIndex: basePoint.pointIndex,
				code: basePoint.code,
				labelRu: basePoint.labelRu,
				locationRu: basePoint.locationRu,
				indicatorPassed: false,
				indicatorColorObservedRu: "Не изменился (желтый)",
			};

			const res = validateSterilizationCycle({
				regimeId: "steam_134_5min",
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 2.15,
				actualExposureMinutes: 5.0,
				chamberPoints: points,
			});

			assert.equal(res.isValid, false);
			assert.equal(res.areIndicatorsCompliant, false);
			assert.ok(res.failureReasons.some((r) => r.includes("КТ-2")));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. KRAFT PACKAGING & STERILITY EXPIRATION MATH
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Kraft Packaging & Sterility Expiration Math (SanPiN 3.3686-21)", () => {
		it("calculates 50 days shelf life for heat-sealed kraft bags", () => {
			const res = calculateKraftSterilityExpiration(
				"2026-08-28",
				"kraft_heat_sealed",
				"2026-08-28",
			);
			assert.equal(res.daysLifespan, 50);
			assert.equal(res.daysRemaining, 50);
			assert.equal(res.status, "sterile_valid");
			assert.equal(res.isExpired, false);
			assert.equal(res.expDateFormatted, "2026-10-17");
		});

		it("calculates 30 days shelf life for self-adhesive kraft bags", () => {
			const res = calculateKraftSterilityExpiration(
				"2026-08-28",
				"kraft_self_adhesive",
				"2026-08-28",
			);
			assert.equal(res.daysLifespan, 30);
			assert.equal(res.daysRemaining, 30);
			assert.equal(res.expDateFormatted, "2026-09-27");
		});

		it("calculates 180 days shelf life for laminated film/paper pouches", () => {
			const res = calculateKraftSterilityExpiration(
				"2026-08-28",
				"laminated_heat_sealed",
				"2026-08-28",
			);
			assert.equal(res.daysLifespan, 180);
			assert.equal(res.daysRemaining, 180);
			assert.equal(res.expDateFormatted, "2027-02-24");
		});

		it("calculates 20 days shelf life for bix filter boxes", () => {
			const res = calculateKraftSterilityExpiration(
				"2026-08-28",
				"bix_filter_kspf",
				"2026-08-28",
			);
			assert.equal(res.daysLifespan, 20);
			assert.equal(res.daysRemaining, 20);
			assert.equal(res.expDateFormatted, "2026-09-17");
		});

		it("flags package as expiring_soon_7d when remaining days are between 0 and 7", () => {
			const res = calculateKraftSterilityExpiration(
				"2026-08-01",
				"kraft_self_adhesive",
				"2026-08-26",
			);
			assert.equal(res.daysRemaining, 5);
			assert.equal(res.status, "expiring_soon_7d");
			assert.equal(res.isExpiringSoon, true);
			assert.equal(res.isExpired, false);
			assert.match(res.humanReadableRemainingRu, /Осталось 5 дн/);
		});

		it("flags package as expired when current date exceeds expiration date", () => {
			const res = calculateKraftSterilityExpiration(
				"2026-07-01",
				"kraft_self_adhesive",
				"2026-08-15",
			);
			assert.equal(res.status, "expired");
			assert.equal(res.isExpired, true);
			assert.match(res.humanReadableRemainingRu, /Срок истек 15 дн. назад/);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. BARCODE GENERATION & DETERMINISTIC PARSING
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Barcode Generation & Deterministic Parsing", () => {
		it("generates standardized barcode string conforming to format", () => {
			const barcode = generateKraftBarcode({
				batchNumber: "B04",
				serialNumber: 12,
				expDateIsoOrFormatted: "2026-11-15",
				sterilizerCode: "АК-01",
			});
			assert.equal(barcode, "DNT-AK01-B04-S012-20261115");
		});

		it("correctly parses valid barcode back to its original components", () => {
			const parsed = parseKraftBarcode("DNT-AK01-B04-S012-20261115");
			assert.equal(parsed.isValid, true);
			assert.equal(parsed.sterilizerCode, "AK01");
			assert.equal(parsed.batchNumber, "B04");
			assert.equal(parsed.serialNumber, 12);
			assert.equal(parsed.expDateFormatted, "2026-11-15");
		});

		it("returns invalid status for malformed or corrupted barcodes", () => {
			const invalid1 = parseKraftBarcode("INVALID-BARCODE-123");
			assert.equal(invalid1.isValid, false);
			assert.equal(invalid1.batchNumber, null);

			const invalid2 = parseKraftBarcode("");
			assert.equal(invalid2.isValid, false);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. DIGITAL STAMP HASH & PRESET INTEGRITY
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. Digital Stamp Hash & Presets Integrity", () => {
		it("generates deterministic digital signature hash for operator accountability", () => {
			const stamp1 = generateDigitalStampHash({
				date: "2026-08-28",
				cycleNumber: 1,
				operatorFullName: "Смирнова Анна Викторовна",
			});
			const stamp2 = generateDigitalStampHash({
				date: "2026-08-28",
				cycleNumber: 1,
				operatorFullName: "Смирнова Анна Викторовна",
			});
			assert.equal(stamp1, stamp2);
			assert.match(stamp1, /^ЭЦП-ЦСО-[0-9A-F]{8}-20260828$/);
		});

		it("contains statutory sterilizers and regimes catalog", () => {
			assert.ok(STATUTORY_STERILIZERS.length >= 3);
			assert.ok(STATUTORY_STERILIZERS.some((s) => s.deviceClass === "autoclave_class_b"));
			assert.ok(STATUTORY_STERILIZERS.some((s) => s.deviceClass === "dry_heat_air"));

			assert.ok(STATUTORY_REGIMES.length >= 4);
			assert.ok(STATUTORY_REGIMES.some((r) => r.id === "steam_134_5min"));
			assert.ok(STATUTORY_REGIMES.some((r) => r.id === "steam_121_20min"));
			assert.ok(STATUTORY_REGIMES.some((r) => r.id === "dry_heat_180_60min"));
		});

		it("contains statutory tray sets presets (Therapy, Surgery, Handpieces, Orthopedics)", () => {
			assert.ok(STATUTORY_TRAY_SETS.length >= 4);
			assert.ok(STATUTORY_TRAY_SETS.some((t) => t.category === "therapy"));
			assert.ok(STATUTORY_TRAY_SETS.some((t) => t.category === "surgery"));
			assert.ok(STATUTORY_TRAY_SETS.some((t) => t.category === "handpieces"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 7. 1-CLICK DAILY SHIFT AUTO-GENERATOR FOR NURSE
	// ─────────────────────────────────────────────────────────────────────────
	describe("7. 1-Click Daily Shift Auto-Generator for Nurse", () => {
		it("generates complete daily shift log with Form 257/u cycles and Form 366/u PSO series", () => {
			const shift = generateDailyShiftSanpinLog({
				date: "2026-08-28",
				operatorFullName: "Смирнова Анна Викторовна",
				shiftNumber: 1,
			});

			assert.equal(shift.date, "2026-08-28");
			assert.equal(shift.operatorFullName, "Смирнова Анна Викторовна");
			assert.equal(shift.cycles.length, 3);
			assert.equal(shift.psoRecords.length, 3);
			assert.ok(shift.kraftPackages.length >= 10);

			// Check Form 257 cycles
			for (const c of shift.cycles) {
				assert.equal(c.cycleStatus, "passed");
				assert.equal(c.areAllIndicatorsPassed, true);
				assert.ok(c.actualTemperatureCelsius >= 121.0);
				assert.ok(c.electronicSignatureHash.startsWith("ЭЦП-ЦСО-"));
			}

			// Check Form 366 PSO
			for (const p of shift.psoRecords) {
				assert.equal(p.isBatchApproved, true);
				assert.equal(p.isAzopyramNegative, true);
				assert.equal(p.isPhenolphthaleinNegative, true);
				assert.equal(p.isSamplingSufficient, true);
			}

			assert.match(shift.summaryTextRu, /Смена № 1 за 2026-08-28 успешно зафиксирована/);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 8. 1-CLICK MONTHLY AUTO-GENERATOR FOR ROSPOTREBNADZOR INSPECTION
	// ─────────────────────────────────────────────────────────────────────────
	describe("8. 1-Click Monthly Auto-Generator for Rospotrebnadzor Inspection", () => {
		it("generates perfect monthly inspection dossier for August 2026 (Mon-Sat shifts)", () => {
			const bundle = generateMonthlySanpinJournal({
				year: 2026,
				month: 8,
				includeSaturdays: true,
				includeSundays: false,
				dailyPatientLoadLevel: "standard",
			});

			assert.equal(bundle.year, 2026);
			assert.equal(bundle.month, 8);
			assert.equal(bundle.monthFormattedRu, "Август 2026 г.");

			// August 2026 has 31 days, 5 Sundays -> 26 working days (Mon-Sat)
			assert.equal(bundle.workingDaysCount, 26);
			assert.equal(bundle.totalCyclesCount, 26 * 3); // 78 cycles
			assert.equal(bundle.totalPsoTestsCount, 26 * 2); // 52 PSO tests
			assert.ok(bundle.totalPacksCount > 500);

			// Verify all generated cycles are 100% compliant
			for (const c of bundle.cycles) {
				const validation = validateSterilizationCycle({
					regimeId: c.regimeId,
					actualTemperatureCelsius: c.actualTemperatureCelsius,
					actualPressureBar: c.actualPressureBar,
					actualExposureMinutes: c.actualExposureMinutes,
					chamberPoints: c.chamberPoints,
				});
				assert.equal(validation.isValid, true);
				assert.equal(c.cycleStatus, "passed");
			}

			// Verify all generated PSO tests are 100% compliant
			for (const p of bundle.psoRecords) {
				const psoEval = evaluatePsoTrial({
					batchCount: p.batchItemCount,
					testedSampleCount: p.testedSampleCount,
					isAzopyramNegative: p.isAzopyramNegative,
					isPhenolphthaleinNegative: p.isPhenolphthaleinNegative,
					isSudanNegative: p.isSudanNegative,
				});
				assert.equal(psoEval.isBatchApproved, true);
			}

			// Verify pre-rendered CSV and HTML documents exist
			assert.ok(bundle.csv257.includes("Melag Vacuklav 23 B+"));
			assert.ok(bundle.csv366.includes("Азопирамовая проба"));
			assert.ok(bundle.printHtml257.includes("Форма № 257/у"));
			assert.ok(bundle.printHtml366.includes("Форма № 366/у"));
			assert.ok(bundle.combinedDossierHtml.includes("ДОСЬЕ ПРОИЗВОДСТВЕННОГО САНИТАРНОГО КОНТРОЛЯ"));
		});

		it("scales tray and pack quantities based on patient load level", () => {
			const standardBundle = generateMonthlySanpinJournal({
				year: 2026,
				month: 8,
				dailyPatientLoadLevel: "standard",
			});
			const highBundle = generateMonthlySanpinJournal({
				year: 2026,
				month: 8,
				dailyPatientLoadLevel: "high",
			});
			const moderateBundle = generateMonthlySanpinJournal({
				year: 2026,
				month: 8,
				dailyPatientLoadLevel: "moderate",
			});

			assert.ok(highBundle.totalPacksCount > standardBundle.totalPacksCount);
			assert.ok(standardBundle.totalPacksCount > moderateBundle.totalPacksCount);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 9. CSV EXPORT ENGINES (RFC 4180 / UTF-8 BOM)
	// ─────────────────────────────────────────────────────────────────────────
	describe("9. CSV Export Engines (Form 257/u, Form 366/u, Kraft Packages)", () => {
		const sampleCycles: Form257CycleRecord[] = [
			{
				id: "cyc-1",
				date: "2026-08-28",
				time: "09:00",
				cycleNumber: 1,
				sterilizerId: "autoclave-melag-vacuklav-23b",
				sterilizerCode: "АК-01",
				sterilizerBrandModel: "Melag Vacuklav 23 B+",
				regimeId: "steam_134_5min",
				regimeNameRu: "Паровой 134°C / 5 мин",
				itemsDescriptionRu: "Наконечники турбинные, зонды, пинцеты",
				packsCount: 12,
				packagingType: "kraft_heat_sealed",
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 2.15,
				actualExposureMinutes: 5.0,
				indicatorClass: "class5_integrating",
				indicatorTradeNameRu: "Интетест-В-134/5",
				chamberPoints: createDefaultChamberPoints("Интетест-В-134/5", true),
				areAllIndicatorsPassed: true,
				cycleStatus: "passed",
				failureReasons: [],
				operatorFullName: "Смирнова А.В.",
				operatorPosition: "Медсестра ЦСО",
				electronicSignatureHash: "ЭЦП-ЦСО-8F1A3B49-20260828",
				createdAt: "2026-08-28T09:00:00Z",
			},
		];

		const samplePso: PsoTestRecord[] = [
			{
				id: "pso-1",
				date: "2026-08-28",
				time: "08:15",
				instrumentName: "Смотровые лотки",
				batchItemCount: 100,
				testedSampleCount: 3,
				minSampleRequired: 3,
				isSamplingSufficient: true,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: true,
				detergentBrand: "Дезодент",
				isBatchApproved: true,
				rejectionReason: null,
				operatorFullName: "Смирнова А.В.",
				operatorPosition: "Медсестра ЦСО",
				electronicSignatureHash: "ЭЦП-ПСО-9C4D1892-20260828",
				createdAt: "2026-08-28T08:15:00Z",
			},
		];

		const sampleKraft: KraftPackageItem[] = [
			{
				id: "kp-1",
				barcode: "DNT-AK01-B01-S001-20261017",
				batchNumber: "B01",
				packageSerialNumber: 1,
				toolSetNameRu: "Набор смотровой",
				itemsIncluded: ["Зеркало", "Зонд"],
				packagingType: "kraft_heat_sealed",
				packagingNameRu: "Крафт-пакет",
				sterilizerCode: "АК-01",
				cycleNumber: 1,
				packDate: "2026-08-28",
				expDate: "2026-10-17",
				daysLifespan: 50,
				daysRemaining: 50,
				status: "sterile_valid",
				operatorFullName: "Смирнова А.В.",
				indicatorVerified: true,
				createdAt: "2026-08-28T09:05:00Z",
			},
		];

		it("exports Form 257/u to RFC 4180 CSV with UTF-8 BOM", () => {
			const csv = exportForm257ToCsv(sampleCycles);
			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("№ цикла"));
			assert.ok(csv.includes("Melag Vacuklav 23 B+"));
			assert.ok(csv.includes("СТЕРИЛЬНО (Допущен)"));
		});

		it("exports Form 366/u (PSO) to CSV with UTF-8 BOM", () => {
			const csv = exportPsoToCsv(samplePso);
			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("Азопирамовая проба"));
			assert.ok(csv.includes("ПСО ПРОЙДЕНА (Годно)"));
		});

		it("exports Kraft Packages to CSV with UTF-8 BOM", () => {
			const csv = exportKraftPackagesToCsv(sampleKraft);
			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("DNT-AK01-B01-S001-20261017"));
			assert.ok(csv.includes("Стерильно"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 10. OFFICIAL PRINTABLE BLANKS HTML GENERATION
	// ─────────────────────────────────────────────────────────────────────────
	describe("10. Official Printable Blanks HTML Generation", () => {
		const sampleCycles: Form257CycleRecord[] = [
			{
				id: "cyc-1",
				date: "2026-08-28",
				time: "09:00",
				cycleNumber: 1,
				sterilizerId: "autoclave-melag-vacuklav-23b",
				sterilizerCode: "АК-01",
				sterilizerBrandModel: "Melag Vacuklav 23 B+",
				regimeId: "steam_134_5min",
				regimeNameRu: "Паровой 134°C / 5 мин",
				itemsDescriptionRu: "Наконечники турбинные, зонды, пинцеты",
				packsCount: 12,
				packagingType: "kraft_heat_sealed",
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 2.15,
				actualExposureMinutes: 5.0,
				indicatorClass: "class5_integrating",
				indicatorTradeNameRu: "Интетест-В-134/5",
				chamberPoints: createDefaultChamberPoints("Интетест-В-134/5", true),
				areAllIndicatorsPassed: true,
				cycleStatus: "passed",
				failureReasons: [],
				operatorFullName: "Смирнова А.В.",
				operatorPosition: "Медсестра ЦСО",
				electronicSignatureHash: "ЭЦП-ЦСО-8F1A3B49-20260828",
				createdAt: "2026-08-28T09:00:00Z",
			},
		];

		const samplePso: PsoTestRecord[] = [
			{
				id: "pso-1",
				date: "2026-08-28",
				time: "08:15",
				instrumentName: "Смотровые лотки",
				batchItemCount: 100,
				testedSampleCount: 3,
				minSampleRequired: 3,
				isSamplingSufficient: true,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: true,
				detergentBrand: "Дезодент",
				isBatchApproved: true,
				rejectionReason: null,
				operatorFullName: "Смирнова А.В.",
				operatorPosition: "Медсестра ЦСО",
				electronicSignatureHash: "ЭЦП-ПСО-9C4D1892-20260828",
				createdAt: "2026-08-28T08:15:00Z",
			},
		];

		it("generates valid official print HTML for Form 257/u", () => {
			const html = generateForm257PrintHtml(sampleCycles, DEFAULT_CLINIC_REQUISITES);
			assert.ok(html.includes("Форма № 257/у"));
			assert.ok(html.includes("Журнал работы стерилизаторов"));
			assert.ok(html.includes("ООО «ДЕНТЕ КЛИНИК»"));
			assert.ok(html.includes("АК-01"));
			assert.ok(html.includes("134.5°C"));
		});

		it("generates valid official print HTML for Form 366/u (PSO)", () => {
			const html = generatePso366PrintHtml(samplePso, DEFAULT_CLINIC_REQUISITES);
			assert.ok(html.includes("Форма № 366/у"));
			assert.ok(html.includes("предстерилизационной очистки"));
			assert.ok(html.includes("Азопирамовая проба"));
			assert.ok(html.includes("Фенолфталеиновая проба"));
			assert.ok(html.includes("ГОДНО"));
		});

		it("generates valid Combined Inspection Dossier HTML for Rospotrebnadzor", () => {
			const html = generateCombinedInspectionDossierHtml({
				monthFormattedRu: "Август 2026 г.",
				cycles: sampleCycles,
				psoRecords: samplePso,
				clinicInfo: DEFAULT_CLINIC_REQUISITES,
			});
			assert.ok(html.includes("ДОСЬЕ ПРОИЗВОДСТВЕННОГО САНИТАРНОГО КОНТРОЛЯ"));
			assert.ok(html.includes("Август 2026 г."));
			assert.ok(html.includes("Форма № 257/у"));
			assert.ok(html.includes("Форма № 366/у"));
			assert.ok(html.includes("Главный врач"));
		});
	});
});
