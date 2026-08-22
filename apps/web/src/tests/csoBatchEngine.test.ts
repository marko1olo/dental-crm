import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	auditBactericidalFleetHealth,
	calculateAirDecontaminationDuration,
	calculateBactericidalLampLife,
	calculatePackagingShelfLife,
	calculateStatutorySampleSize,
	CsoBatchComplianceEngine,
	evaluateAzopyramControlTrial,
	exportBactericidalLogToCsv,
	exportForm257uToCsv,
	exportForm366uToCsv,
	formatSanpinDataMatrixPayload,
	generate1DBarcodeValue,
	generateBactericidalLogPrintHtml,
	generateForm257uPrintHtml,
	generateForm366uPrintHtml,
	generateThermalLabel58x40Html,
	generateVectorCode128Svg,
	generateVectorDataMatrixSvg,
	recordBactericidalSession,
	SanPiNSterilizationEngine,
	validateChamber5PointSterilization,
	type Chamber5PointMeasurement,
	type Form257AutoclaveJournalRow,
	type Form366PsoJournalRow,
	type BactericidalSessionTrackerRow,
} from "../components/sanpin/csoEngine/csoBatchEngine.js";
import {
	APPROVED_CSO_DETERGENTS,
	AUTOCLAVE_PROGRAMS,
	CHAMBER_5_POINTS,
	CHEMICAL_PSO_REAGENTS,
	CSO_LIFECYCLE_STAGES,
	CSO_PACKAGING_MATERIALS,
	CSO_TOOLSET_PRESETS,
	RECIRCULATOR_FLEET_CATALOG,
} from "../components/sanpin/csoEngine/csoBatchPresets.js";

describe("SanPiN 3.3686-21 CSO Sterilization Digital Log & Batch Compliance Engine", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. STATUTORY PRESETS & REGISTERS INTEGRITY
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Statutory Presets & Classifiers Integrity", () => {
		it("verifies the 5 stages of CSO traceability lifecycle", () => {
			assert.equal(CSO_LIFECYCLE_STAGES.length, 5);
			assert.deepEqual(
				CSO_LIFECYCLE_STAGES.map((s) => s.id),
				[
					"wash_disinfection",
					"azopyram_control",
					"kraft_packing",
					"autoclave_sterilization",
					"storage_release",
				],
			);
		});

		it("verifies chemical testing reagents (Azopyram, Phenolphthalein, Sudan III, Complex)", () => {
			assert.equal(CHEMICAL_PSO_REAGENTS.length, 4);

			const azopyram = CHEMICAL_PSO_REAGENTS.find((r) => r.id === "azopyram");
			assert.ok(azopyram);
			assert.ok(azopyram?.targetContaminantRu.includes("Гемоглобин"));
			assert.ok(azopyram?.reagentFormulationRu.includes("3% перекисью водорода"));
			assert.ok(azopyram?.positiveReactionVisualRu.includes("сине-фиолетовое"));
			assert.equal(azopyram?.maxReactionWaitSeconds, 60);

			const phenol = CHEMICAL_PSO_REAGENTS.find((r) => r.id === "phenolphthalein");
			assert.ok(phenol);
			assert.ok(phenol?.targetContaminantRu.includes("щелочных"));
			assert.ok(phenol?.positiveReactionVisualRu.includes("Розовое"));
			assert.equal(phenol?.maxReactionWaitSeconds, 30);

			const sudan = CHEMICAL_PSO_REAGENTS.find((r) => r.id === "sudan_iii");
			assert.ok(sudan);
			assert.ok(sudan?.targetContaminantRu.includes("масел"));
		});

		it("verifies approved detergents catalog parameters", () => {
			assert.ok(APPROVED_CSO_DETERGENTS.length >= 6);
			const biolot = APPROVED_CSO_DETERGENTS.find((d) => d.id === "biolot");
			assert.ok(biolot);
			assert.equal(biolot?.recommendedConcentrationPercent, 0.5);
			assert.equal(biolot?.isEnzymeDigestive, true);
			assert.equal(biolot?.requiresPhenolphthaleinCheck, true);
		});

		it("verifies packaging materials statutory shelf life (SanPiN 3.3686-21)", () => {
			assert.ok(CSO_PACKAGING_MATERIALS.length >= 8);

			const kraftClips = CSO_PACKAGING_MATERIALS.find((m) => m.id === "kraft_paper_clips");
			assert.equal(kraftClips?.statutoryShelfLifeDays, 3);

			const selfAdhesive = CSO_PACKAGING_MATERIALS.find((m) => m.id === "kraft_self_adhesive");
			assert.equal(selfAdhesive?.statutoryShelfLifeDays, 30);

			const laminatedFlat = CSO_PACKAGING_MATERIALS.find((m) => m.id === "laminated_flat_heat_sealed");
			assert.equal(laminatedFlat?.statutoryShelfLifeDays, 180);

			const doubleLaminated = CSO_PACKAGING_MATERIALS.find((m) => m.id === "double_laminated_heat_sealed");
			assert.equal(doubleLaminated?.statutoryShelfLifeDays, 365);

			const bixFilter = CSO_PACKAGING_MATERIALS.find((m) => m.id === "metal_bix_filter");
			assert.equal(bixFilter?.statutoryShelfLifeDays, 20);

			const unpacked = CSO_PACKAGING_MATERIALS.find((m) => m.id === "unpacked_tray");
			assert.equal(unpacked?.statutoryShelfLifeDays, 0);
		});

		it("verifies autoclave 5 measurement points and programs", () => {
			assert.equal(CHAMBER_5_POINTS.length, 5);
			const drainPoint = CHAMBER_5_POINTS.find((p) => p.id === "bottom_right_drain");
			assert.ok(drainPoint);
			assert.equal(drainPoint?.isCriticalColdestZone, true);

			assert.ok(AUTOCLAVE_PROGRAMS.length >= 5);
			const steam134 = AUTOCLAVE_PROGRAMS.find((p) => p.id === "steam_134_universal");
			assert.ok(steam134);
			assert.equal(steam134?.nominalTemperatureCelsius, 134.0);
			assert.equal(steam134?.nominalPressureBar, 2.15);
			assert.equal(steam134?.plateauExposureMinutes, 5);
			assert.equal(steam134?.maxPointDeltaCelsius, 2.0);
		});

		it("verifies bactericidal recirculators fleet catalog", () => {
			assert.ok(RECIRCULATOR_FLEET_CATALOG.length >= 5);
			const dezar4 = RECIRCULATOR_FLEET_CATALOG.find((r) => r.id === "dezar_4");
			assert.ok(dezar4);
			assert.equal(dezar4?.nominalLifespanHours, 8000);
			assert.equal(dezar4?.airOutputM3PerHour, 100);
			assert.equal(dezar4?.operatesInPeoplePresence, true);
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. AZOPYRAM & CHEMICAL SAMPLING MATHEMATICS (1% RULE)
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Azopyram & PSO Sampling Mathematics", () => {
		it("calculates 1% sample size with minimum 3 for standard and 5 for surgical", () => {
			// 1. Стандартная терапевтическая партия 50 шт -> 1% = 0.5 -> max(3, 1) = 3
			const s1 = calculateStatutorySampleSize(50, false);
			assert.equal(s1.minSampleCount, 3);

			// 2. Партия 200 шт -> 1% = 2 -> max(3, 2) = 3
			const s2 = calculateStatutorySampleSize(200, false);
			assert.equal(s2.minSampleCount, 3);

			// 3. Партия 500 шт -> 1% = 5 -> max(3, 5) = 5
			const s3 = calculateStatutorySampleSize(500, false);
			assert.equal(s3.minSampleCount, 5);

			// 4. Большая партия 850 шт -> 1% = 8.5 -> ceil = 9 -> max(3, 9) = 9
			const s4 = calculateStatutorySampleSize(850, false);
			assert.equal(s4.minSampleCount, 9);

			// 5. Хирургическая критическая партия 40 шт -> абсолютный минимум 5
			const sSurg = calculateStatutorySampleSize(40, true);
			assert.equal(sSurg.minSampleCount, 5);
		});

		it("approves batch when sampling is satisfied and all reagents are negative", () => {
			const res = evaluateAzopyramControlTrial({
				batchCount: 120,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: true,
			});

			assert.equal(res.isBatchApproved, true);
			assert.equal(res.samplingSatisfied, true);
			assert.equal(res.rejectionReason, null);
			assert.ok(res.complianceStatusTextRu.includes("допущена к упаковке"));
		});

		it("rejects batch when tested samples count is below 1% statutory requirement", () => {
			// Партия 700 шт требует ceil(700 * 0.01) = 7 образцов, но проверено 3
			const res = evaluateAzopyramControlTrial({
				batchCount: 700,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
			});

			assert.equal(res.isBatchApproved, false);
			assert.equal(res.samplingSatisfied, false);
			assert.equal(res.minSampleRequired, 7);
			assert.ok(res.rejectionReason?.includes("Недостаточный объем выборки"));
		});

		it("rejects batch with 100% reprocessing mandate when Azopyram trial is positive (blood detected)", () => {
			const res = evaluateAzopyramControlTrial({
				batchCount: 100,
				testedSampleCount: 3,
				isAzopyramNegative: false, // ПОЛОЖИТЕЛЬНАЯ (КРОВЬ)
				isPhenolphthaleinNegative: true,
			});

			assert.equal(res.isBatchApproved, false);
			assert.ok(res.rejectionReason?.includes("Положительная азопирамовая проба"));
			assert.ok(res.rejectionReason?.includes("скрытая кровь"));
			assert.ok(res.correctiveActionRu?.includes("повторный цикл дезинфекции и ПСО"));
		});

		it("rejects batch when Phenolphthalein trial is positive (alkaline residue)", () => {
			const res = evaluateAzopyramControlTrial({
				batchCount: 100,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: false, // ПОЛОЖИТЕЛЬНАЯ (ЩЕЛОЧЬ)
			});

			assert.equal(res.isBatchApproved, false);
			assert.ok(res.rejectionReason?.includes("Положительная фенолфталеиновая проба"));
			assert.ok(res.correctiveActionRu?.includes("дистиллированной водой"));
		});

		it("rejects batch when Sudan III trial is positive (oil / lipid residue on handpieces)", () => {
			const res = evaluateAzopyramControlTrial({
				batchCount: 20,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: false, // ПОЛОЖИТЕЛЬНАЯ (МАСЛО)
			});

			assert.equal(res.isBatchApproved, false);
			assert.ok(res.rejectionReason?.includes("Суданом III"));
			assert.ok(res.correctiveActionRu?.includes("обезжиривание"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. AUTOCLAVE CHAMBER 5-POINT THERMAL VALIDATION (GOST ISO 17665-1)
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Autoclave 5-Point Thermal & Pressure Validation", () => {
		it("validates steam 134°C B-class cycle with compliant 5-point measurement", () => {
			const validTemps: Chamber5PointMeasurement = {
				center: 134.5,
				topLeft: 134.8,
				topRight: 134.6,
				bottomLeft: 134.3,
				bottomRightDrain: 134.1, // Самая холодная точка
			};

			const res = validateChamber5PointSterilization({
				programId: "steam_134_universal",
				measuredTemps: validTemps,
				measuredPressureBar: 2.18,
				measuredPlateauMin: 5,
				isIndicatorPassed: true,
			});

			assert.equal(res.isApproved, true);
			assert.equal(res.deltaPassed, true);
			assert.equal(res.tempRangePassed, true);
			assert.equal(res.pressurePassed, true);
			assert.equal(res.plateauTimePassed, true);
			assert.equal(res.maxPointDeltaCelsius, 0.7); // 134.8 - 134.1 = 0.7 <= 2.0
			assert.equal(res.coldestPoint, "bottom_right_drain");
			assert.equal(res.hottestPoint, "top_left");
			assert.equal(res.violations.length, 0);
		});

		it("rejects cycle when coldest point drops below statutory minimum (132.5°C < 134.0°C)", () => {
			const underheatedTemps: Chamber5PointMeasurement = {
				center: 134.5,
				topLeft: 134.7,
				topRight: 134.6,
				bottomLeft: 134.2,
				bottomRightDrain: 132.5, // НЕДОГРЕВ В СЛИВЕ
			};

			const res = validateChamber5PointSterilization({
				programId: "steam_134_universal",
				measuredTemps: underheatedTemps,
				measuredPressureBar: 2.15,
				measuredPlateauMin: 5,
				isIndicatorPassed: true,
			});

			assert.equal(res.isApproved, false);
			assert.equal(res.tempRangePassed, false);
			assert.ok(res.violations.some((v) => v.includes("bottom_right_drain")));
		});

		it("rejects cycle when Delta T between points exceeds 2.0°C tolerance", () => {
			const highDeltaTemps: Chamber5PointMeasurement = {
				center: 136.0,
				topLeft: 135.5,
				topRight: 135.2,
				bottomLeft: 134.5,
				bottomRightDrain: 133.5, // 136.0 - 133.5 = 2.5°C (> 2.0°C)
			};

			const res = validateChamber5PointSterilization({
				programId: "steam_134_universal",
				measuredTemps: highDeltaTemps,
				measuredPressureBar: 2.15,
				measuredPlateauMin: 5,
				isIndicatorPassed: true,
			});

			assert.equal(res.isApproved, false);
			assert.equal(res.deltaPassed, false);
			assert.equal(res.maxPointDeltaCelsius, 2.5);
			assert.ok(res.violations.some((v) => v.includes("ΔT=2.5°C")));
		});

		it("rejects cycle when steam pressure is insufficient (< 2.05 bar)", () => {
			const validTemps: Chamber5PointMeasurement = {
				center: 134.5,
				topLeft: 134.5,
				topRight: 134.5,
				bottomLeft: 134.5,
				bottomRightDrain: 134.5,
			};

			const res = validateChamber5PointSterilization({
				programId: "steam_134_universal",
				measuredTemps: validTemps,
				measuredPressureBar: 1.85, // НЕДОСТАТОЧНОЕ ДАВЛЕНИЕ
				measuredPlateauMin: 5,
				isIndicatorPassed: true,
			});

			assert.equal(res.isApproved, false);
			assert.equal(res.pressurePassed, false);
			assert.ok(res.violations.some((v) => v.includes("Давление пара 1.85 бар вне допуска")));
		});

		it("rejects cycle when chemical indicator failed to change color", () => {
			const validTemps: Chamber5PointMeasurement = {
				center: 134.5,
				topLeft: 134.5,
				topRight: 134.5,
				bottomLeft: 134.5,
				bottomRightDrain: 134.5,
			};

			const res = validateChamber5PointSterilization({
				programId: "steam_134_universal",
				measuredTemps: validTemps,
				measuredPressureBar: 2.15,
				measuredPlateauMin: 5,
				isIndicatorPassed: false, // ИНДИКАТОР НЕ СРАБОТАЛ
			});

			assert.equal(res.isApproved, false);
			assert.ok(res.violations.some((v) => v.includes("Химический индикатор")));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. PACKAGING SHELF-LIFE & BARCODE ENGINES
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Packaging Shelf-Life & Barcode Engine", () => {
		it("calculates exact statutory shelf life across packaging types", () => {
			const sDate = "2026-08-01T10:00:00Z";
			const refDate = "2026-08-10T10:00:00Z";

			// 1. Крафт самоклеящийся (30 суток) -> годен до 2026-08-31
			const kraft = calculatePackagingShelfLife("kraft_self_adhesive", sDate, refDate);
			assert.equal(kraft.daysLifespan, 30);
			assert.equal(kraft.expirationDateFormatted, "2026-08-31");
			assert.equal(kraft.daysRemaining, 21);
			assert.equal(kraft.status, "sterile_valid");

			// 2. Комбинированный плоский пакет (180 суток / 6 мес)
			const combi = calculatePackagingShelfLife("laminated_flat_heat_sealed", sDate, refDate);
			assert.equal(combi.daysLifespan, 180);
			assert.equal(combi.daysRemaining, 171);

			// 3. Просроченный пакет (3 суток) со скрепками при проверке через 9 дней
			const clips = calculatePackagingShelfLife("kraft_paper_clips", sDate, refDate);
			assert.equal(clips.daysLifespan, 3);
			assert.equal(clips.status, "expired");
			assert.ok(clips.humanReadableRemainingRu.includes("Срок истек"));
		});

		it("formats structured DataMatrix payload per SanPiN standard", () => {
			const payload = formatSanpinDataMatrixPayload({
				batchNumber: "CSO-20260822-101",
				autoclaveId: "MELAG-01",
				cycleNumber: 42,
				sterilizationDateIso: "2026-08-22T08:00:00Z",
				expirationDateIso: "2026-11-20T08:00:00Z",
				operatorName: "Иванова М.П.",
				toolSetCode: "SURG-EXT",
				serialIndex: 5,
			});

			assert.ok(payload.startsWith("SANPIN|"));
			assert.ok(payload.includes("CSO-20260822-101"));
			assert.ok(payload.includes("MELAG-01"));
			assert.ok(payload.includes("CYC42"));
			assert.ok(payload.includes("2026-08-22"));
			assert.ok(payload.includes("2026-11-20"));
			assert.ok(payload.includes("#5"));
		});

		it("generates deterministic 1D Code128 string and vector SVG", () => {
			const val = generate1DBarcodeValue("CSO-20260822-101", 3);
			assert.equal(val, "CSO8221010003");

			const svg = generateVectorCode128Svg(val, { height: 38 });
			assert.ok(svg.startsWith("<svg"));
			assert.ok(svg.includes("<rect"));
			assert.ok(svg.includes(val));
		});

		it("generates valid vector DataMatrix 2D SVG with L-finder pattern", () => {
			const payload = "SANPIN|CSO-01|MELAG|CYC1|20260822|20261120|NURSE|SET|#1";
			const svg = generateVectorDataMatrixSvg(payload, { size: 80 });
			assert.ok(svg.startsWith("<svg"));
			assert.ok(svg.includes("<rect"));
			assert.ok(svg.includes('viewBox="0 0 80 80"'));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. BACTERICIDAL UV RECIRCULATOR TRACKER (R 3.5.1904-04)
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Bactericidal Lamp Operating Hours & Fleet Engine", () => {
		it("tracks operating hours accumulation and audits lifespan", () => {
			// Наработка 1500 ч + сеанс 180 мин (3.0 ч) -> 1503.0 ч (норма)
			const res1 = recordBactericidalSession({
				currentTotalOperatingHours: 1500,
				sessionDurationMinutes: 180,
				maxLampHours: 8000,
			});
			assert.equal(res1.sessionHours, 3.0);
			assert.equal(res1.newTotalHours, 1503.0);
			assert.equal(res1.audit.status, "normal");
			assert.equal(res1.audit.isCriticalExpired, false);

			// Наработка 7250 ч из 8000 ч (>90%) -> предупреждение
			const resWarn = calculateBactericidalLampLife(7250, 8000);
			assert.equal(resWarn.status, "warning_replace_soon");
			assert.equal(resWarn.isCriticalExpired, false);
			assert.ok(resWarn.warningMessageRu?.includes("Запланируйте закупку"));

			// Наработка 8020 ч из 8000 ч (100%+) -> критический запрет эксплуатации
			const resExp = calculateBactericidalLampLife(8020, 8000);
			assert.equal(resExp.status, "expired_replace_now");
			assert.equal(resExp.isCriticalExpired, true);
			assert.ok(resExp.warningMessageRu?.includes("РЕСУРС ЛАМП ИСЧЕРПАН"));
			assert.ok(resExp.warningMessageRu?.includes("категорически запрещена"));
		});

		it("calculates air decontamination duration according to R 3.5.1904-04", () => {
			// Помещение 50 м³, Дезар-4 производительностью 100 м³/ч, II категория (K = 4.6)
			// T = (4.6 * 50 / 100) * 60 = 138 мин -> округление до 150 мин (15-мин шаг)
			const calc = calculateAirDecontaminationDuration(50, 100, 99);
			assert.equal(calc.airExchangeFactorK, 4.6);
			assert.equal(calc.requiredMinutes, 138);
			assert.equal(calc.recommendedMinutes, 150);
		});

		it("audits clinic-wide bactericidal fleet health", () => {
			const fleet = [
				{ id: "1", brandNameRu: "Дезар-4", roomNameRu: "Терапия 1", totalHours: 1200, maxHours: 8000 },
				{ id: "2", brandNameRu: "Дезар-7", roomNameRu: "Хирургия", totalHours: 7300, maxHours: 8000 },
				{ id: "3", brandNameRu: "ОБН-150", roomNameRu: "Отходы", totalHours: 8100, maxHours: 8000 },
			];

			const audit = auditBactericidalFleetHealth(fleet);
			assert.equal(audit.totalCount, 3);
			assert.equal(audit.normalCount, 1);
			assert.equal(audit.warningCount, 1);
			assert.equal(audit.expiredCount, 1);
			assert.equal(audit.overallStatus, "critical_violation");
			assert.ok(audit.summaryNoteRu.includes("КРИТИЧЕСКОЕ НАРУШЕНИЕ"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 6. OFFICIAL STATUTORY PRINT DOCUMENTS & CSV EXPORTS
	// ─────────────────────────────────────────────────────────────────────────
	describe("6. Official Statutory Print Documents & CSV Exports", () => {
		const samplePsoRows: Form366PsoJournalRow[] = [
			{
				id: "pso-1",
				timestamp: "2026-08-22T08:30:00Z",
				instrumentName: "Терапевтический смотровой набор",
				batchItemCount: 100,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				detergentBrand: "Биолот 0.5%",
				isBatchApproved: true,
				operatorStaffFullName: "Иванова М.П.",
				electronicStampVerified: true,
			},
		];

		const sampleAutoclaveRows: Form257AutoclaveJournalRow[] = [
			{
				id: "f257-1",
				date: "2026-08-22",
				cycleNumber: 42,
				deviceName: "Melag Vacuklav 41B+",
				programNameRu: "Универсальный B-класс 134°C",
				temperatureCelsius: 134.5,
				pressureBar: 2.18,
				durationMinutes: 5,
				loadDescriptionRu: "Хирургические и терапевтические наборы",
				packsCount: 15,
				packagingTypeRu: "Комби-пакет термосварной",
				indicatorTypeRu: "Класс 5 (Интегратор)",
				isIndicatorPassed: true,
				isBatchApproved: true,
				operatorName: "Иванова М.П.",
				signatureStamp: "ЭЦП-OK",
			},
		];

		const sampleBactericidalSessions: BactericidalSessionTrackerRow[] = [
			{
				id: "sess-1",
				equipmentId: "eq-1",
				roomName: "Кабинет хирургии",
				deviceBrand: "Дезар-4",
				date: "2026-08-22",
				sessionStartTime: "08:00",
				sessionEndTime: "10:30",
				durationMinutes: 150,
				durationHours: 2.5,
				operatingModeRu: "Предоперационный",
				cumulativeHoursAfterSession: 1452.5,
				operatorStaffFullName: "Иванова М.П.",
			},
		];

		it("generates official Form 366/u HTML document with statutory headers", () => {
			const html = generateForm366uPrintHtml({ records: samplePsoRows });
			assert.ok(html.includes("ФОРМА № 366/у"));
			assert.ok(html.includes("СанПиН 3.3686-21"));
			assert.ok(html.includes("Терапевтический смотровой набор"));
			assert.ok(html.includes("Отрицат."));
			assert.ok(html.includes("Допущено"));
		});

		it("generates official Form 257/u Sterilizer Journal HTML", () => {
			const html = generateForm257uPrintHtml({ records: sampleAutoclaveRows });
			assert.ok(html.includes("ФОРМА № 257/у"));
			assert.ok(html.includes("Melag Vacuklav"));
			assert.ok(html.includes("134.5°C"));
		});

		it("generates Bactericidal Irradiator Journal HTML", () => {
			const html = generateBactericidalLogPrintHtml({
				equipment: {
					roomNameRu: "Кабинет хирургии",
					roomVolumeM3: 45,
					deviceBrandRu: "Дезар-4",
					serialNumber: "DZ-101",
					lampTypeRu: "TUV 15W",
					lampCount: 3,
					maxLampHours: 8000,
					totalOperatingHours: 1452.5,
				},
				sessions: sampleBactericidalSessions,
			});
			assert.ok(html.includes("ЖУРНАЛ РЕГИСТРАЦИИ И КОНТРОЛЯ РАБОТЫ БАКТЕРИЦИДНОЙ УСТАНОВКИ"));
			assert.ok(html.includes("Дезар-4"));
			assert.ok(html.includes("1452.5 ч"));
		});

		it("generates thermal sticker 58x40 mm HTML with DataMatrix SVG", () => {
			const samplePack = {
				id: "pack-1",
				barcode128: "CSO8221010001",
				dataMatrixPayload: "SANPIN|CSO-01|MELAG|CYC42|2026-08-22|2026-11-20|NURSE|SURG|#1",
				batchId: "b-1",
				batchNumber: "CSO-20260822-101",
				serialIndex: 1,
				toolSetNameRu: "Хирургический набор для удаления",
				itemsListRu: ["Щипцы", "Элеватор"],
				materialId: "laminated_flat_heat_sealed" as const,
				materialNameRu: "Комби-пакет термосварной",
				sterilizationDateIso: "2026-08-22T08:00:00Z",
				expirationDateIso: "2026-11-20T08:00:00Z",
				daysLifespan: 180,
				daysRemaining: 180,
				status: "sterile_valid" as const,
				autoclaveId: "MELAG-01",
				cycleNumber: 42,
				operatorName: "Иванова М.П.",
				isBreached: false,
			};

			const stickerHtml = generateThermalLabel58x40Html(samplePack);
			assert.ok(stickerHtml.includes("58mm"));
			assert.ok(stickerHtml.includes("СТЕРИЛЬНО • СанПиН"));
			assert.ok(stickerHtml.includes("CSO8221010001"));
			assert.ok(stickerHtml.includes("MELAG-01 / ЦИКЛ #42"));
		});

		it("exports Form 366/u, Form 257/u and Bactericidal log to RFC 4180 CSV with UTF-8 BOM", () => {
			const psoCsv = exportForm366uToCsv(samplePsoRows);
			assert.ok(psoCsv.startsWith("\uFEFF"), "Must start with UTF-8 BOM");
			assert.ok(psoCsv.includes("Терапевтический смотровой набор"));
			assert.ok(psoCsv.includes("Биолот 0.5%"));

			const autoCsv = exportForm257uToCsv(sampleAutoclaveRows);
			assert.ok(autoCsv.startsWith("\uFEFF"));
			assert.ok(autoCsv.includes("Melag Vacuklav"));

			const bacCsv = exportBactericidalLogToCsv(sampleBactericidalSessions);
			assert.ok(bacCsv.startsWith("\uFEFF"));
			assert.ok(bacCsv.includes("Кабинет хирургии"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 7. END-TO-END CSO LIFECYCLE STATE MACHINE
	// ─────────────────────────────────────────────────────────────────────────
	describe("7. End-to-End CSO Lifecycle State Machine", () => {
		it("executes complete 5-stage lifecycle from wash to sterile release", () => {
			// Stage 0: Создание партии (Хирургический набор, 40 шт)
			const batch0 = CsoBatchComplianceEngine.createBatch({
				toolSetId: "surgical_extraction_set",
				totalItemsCount: 40,
				operatorName: "Иванова М.П.",
			});
			assert.equal(batch0.stage, "wash_disinfection");
			assert.equal(batch0.status, "in_progress_wash");
			assert.equal(batch0.isSurgicalCritical, true);

			// Stage 1: Мойка и дезинфекция (Биолот 0.5%, 15 мин, 40°C)
			const batch1 = CsoBatchComplianceEngine.completeWashAndAdvanceToPso(batch0, {
				detergentId: "biolot",
				concentrationPercent: 0.5,
				exposureMinutes: 15,
				solutionTempCelsius: 40,
				ultrasonicUsed: true,
				operatorName: "Иванова М.П.",
			});
			assert.equal(batch1.stage, "azopyram_control");
			assert.equal(batch1.status, "in_progress_azopyram");
			assert.ok(batch1.washDetails);
			assert.equal(batch1.washDetails?.detergentBrandRu, "Биолот (порошок)");

			// Stage 2: Контроль ПСО (Хирургия требует 5 проб, все отрицательные)
			const batch2 = CsoBatchComplianceEngine.evaluateAndSignOffAzopyramControl(batch1, {
				testedSamplesCount: 5,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
				isSudanNegative: true,
				operatorName: "Иванова М.П.",
			});
			assert.equal(batch2.stage, "kraft_packing");
			assert.equal(batch2.status, "in_progress_packing");
			assert.equal(batch2.azopyramControl?.isPassed, true);

			// Stage 3: Упаковка в термосварные комби-пакеты (5 упаковок)
			const { batch: batch3, packs: packs3 } =
				CsoBatchComplianceEngine.completePackingAndAdvanceToAutoclave(batch2, {
					materialId: "laminated_flat_heat_sealed",
					packCount: 5,
					chemicalIndicatorClass: "Класс 5 (Интегратор)",
					operatorName: "Иванова М.П.",
				});
			assert.equal(batch3.stage, "autoclave_sterilization");
			assert.equal(batch3.status, "in_progress_autoclave");
			assert.equal(packs3.length, 5);
			assert.equal(packs3[0]?.daysLifespan, 180);

			// Stage 4: Автоклавирование с 5-точечной валидацией камеры
			const measuredTemps: Chamber5PointMeasurement = {
				center: 134.6,
				topLeft: 134.8,
				topRight: 134.7,
				bottomLeft: 134.4,
				bottomRightDrain: 134.2,
			};

			const { batch: batch4, packs: packs4, validation } =
				CsoBatchComplianceEngine.validateAutoclaveAndReleaseBatch(batch3, packs3, {
					autoclaveId: "MELAG-41B",
					deviceName: "Melag Vacuklav 41B+",
					cycleNumber: 108,
					programId: "steam_134_universal",
					measuredTemps,
					measuredPressureBar: 2.18,
					measuredPlateauMin: 5,
					isIndicatorPassed: true,
					operatorName: "Иванова М.П.",
				});

			assert.equal(validation.isApproved, true);
			assert.equal(batch4.stage, "storage_release");
			assert.equal(batch4.status, "completed_sterile");
			assert.equal(batch4.autoclaveDetails?.isCycleApproved, true);
			assert.equal(packs4[0]?.autoclaveId, "MELAG-41B");
			assert.equal(packs4[0]?.cycleNumber, 108);
			assert.ok(packs4[0]?.dataMatrixPayload.includes("MELAG-41B"));
		});

		it("quarantines batch when PSO chemical test fails", () => {
			const batch0 = CsoBatchComplianceEngine.createBatch({
				toolSetId: "therapeutic_exam_set",
				totalItemsCount: 100,
				operatorName: "Иванова М.П.",
			});

			const batch1 = CsoBatchComplianceEngine.completeWashAndAdvanceToPso(batch0, {
				detergentId: "biolot",
				concentrationPercent: 0.5,
				exposureMinutes: 15,
				solutionTempCelsius: 40,
				ultrasonicUsed: true,
				operatorName: "Иванова М.П.",
			});

			// Положительный азопирам (кровь)
			const batchRejected = CsoBatchComplianceEngine.evaluateAndSignOffAzopyramControl(batch1, {
				testedSamplesCount: 3,
				isAzopyramNegative: false,
				isPhenolphthaleinNegative: true,
				operatorName: "Иванова М.П.",
			});

			assert.equal(batchRejected.status, "quarantined_rejected");
			assert.equal(batchRejected.azopyramControl?.isPassed, false);
			assert.ok(batchRejected.azopyramControl?.rejectionReason?.includes("азопирамовая проба"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 8. SANPIN STERILIZATION ENGINE COMPATIBILITY BRIDGE
	// ─────────────────────────────────────────────────────────────────────────
	describe("8. SanPiNSterilizationEngine Compatibility Bridge", () => {
		it("computes minimum sample size for PSO cleaning", () => {
			assert.equal(SanPiNSterilizationEngine.computeMinimumPsoSampleSize(50), 3);
			assert.equal(SanPiNSterilizationEngine.computeMinimumPsoSampleSize(200), 3);
			assert.equal(SanPiNSterilizationEngine.computeMinimumPsoSampleSize(450), 5);
			assert.equal(SanPiNSterilizationEngine.computeMinimumPsoSampleSize(1000), 10);
		});

		it("evaluates PSO batch compliance", () => {
			const valid = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(200, 5, true, true);
			assert.equal(valid.isBatchApproved, true);

			const invalidAzopyram = SanPiNSterilizationEngine.evaluatePsoCleaningBatch(200, 5, false, true);
			assert.equal(invalidAzopyram.isBatchApproved, false);
			assert.ok(invalidAzopyram.rejectionReason?.includes("азопирамовая проба"));
		});

		it("validates steam and dry heat autoclave cycles", () => {
			const steamValid = SanPiNSterilizationEngine.validateAutoclaveCycle({
				cycleMode: "B",
				temperatureCelsius: 134.5,
				pressureBar: 2.15,
				durationMin: 5,
				passedIndicator: true,
			});
			assert.equal(steamValid.isValid, true);
			assert.equal(steamValid.status, "passed");

			const dryHeatValid = SanPiNSterilizationEngine.validateAutoclaveCycle({
				cycleMode: "dry_heat_180",
				temperatureCelsius: 180.0,
				durationMin: 60,
				passedIndicator: true,
			});
			assert.equal(dryHeatValid.isValid, true);
			assert.equal(dryHeatValid.status, "passed");
		});

		it("generates deterministic sterilization barcode", () => {
			const barcode = SanPiNSterilizationEngine.generateSterilizationBarcode({
				cycleId: "CYC-108",
				trayCode: "SURGERY-TRAY-01",
				expiryDate: new Date("2026-11-20T12:00:00Z"),
			});
			assert.equal(barcode, "DNT-STER-CYC108-SURGERYTRAY01-20261120");
		});
	});
});
