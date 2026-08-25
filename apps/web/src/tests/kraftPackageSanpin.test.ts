import assert from "node:assert/strict";
import test, { describe, it } from "node:test";
import {
	// Kraft Package Generator & Thermal Engine
	calculateKraftBatchStatistics,
	calculatePackageExpiration,
	encodeStringToCp866,
	evaluateKraftPackageStatus,
	exportKraftBatchToCsv,
	filterKraftPackages,
	formatKraftDataMatrixPayload,
	generate1DBarcodeString,
	generateA4BatchSheetHtml,
	generateEscPosSanpinLabelBinary,
	generateKraftBatchRecords,
	generateSanpinCode128Svg,
	generateSanpinDataMatrixSvg,
	generateThermalStickerHtml,
	generateTsplLabelCode,
	generateZplLabelCode,
	getChemicalIndicatorDefinition,
	getDentalToolSetDefinition,
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
	KRAFT_PACKAGE_MATERIALS,
	KRAFT_PACKAGE_SIZES,
	SANPIN_CHEMICAL_INDICATORS,
	type KraftPackageRecord,
	// SanPiN Registry Engine & Journals
	calculateAirDecontaminationDuration,
	calculateCabinetStampHash,
	calculateDigitalStampHash,
	calculateDisinfectantSolutionMath,
	calculateLampOperatingHours,
	calculateNextGeneralCleaningDate,
	calculatePsoSampleRequirements,
	calculateRequiredConcentrateForVolume,
	createCabinetReadinessRecord,
	createDefault5ChamberPoints,
	createForm257Record,
	evaluate5ChamberPoints,
	evaluateCabinetReadiness,
	evaluateCycleParameters,
	evaluateLampFleetHealth,
	evaluatePsoTrialResult,
	exportBactericidalJournalToCsv,
	exportCabinetReadinessToCsv,
	exportDisinfectantJournalToCsv,
	exportForm257ToCsv,
	exportGeneralCleaningJournalToCsv,
	exportPsoJournalToCsv,
	generateBactericidalJournalPrintHtml,
	generateCabinetReadinessId,
	generateCabinetReadinessPrintHtml,
	generateForm257PrintHtml,
	generateForm257RecordId,
	generateGeneralCleaningJournalPrintHtml,
	generatePsoJournalPrintHtml,
	generatePsoRecordId,
	getCabinetReadinessPreset,
	CABINET_READINESS_PRESETS,
	STATUTORY_CHAMBER_5_POINTS,
	STATUTORY_STERILIZATION_REGIMES,
	validateCleaningScheduleCompliance,
	type CabinetReadinessRecord,
	type ChamberPointEvaluation,
	type Form257Record,
	type PhysicalSensorsData,
	type PsoJournalRecord,
} from "@dental/shared";
import {
	AUTOCLAVE_REGIME_PRESETS,
	STATUTORY_CLINIC_CABINETS,
	calculatePeriodDateRange,
	calculateRetroactiveBatchStats,
	exportRetroactiveBatchToCsv,
	generateRetroactiveDossierPrintHtml,
	generateRetroactiveSanpinDays,
	type PeriodPreset,
	type RetroactiveDayRecord,
	type RetroactiveGenerationOptions,
} from "../components/sanpin/retroactiveSanpinEngine.js";

describe("ROLE 2: NURSE & STERILIZATION ASSISTANT — SANPIN 3.3686-21 COMPREHENSIVE SUITE", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. DIGITAL PSO QUALITY JOURNAL (ФОРМА № 366/у)
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Digital Pre-Sterilization Cleaning (PSO) Journal (Форма № 366/у)", () => {
		it("calculates 1% sample requirements with minimums 3 and 5", () => {
			// Normal batch (100 items) -> 1% = 1 item, but statutory minimum is 3 items
			const req1 = calculatePsoSampleRequirements(100, false);
			assert.equal(req1.minSampleCount, 3);
			assert.ok(req1.ruleRefRu.includes("СанПиН 3.3686-21"));

			// Large batch (450 items) -> 1% = 5 items (ceil(4.5))
			const req2 = calculatePsoSampleRequirements(450, false);
			assert.equal(req2.minSampleCount, 5);

			// Critical surgical batch (30 items) -> minimum 5 items
			const reqSurg = calculatePsoSampleRequirements(30, true);
			assert.equal(reqSurg.minSampleCount, 5);
		});

		it("approves batch when Azopyram and Phenolphthalein trials are both negative", () => {
			const evaluation = evaluatePsoTrialResult({
				batchCount: 120,
				testedSampleCount: 3,
				isAzopyramNegative: true, // Отрицательная (окрашивания нет — норма)
				isPhenolphthaleinNegative: true, // Отрицательная (окрашивания нет — норма)
				isSudanNegative: true,
			});

			assert.equal(evaluation.isBatchApproved, true);
			assert.equal(evaluation.samplingSatisfied, true);
			assert.equal(evaluation.rejectionReason, null);
			assert.ok(evaluation.complianceNoteRu.includes("допущена к автоклавированию"));
		});

		it("rejects batch on POSITIVE Azopyram trial (occult blood / hemoglobin detected -> violet coloration)", () => {
			const evaluation = evaluatePsoTrialResult({
				batchCount: 100,
				testedSampleCount: 3,
				isAzopyramNegative: false, // ПОЛОЖИТЕЛЬНАЯ (ФИОЛЕТОВОЕ ОКРАШИВАНИЕ / КРОВЬ)
				isPhenolphthaleinNegative: true,
			});

			assert.equal(evaluation.isBatchApproved, false);
			assert.ok(evaluation.rejectionReason?.includes("азопирамовая проба"));
			assert.ok(evaluation.rejectionReason?.includes("скрытая кровь"));
			assert.ok(evaluation.rejectionReason?.includes("повторной дезинфекции и предстерилизационной очистке"));
		});

		it("rejects batch on POSITIVE Phenolphthalein trial (alkaline detergent residue detected -> pink coloration)", () => {
			const evaluation = evaluatePsoTrialResult({
				batchCount: 100,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: false, // ПОЛОЖИТЕЛЬНАЯ (РОЗОВОЕ ОКРАШИВАНИЕ / ЩЕЛОЧЬ)
			});

			assert.equal(evaluation.isBatchApproved, false);
			assert.ok(evaluation.rejectionReason?.includes("фенолфталеиновая проба"));
			assert.ok(evaluation.rejectionReason?.includes("моющих средств"));
			assert.ok(evaluation.rejectionReason?.includes("дистиллированной водой"));
		});

		it("rejects batch when sample count is less than statutory 1% requirement", () => {
			// Batch 500 items requires 5 tested samples; only 2 tested
			const evaluation = evaluatePsoTrialResult({
				batchCount: 500,
				testedSampleCount: 2,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
			});

			assert.equal(evaluation.isBatchApproved, false);
			assert.equal(evaluation.samplingSatisfied, false);
			assert.equal(evaluation.minSampleRequired, 5);
			assert.ok(evaluation.rejectionReason?.includes("Недостаточный объем выборки"));
		});

		it("generates unique PSO record ID and exports to RFC 4180 CSV with UTF-8 BOM", () => {
			const psoId = generatePsoRecordId("2026-08-25", 88);
			assert.equal(psoId, "PSO-20260825-0088");

			const sampleRecords: PsoJournalRecord[] = [
				{
					id: psoId,
					timestamp: "2026-08-25T08:30:00Z",
					instrumentName: "Терапевтический лоток смотровой (зеркала, зонды, пинцеты)",
					categoryId: "therapeutic_kit",
					batchItemCount: 100,
					testedSampleCount: 3,
					testType: "both_standard",
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isSudanNegative: true,
					detergentBrand: "Биолот 0.5% + Аламинол 1.5%",
					isBatchApproved: true,
					operatorStaffFullName: "Смирнова Анна Викторовна",
					operatorStaffPosition: "Медсестра ЦСО",
					electronicStampVerified: true,
				},
			];

			const csv = exportPsoJournalToCsv(sampleRecords);
			assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM for Excel");
			assert.ok(csv.includes("Азопирамовая проба (кровь)"));
			assert.ok(csv.includes("Фенолфталеиновая проба (щелочь)"));
			assert.ok(csv.includes("Смирнова Анна Викторовна"));
			assert.ok(csv.includes("Отрицательная (Норма)"));
		});

		it("generates 1-click printable Form 366/u HTML for Rospotrebnadzor inspection", () => {
			const sampleRecords: PsoJournalRecord[] = [
				{
					id: "PSO-20260825-0001",
					timestamp: "2026-08-25T09:00:00Z",
					instrumentName: "Хирургические элеваторы и щипцы",
					categoryId: "surgical_kit",
					batchItemCount: 40,
					testedSampleCount: 5,
					testType: "both_standard",
					isAzopyramNegative: true,
					isPhenolphthaleinNegative: true,
					isSudanNegative: true,
					detergentBrand: "Биолот 0.5%",
					isBatchApproved: true,
					operatorStaffFullName: "Иванова М.П.",
					operatorStaffPosition: "Медсестра",
					electronicStampVerified: true,
				},
			];

			const html = generatePsoJournalPrintHtml({ records: sampleRecords });
			assert.ok(html.includes("ФОРМА № 366/у"));
			assert.ok(html.includes("СанПиН 3.3686-21"));
			assert.ok(html.includes("Хирургические элеваторы и щипцы"));
			assert.ok(html.includes("Отрицат."));
			assert.ok(html.includes("Допущено"));
			assert.ok(html.includes("Главная медицинская сестра"));
			assert.ok(html.includes("Главный врач"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 2. AUTOCLAVE OPERATION CONTROL JOURNAL (ФОРМА № 257/у)
	// ─────────────────────────────────────────────────────────────────────────
	describe("2. Autoclave Operation Control Journal (Форма № 257/у)", () => {
		it("validates steam autoclave regimes: 134°C (5 min / 20 min at 2.0-2.2 atm) and 121°C (20 min at 1.1 atm)", () => {
			// 1. Скоростной режим 134°C / 5 мин / 2.1 бар -> Норма
			const sensors134Fast: PhysicalSensorsData = {
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 2.12,
				actualExposureMinutes: 5.5,
			};
			const comp134Fast = evaluateCycleParameters("steam_134_5min", sensors134Fast);
			assert.equal(comp134Fast.isCompliant, true);
			assert.equal(comp134Fast.failureReasons.length, 0);

			// 2. Хирургический режим 134°C / 20 мин / 2.1 бар -> Норма
			const sensors134Surg: PhysicalSensorsData = {
				actualTemperatureCelsius: 135.0,
				actualPressureBar: 2.15,
				actualExposureMinutes: 20.0,
			};
			const comp134Surg = evaluateCycleParameters("steam_134_20min", sensors134Surg);
			assert.equal(comp134Surg.isCompliant, true);

			// 3. Щадящий режим 121°C / 20 мин / 1.1 бар -> Норма
			const sensors121: PhysicalSensorsData = {
				actualTemperatureCelsius: 121.5,
				actualPressureBar: 1.15,
				actualExposureMinutes: 20.0,
			};
			const comp121 = evaluateCycleParameters("steam_121_20min", sensors121);
			assert.equal(comp121.isCompliant, true);

			// 4. Нарушение температуры (130°C вместо 134°C) -> Брак
			const sensorsTempFail: PhysicalSensorsData = {
				actualTemperatureCelsius: 130.0,
				actualPressureBar: 2.10,
				actualExposureMinutes: 5.0,
			};
			const compTempFail = evaluateCycleParameters("steam_134_5min", sensorsTempFail);
			assert.equal(compTempFail.isCompliant, false);
			assert.equal(compTempFail.isTempCompliant, false);
			assert.ok(compTempFail.failureReasons.some((r) => r.includes("Температура вне нормы")));

			// 5. Нарушение давления (1.6 бар вместо 2.0-2.3 бар) -> Брак
			const sensorsPressureFail: PhysicalSensorsData = {
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 1.6,
				actualExposureMinutes: 5.0,
			};
			const compPressureFail = evaluateCycleParameters("steam_134_5min", sensorsPressureFail);
			assert.equal(compPressureFail.isCompliant, false);
			assert.equal(compPressureFail.isPressureCompliant, false);
			assert.ok(compPressureFail.failureReasons.some((r) => r.includes("Давление пара вне нормы")));

			// 6. Недостаточная экспозиция (3 мин вместо 5 мин) -> Брак
			const sensorsTimeFail: PhysicalSensorsData = {
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 2.10,
				actualExposureMinutes: 3.0,
			};
			const compTimeFail = evaluateCycleParameters("steam_134_5min", sensorsTimeFail);
			assert.equal(compTimeFail.isCompliant, false);
			assert.equal(compTimeFail.isTimeCompliant, false);
			assert.ok(compTimeFail.failureReasons.some((r) => r.includes("Недостаточная экспозиция")));
		});

		it("evaluates chemical indicators in all 5 chamber control points (KT-1..KT-5)", () => {
			assert.equal(STATUTORY_CHAMBER_5_POINTS.length, 5);

			// 1. Все 5 точек успешно сработали (100% переход)
			const pointsPassed = createDefault5ChamberPoints("Интеграл-134 (Класс 5)", true);
			const evalPassed = evaluate5ChamberPoints(pointsPassed);
			assert.equal(evalPassed.areAllPointsPassed, true);
			assert.equal(evalPassed.passedPointsCount, 5);
			assert.equal(evalPassed.failedPointsCount, 0);
			assert.ok(evalPassed.summaryRu.includes("СТЕРИЛЬНО"));

			// 2. Сбой индикатора в точке КТ-2 (холодный угол) -> БРАК партии
			const pointsDefect: ChamberPointEvaluation[] = [
				{ pointIndex: 1, code: "КТ-1", nameRu: "Верхний угол", indicatorId: "vinar_inte_5", indicatorTradeNameRu: "Интеграл-134", status: "passed", initialColorRu: "Синий", actualColorRu: "Черный" },
				{ pointIndex: 2, code: "КТ-2", nameRu: "Нижний угол", indicatorId: "vinar_inte_5", indicatorTradeNameRu: "Интеграл-134", status: "failed", initialColorRu: "Синий", actualColorRu: "Синий (не сработал)" },
				{ pointIndex: 3, code: "КТ-3", nameRu: "Центр", indicatorId: "vinar_inte_5", indicatorTradeNameRu: "Интеграл-134", status: "passed", initialColorRu: "Синий", actualColorRu: "Черный" },
				{ pointIndex: 4, code: "КТ-4", nameRu: "Дренаж", indicatorId: "vinar_inte_5", indicatorTradeNameRu: "Интеграл-134", status: "passed", initialColorRu: "Синий", actualColorRu: "Черный" },
				{ pointIndex: 5, code: "КТ-5", nameRu: "Задняя стенка", indicatorId: "vinar_inte_5", indicatorTradeNameRu: "Интеграл-134", status: "passed", initialColorRu: "Синий", actualColorRu: "Черный" },
			];
			const evalDefect = evaluate5ChamberPoints(pointsDefect);
			assert.equal(evalDefect.areAllPointsPassed, false);
			assert.equal(evalDefect.passedPointsCount, 4);
			assert.equal(evalDefect.failedPointsCount, 1);
			assert.deepEqual(evalDefect.failedPointIndices, [2]);
			assert.ok(evalDefect.summaryRu.includes("БРАК СТЕРИЛИЗАЦИИ"));
			assert.ok(evalDefect.summaryRu.includes("КТ-2"));
		});

		it("creates complete Form 257 record with tamper-proof cryptographic stamp", () => {
			const points = createDefault5ChamberPoints("Интеграл-134 (Класс 5)", true);
			const record = createForm257Record({
				date: "2026-08-25",
				cycleNumber: 4,
				sterilizerId: "autoclave-melag-vacuklav-23b",
				sterilizerCode: "АК-01",
				sterilizerBrandModel: "Melag Vacuklav 23B+",
				sterilizerSerialNumber: "VK-2024-8841",
				regimeId: "steam_134_5min",
				sensors: {
					actualTemperatureCelsius: 134.5,
					actualPressureBar: 2.15,
					actualExposureMinutes: 5.5,
				},
				itemsDescriptionRu: "Терапевтические лотки (12 шт), наборы боров (6 шт)",
				packsCount: 18,
				packagingType: "kraft_self_adhesive",
				packagingNameRu: "Крафт-пакет самоклеящийся (50 сут.)",
				shelfLifeDays: 50,
				chamberPoints: points,
				operatorStaffFullName: "Смирнова Анна Викторовна",
				operatorStaffPosition: "Медсестра ЦСО",
				isHeadNurseVerified: true,
				headNurseSignatureFullName: "Воронова М.А.",
			});

			assert.equal(record.isCyclePassed, true);
			assert.equal(record.status, "sterile_passed");
			assert.ok(record.id.startsWith("F257-20260825-АК01-C04"));
			assert.ok(record.digitalStampHash.startsWith("DENTE-CSO-257-"));
			assert.equal(record.packsCount, 18);
			assert.equal(record.actualTemperatureCelsius, 134.5);
			assert.equal(record.actualPressureBar, 2.15);
		});

		it("exports Form 257 register to RFC 4180 CSV with UTF-8 BOM", () => {
			const points = createDefault5ChamberPoints("Медтест ИС-134 (Класс 5)", true);
			const record = createForm257Record({
				date: "2026-08-25",
				cycleNumber: 1,
				sterilizerId: "autoclave-01",
				sterilizerCode: "АК-01",
				regimeId: "steam_134_5min",
				sensors: { actualTemperatureCelsius: 134.2, actualPressureBar: 2.1, actualExposureMinutes: 5.0 },
				itemsDescriptionRu: "Смотровые наборы",
				packsCount: 10,
				chamberPoints: points,
				operatorStaffFullName: "Смирнова А.В.",
			});

			const csv = exportForm257ToCsv([record]);
			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("ID Записи;Дата;Номер цикла;Код аппарата"));
			assert.ok(csv.includes("АК-01"));
			assert.ok(csv.includes("134.2"));
			assert.ok(csv.includes("СТЕРИЛЬНО"));
		});

		it("generates 1-click official Form 257/u HTML print layout for Rospotrebnadzor", () => {
			const points = createDefault5ChamberPoints("Интеграл-134 (Класс 5)", true);
			const record = createForm257Record({
				date: "2026-08-25",
				cycleNumber: 2,
				sterilizerId: "autoclave-01",
				sterilizerCode: "АК-01",
				regimeId: "steam_134_20min",
				sensors: { actualTemperatureCelsius: 134.8, actualPressureBar: 2.18, actualExposureMinutes: 20.5 },
				itemsDescriptionRu: "Хирургический набор имплантологии",
				packsCount: 5,
				chamberPoints: points,
				operatorStaffFullName: "Смирнова А.В.",
			});

			const html = generateForm257PrintHtml([record]);
			assert.ok(html.includes("ФОРМА № 257/у"));
			assert.ok(html.includes("СанПиН 3.3686-21"));
			assert.ok(html.includes("Melag Vacuklav 23B+"));
			assert.ok(html.includes("134.8°C / 2.18 бар"));
			assert.ok(html.includes("СТЕРИЛЬНО"));
			assert.ok(html.includes("Главная медицинская сестра"));
			assert.ok(html.includes("Главный врач клиники"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 3. KRAFT PACKAGE GENERATOR & THERMAL PRINTERS (TSPL / ZPL / ESC-POS CP866)
	// ─────────────────────────────────────────────────────────────────────────
	describe("3. Kraft Package Generator & Thermal Label Engine", () => {
		it("calculates exact statutory shelf life (50 / 60 / 180 / 20 days)", () => {
			const packDate = "2026-08-25T00:00:00.000Z";

			// 1. Одинарный самоклеящийся крафт: 50 суток -> 2026-10-14
			const resSingle = calculatePackageExpiration(packDate, "paper_self_seal_single", packDate);
			assert.equal(resSingle.daysLifespan, 50);
			assert.equal(resSingle.expDateFormatted, "2026-10-14");
			assert.equal(resSingle.status, "sterile_valid");

			// 2. Двойной крафт: 60 суток -> 2026-10-24
			const resDouble = calculatePackageExpiration(packDate, "paper_self_seal_double", packDate);
			assert.equal(resDouble.daysLifespan, 60);
			assert.equal(resDouble.expDateFormatted, "2026-10-24");

			// 3. Комбинированный бумага + пленка термосварочный: 180 суток (6 мес) -> 2027-02-21
			const resCombo = calculatePackageExpiration(packDate, "paper_plastic_pouch", packDate);
			assert.equal(resCombo.daysLifespan, 180);
			assert.equal(resCombo.expDateFormatted, "2027-02-21");

			// 4. Крепированная бумага: 60 суток
			const resCrepe = calculatePackageExpiration(packDate, "crepe_paper_wrap", packDate);
			assert.equal(resCrepe.daysLifespan, 60);

			// 5. Бикс КСПФ с фильтром: 20 суток -> 2026-09-14
			const resBix = calculatePackageExpiration(packDate, "bix_with_filter", packDate);
			assert.equal(resBix.daysLifespan, 20);
			assert.equal(resBix.expDateFormatted, "2026-09-14");
		});

		it("evaluates package status transitions correctly", () => {
			const expDate = "2026-09-10";

			// > 7 days remaining -> sterile_valid
			assert.equal(evaluateKraftPackageStatus(expDate, false, "2026-08-25"), "sterile_valid");

			// 5 days remaining -> expiring_soon_7d
			assert.equal(evaluateKraftPackageStatus(expDate, false, "2026-09-05"), "expiring_soon_7d");

			// Expired (today or past) -> expired
			assert.equal(evaluateKraftPackageStatus(expDate, false, "2026-09-10"), "expired");
			assert.equal(evaluateKraftPackageStatus(expDate, false, "2026-09-12"), "expired");

			// Breached packaging integrity -> recalled
			assert.equal(evaluateKraftPackageStatus(expDate, true, "2026-08-25"), "recalled");
		});

		it("generates 1D Code128 and 2D DataMatrix vector SVG barcodes", () => {
			const svg1d = generateSanpinCode128Svg("KB2608250001", { height: 40 });
			assert.ok(svg1d.startsWith("<svg"));
			assert.ok(svg1d.includes("<rect"));
			assert.ok(svg1d.includes("KB2608250001"));
			assert.ok(svg1d.endsWith("</svg>"));

			const payload2d = "KB-20260825-01#1|AUTO-01|CYC3|2026-08-25|2026-10-14|NURSE-01|TER-TRAY";
			const svg2d = generateSanpinDataMatrixSvg(payload2d, { size: 100 });
			assert.ok(svg2d.startsWith("<svg"));
			assert.ok(svg2d.includes("<rect"));
			assert.ok(svg2d.endsWith("</svg>"));
		});

		it("generates a full batch of Kraft package records", () => {
			const batch = generateKraftBatchRecords({
				autoclaveId: "AUTO-01",
				cycleNumber: 3,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_therapeutic_tray",
				quantity: 6,
				operatorName: "Смирнова А.В.",
				indicatorId: "vinar_intetest_5",
			});

			assert.equal(batch.length, 6);
			assert.equal(batch[0]?.serialNumber, 1);
			assert.equal(batch[5]?.serialNumber, 6);
			assert.equal(batch[0]?.daysLifespan, 50);
			assert.ok(batch[0]?.barcode128.startsWith("KB"));
			assert.ok(batch[0]?.barcodeDataMatrixPayload.includes("TER-TRAY"));
		});

		it("generates direct printer scripts: TSPL, ZPL II, and ESC-POS with CP866 encoding", () => {
			const batch = generateKraftBatchRecords({
				autoclaveId: "AUTO-01",
				cycleNumber: 2,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_therapeutic_tray",
				quantity: 1,
			});
			const record = batch[0]!;

			// TSPL (Xprinter, TSC)
			const tspl = generateTsplLabelCode(record, { size: "58x40", copies: 2 });
			assert.ok(tspl.includes("SIZE 58 mm, 40 mm"));
			assert.ok(tspl.includes("STERILE - SANPIN 3.3686-21"));
			assert.ok(tspl.includes("PRINT 1,2"));

			// ZPL II (Zebra)
			const zpl = generateZplLabelCode(record, { size: "58x40", copies: 2 });
			assert.ok(zpl.includes("^XA"));
			assert.ok(zpl.includes("^PW464"));
			assert.ok(zpl.includes("STERILE - SANPIN 3.3686-21"));
			assert.ok(zpl.includes("^PQ2,0,1,Y"));
			assert.ok(zpl.includes("^XZ"));

			// ESC-POS binary stream with IBM CP866 Cyrillic encoding
			const bin = generateEscPosSanpinLabelBinary(record, { clinicName: "СТОМАТОЛОГИЯ DENTE", cutPaper: true });
			assert.ok(bin instanceof Uint8Array);
			assert.ok(bin.length > 50);
			assert.equal(bin[0], 0x1b); // ESC @
			assert.equal(bin[1], 0x40);
			assert.equal(bin[2], 0x1b); // ESC t 17 (CP866)
			assert.equal(bin[3], 0x74);
			assert.equal(bin[4], 0x11);
		});

		it("generates HTML thermal sticker and A4 batch sheet for laser printer", () => {
			const batch = generateKraftBatchRecords({
				autoclaveId: "AUTO-01",
				cycleNumber: 1,
				packageType: "paper_self_seal_single",
				packageSize: "size_100x200",
				toolSetId: "set_therapeutic_tray",
				quantity: 3,
			});

			const sticker58x40 = generateThermalStickerHtml(batch[0]!, { size: "58x40" });
			assert.ok(sticker58x40.includes("kraft-sticker-58x40"));
			assert.ok(sticker58x40.includes("СТЕРИЛЬНО • СанПиН 3.3686-21"));
			assert.ok(sticker58x40.includes("<svg"));

			const a4Sheet = generateA4BatchSheetHtml(batch);
			assert.ok(a4Sheet.includes("РЕЕСТР ЭТИКЕТОК СТЕРИЛИЗАЦИИ КРАФТ-ПАКЕТОВ"));
			assert.ok(a4Sheet.includes("Всего этикеток: <strong>3 шт.</strong>"));
			assert.ok(a4Sheet.includes("a4-grid"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 4. EXPRESS CHECKLIST: STERILE CABINET & DENTAL UNIT READINESS
	// ─────────────────────────────────────────────────────────────────────────
	describe("4. Express Checklist: Cabinet & Dental Unit Readiness (SanPiN 3.3686-21)", () => {
		it("approves cabinet readiness for Therapy when all sterilization & disinfection checks pass", () => {
			const evalResult = evaluateCabinetReadiness({
				appointmentType: "therapy",
				surfaceDisinfection: {
					isCompleted: true,
					disinfectantBrand: "Бациллол АФ",
					exposureMinutes: 3,
					surfacesCleaned: ["Кресло пациента", "Столики", "Светильник", "Плевательница", "Шланги"],
				},
				handpiecesSterility: {
					isCompleted: true,
					turbineHandpieceSterile: true,
					contraAngleHandpieceSterile: true,
					micromotorHandpieceSterile: true,
					class5IndicatorsVerified: true,
					packageIntegrityVerified: true,
				},
				sterileTray: {
					isCompleted: true,
					mirrorReady: true,
					probeReady: true,
					tweezersReady: true,
					excavatorReady: true,
					spatulaPluggerReady: true,
				},
				aspirationSystem: {
					isCompleted: true,
					salivaEjectorConnected: true,
					hveVacuumConnected: true,
					bacterialFilterChecked: true,
				},
				isolationCofferdam: {
					isCompleted: true,
					rubberDamSheetReady: true,
					clampsReady: true,
					forcepsReady: true,
				},
			});

			assert.equal(evalResult.isFullyReady, true);
			assert.equal(evalResult.missingItems.length, 0);
			assert.equal(evalResult.statusMessageRu, "🟢 Кабинет стерилен и готов к приёму");
			assert.equal(evalResult.summaryBadgeRu, "🟢 Готов к приёму");
		});

		it("rejects cabinet readiness if disinfection exposure is insufficient or cofferdam is missing for Endodontics", () => {
			const evalResult = evaluateCabinetReadiness({
				appointmentType: "endodontics",
				surfaceDisinfection: {
					isCompleted: true,
					disinfectantBrand: "Бациллол АФ",
					exposureMinutes: 1, // Меньше 3 мин
				},
				handpiecesSterility: {
					isCompleted: true,
					turbineHandpieceSterile: true,
					contraAngleHandpieceSterile: true,
					class5IndicatorsVerified: false, // Индикаторы 5 класса не проверены!
					packageIntegrityVerified: true,
				},
				sterileTray: {
					isCompleted: true,
					mirrorReady: true,
					probeReady: true,
					tweezersReady: true,
					excavatorReady: true,
					spatulaPluggerReady: true,
				},
				aspirationSystem: {
					isCompleted: true,
					salivaEjectorConnected: true,
					hveVacuumConnected: true,
					bacterialFilterChecked: true,
				},
				isolationCofferdam: {
					isCompleted: false, // Коффердам не подготовлен!
					rubberDamSheetReady: false,
					clampsReady: false,
					forcepsReady: false,
				},
			});

			assert.equal(evalResult.isFullyReady, false);
			assert.ok(evalResult.missingItems.length >= 3);
			assert.ok(evalResult.missingItems.some((m) => m.includes("экспозиция дезинфекции")));
			assert.ok(evalResult.missingItems.some((m) => m.includes("индикаторы 5 класса")));
			assert.ok(evalResult.missingItems.some((m) => m.includes("Коффердам не подготовлен")));
			assert.ok(evalResult.statusMessageRu.startsWith("🔴 Кабинет не готов:"));
		});

		it("allows Surgery profile without cofferdam requirement, verifying 5-min disinfection and surgical tray", () => {
			const evalResult = evaluateCabinetReadiness({
				appointmentType: "surgery",
				surfaceDisinfection: {
					isCompleted: true,
					disinfectantBrand: "Дезискраб / Бациллол АФ",
					exposureMinutes: 5,
				},
				handpiecesSterility: {
					isCompleted: true,
					turbineHandpieceSterile: true,
					contraAngleHandpieceSterile: true,
					class5IndicatorsVerified: true,
					packageIntegrityVerified: true,
				},
				sterileTray: {
					isCompleted: true,
					mirrorReady: true,
					probeReady: true,
					tweezersReady: true,
					excavatorReady: true,
					spatulaPluggerReady: true,
				},
				aspirationSystem: {
					isCompleted: true,
					salivaEjectorConnected: true,
					hveVacuumConnected: true,
					bacterialFilterChecked: true,
				},
				isolationCofferdam: {
					isCompleted: false,
					rubberDamSheetReady: false,
					clampsReady: false,
					forcepsReady: false,
					isNotRequiredForProfile: true, // Для хирургии коффердам не требуется
				},
			});

			assert.equal(evalResult.isFullyReady, true);
			assert.equal(evalResult.statusMessageRu, "🟢 Кабинет стерилен и готов к приёму");
		});

		it("creates a complete CabinetReadinessRecord with digital stamp hash and exports to CSV & HTML", () => {
			const record = createCabinetReadinessRecord({
				cabinetNumber: "1",
				appointmentType: "therapy",
				operatorStaffFullName: "Смирнова Анна Викторовна",
				operatorStaffPosition: "Ассистент стоматолога",
				surfaceDisinfection: {
					isCompleted: true,
					disinfectantBrand: "Бациллол АФ",
					exposureMinutes: 3,
				},
				handpiecesSterility: {
					isCompleted: true,
					turbineHandpieceSterile: true,
					contraAngleHandpieceSterile: true,
					class5IndicatorsVerified: true,
					packageIntegrityVerified: true,
				},
				sterileTray: {
					isCompleted: true,
					mirrorReady: true,
					probeReady: true,
					tweezersReady: true,
					excavatorReady: true,
					spatulaPluggerReady: true,
				},
				aspirationSystem: {
					isCompleted: true,
					salivaEjectorConnected: true,
					hveVacuumConnected: true,
					bacterialFilterChecked: true,
				},
				isolationCofferdam: {
					isCompleted: true,
					rubberDamSheetReady: true,
					clampsReady: true,
					forcepsReady: true,
				},
				notes: "Кабинет подготовлен к терапевтическому приёму 10:00",
			});

			assert.equal(record.isFullyReady, true);
			assert.ok(record.id.startsWith("CR-"));
			assert.ok(record.digitalStampHash.startsWith("CAB-CHECK-"));
			assert.equal(record.appointmentTypeTitleRu.includes("Терапевтический"), true);

			// CSV Export
			const csv = exportCabinetReadinessToCsv([record]);
			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("ID Записи;Дата и время;Кабинет"));
			assert.ok(csv.includes("ГОТОВ К ПРИЁМУ"));
			assert.ok(csv.includes("Бациллол АФ (3 мин)"));

			// HTML Export
			const html = generateCabinetReadinessPrintHtml({ records: [record] });
			assert.ok(html.includes("ЖУРНАЛ ЭКСПРЕСС-КОНТРОЛЯ ГОТОВНОСТИ КАБИНЕТОВ"));
			assert.ok(html.includes("СанПиН 3.3686-21"));
			assert.ok(html.includes("🟢 ГОТОВ"));
			assert.ok(html.includes("Смирнова Анна Викторовна"));
		});
	});

	// ─────────────────────────────────────────────────────────────────────────
	// 5. RETROACTIVE SANPIN BATCH GENERATOR (1-CLICK PERIOD CLOSE)
	// ─────────────────────────────────────────────────────────────────────────
	describe("5. Retroactive SanPiN Batch Generator (1-Click Period Close)", () => {
		it("calculates exact period dates for last week, current month, previous month, quarter, and custom", () => {
			const refDate = "2026-08-25";

			// 1. Last week (7 days)
			const lw = calculatePeriodDateRange("last_week", undefined, undefined, refDate);
			assert.equal(lw.startDate, "2026-08-19");
			assert.equal(lw.endDate, "2026-08-25");
			assert.ok(lw.labelRu.includes("Последняя неделя"));

			// 2. Current month (1st to 25th)
			const cm = calculatePeriodDateRange("current_month", undefined, undefined, refDate);
			assert.equal(cm.startDate, "2026-08-01");
			assert.equal(cm.endDate, "2026-08-25");

			// 3. Previous month (July 2026: 2026-07-01 to 2026-07-31)
			const pm = calculatePeriodDateRange("previous_month", undefined, undefined, refDate);
			assert.equal(pm.startDate, "2026-07-01");
			assert.equal(pm.endDate, "2026-07-31");

			// 4. Current quarter (Q3: July 1 to Aug 25)
			const cq = calculatePeriodDateRange("current_quarter", undefined, undefined, refDate);
			assert.equal(cq.startDate, "2026-07-01");
			assert.equal(cq.endDate, "2026-08-25");

			// 5. Custom dates
			const custom = calculatePeriodDateRange("custom", "2026-08-10", "2026-08-20", refDate);
			assert.equal(custom.startDate, "2026-08-10");
			assert.equal(custom.endDate, "2026-08-20");
		});

		it("generates full compliant batch of SanPiN records for 4 cabinets with 100% negative Azopyram and 5 chamber points", () => {
			const days = generateRetroactiveSanpinDays(
				{
					preset: "custom",
					startDate: "2026-08-17", // Monday
					endDate: "2026-08-23", // Sunday
					selectedCabinets: ["cabinet_1", "cabinet_2", "cabinet_3", "sterilization_room"],
					dutyNurseFullName: "Смирнова Анна Викторовна",
					dutyNursePosition: "Медсестра ЦСО",
					autoclaveRegimeId: "steam_134_5min",
					sterilizerModelName: "Melag Vacuklav 23B+",
					excludeSundays: true,
					averageVisitsPerCabinetDay: 6,
				},
				"2026-08-25",
			);

			assert.equal(days.length, 7); // 7 days total

			// 6 working days (Mon-Sat), 1 Sunday off
			const workingDays = days.filter((d) => d.isWorkingDay);
			const sundays = days.filter((d) => !d.isWorkingDay);
			assert.equal(workingDays.length, 6);
			assert.equal(sundays.length, 1);

			// Working day validations
			const monday = workingDays[0]!;
			assert.equal(monday.isWorkingDay, true);
			assert.equal(monday.cabinetsCount, 4);
			assert.ok(monday.visitsCount >= 20); // 4 cabs * 6 visits = 24
			assert.ok(monday.traysProcessedCount >= 80); // 24 * 4 = 96
			assert.ok(monday.psoSampleCount >= 3); // 1% of 96 = ceil(0.96) -> statutory min 3
			assert.equal(monday.isAzopyramNegative, true);
			assert.equal(monday.isPhenolphthaleinNegative, true);
			assert.equal(monday.isPsoApproved, true);
			assert.equal(monday.points5Passed, true);
			assert.equal(monday.autoclaveTemperature, 134);
			assert.equal(monday.autoclavePressure, 2.15);
			assert.equal(monday.sanpinCompliance100, true);
			assert.ok(monday.electronicStampHash.startsWith("DENTE-CSO-20260817-"));

			// Friday General Cleaning validation
			const friday = workingDays.find((d) => d.dayOfWeekRu === "Пятница");
			assert.ok(friday);
			assert.equal(friday.isGeneralCleaningDay, true);
			assert.ok(friday.cleaningTypeRu.includes("Генеральная уборка"));
			assert.ok(friday.cleaningDisinfectant.includes("Аламинол 3.0%"));

			// Sunday non-working day validation
			const sunday = sundays[0]!;
			assert.equal(sunday.isWorkingDay, false);
			assert.equal(sunday.traysProcessedCount, 0);
			assert.equal(sunday.autoclaveCyclesCount, 0);
		});

		it("calculates retroactive batch statistics with 100% compliance rate", () => {
			const days = generateRetroactiveSanpinDays(
				{
					preset: "custom",
					startDate: "2026-08-01",
					endDate: "2026-08-14",
					selectedCabinets: ["cabinet_1", "cabinet_2", "cabinet_3"],
					dutyNurseFullName: "Петрова Елена Сергеевна",
					dutyNursePosition: "Старшая медсестра",
					autoclaveRegimeId: "steam_134_5min",
					sterilizerModelName: "Euronda E9 Next",
					excludeSundays: true,
				},
				"2026-08-25",
			);

			const stats = calculateRetroactiveBatchStats(days);
			assert.equal(stats.totalDays, 14);
			assert.equal(stats.workingDaysCount, 12); // 14 days - 2 Sundays = 12
			assert.ok(stats.totalTraysProcessed > 500);
			assert.ok(stats.totalPsoSamplesTested > 30);
			assert.ok(stats.totalAutoclaveCycles >= 24);
			assert.ok(stats.totalRecirculatorHours > 50);
			assert.equal(stats.generalCleaningsCount, 2); // 2 Fridays in 14 days
			assert.ok(stats.totalWasteKg > 20);
			assert.equal(stats.compliancePercentage, 100);
		});

		it("generates Rospotrebnadzor inspection-grade A4 HTML booklet dossier and RFC 4180 CSV", () => {
			const days = generateRetroactiveSanpinDays(
				{
					preset: "last_week",
					selectedCabinets: ["cabinet_1", "cabinet_2"],
					dutyNurseFullName: "Смирнова Анна Викторовна",
					dutyNursePosition: "Медсестра ЦСО",
					autoclaveRegimeId: "steam_134_5min",
					sterilizerModelName: "Melag Vacuklav 23B+",
				},
				"2026-08-25",
			);

			// HTML Dossier
			const html = generateRetroactiveDossierPrintHtml(days, {
				clinicName: "ООО «Стоматологическая клиника ДЕНТЕ»",
				chiefDoctorName: "д.м.н. Воронов Михаил Александрович",
				headNurseName: "Смирнова Анна Викторовна",
				periodLabelRu: "Последняя неделя августа 2026",
			});

			assert.ok(html.includes("СВОДНОЕ ДОСЬЕ ПРОИЗВОДСТВЕННОГО КОНТРОЛЯ И РЕЕСТРЫ САНПИН"));
			assert.ok(html.includes("СанПиН 3.3686-21"));
			assert.ok(html.includes("Форма № 257/у"));
			assert.ok(html.includes("Форма № 366/у"));
			assert.ok(html.includes("д.м.н. Воронов Михаил Александрович"));
			assert.ok(html.includes("Смирнова Анна Викторовна"));
			assert.ok(html.includes("100% СРАБОТКА"));
			assert.ok(html.includes("СТЕРИЛЬНО"));

			// CSV Export
			const csv = exportRetroactiveBatchToCsv(days);
			assert.ok(csv.startsWith("\uFEFF"));
			assert.ok(csv.includes("Дата;День недели;Рабочий день;Кабинеты"));
			assert.ok(csv.includes("Отрицательная (Норма)"));
			assert.ok(csv.includes("100% СРАБОТКА (Норма)"));
			assert.ok(csv.includes("Смирнова Анна Викторовна"));
		});
	});
});


