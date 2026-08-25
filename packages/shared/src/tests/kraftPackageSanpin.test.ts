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
} from "../index.js";

describe("ROLE 2: NURSE & STERILIZATION ASSISTANT — SANPIN 3.3686-21 COMPREHENSIVE SUITE", () => {
	// ─────────────────────────────────────────────────────────────────────────
	// 1. DIGITAL PSO QUALITY JOURNAL (ФОРМА № 366/у)
	// ─────────────────────────────────────────────────────────────────────────
	describe("1. Digital Pre-Sterilization Cleaning (PSO) Journal (Форма № 366/у)", () => {
		it("calculates 1% sample requirements with minimums 3 and 5", () => {
			const req1 = calculatePsoSampleRequirements(100, false);
			assert.equal(req1.minSampleCount, 3);
			assert.ok(req1.ruleRefRu.includes("СанПиН 3.3686-21"));

			const req2 = calculatePsoSampleRequirements(450, false);
			assert.equal(req2.minSampleCount, 5);

			const reqSurg = calculatePsoSampleRequirements(30, true);
			assert.equal(reqSurg.minSampleCount, 5);
		});

		it("approves batch when Azopyram and Phenolphthalein trials are both negative", () => {
			const evaluation = evaluatePsoTrialResult({
				batchCount: 120,
				testedSampleCount: 3,
				isAzopyramNegative: true,
				isPhenolphthaleinNegative: true,
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
				isAzopyramNegative: false,
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
				isPhenolphthaleinNegative: false,
			});

			assert.equal(evaluation.isBatchApproved, false);
			assert.ok(evaluation.rejectionReason?.includes("фенолфталеиновая проба"));
			assert.ok(evaluation.rejectionReason?.includes("моющих средств"));
			assert.ok(evaluation.rejectionReason?.includes("дистиллированной водой"));
		});

		it("rejects batch when sample count is less than statutory 1% requirement", () => {
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
			const sensors134Fast: PhysicalSensorsData = {
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 2.12,
				actualExposureMinutes: 5.5,
			};
			const comp134Fast = evaluateCycleParameters("steam_134_5min", sensors134Fast);
			assert.equal(comp134Fast.isCompliant, true);
			assert.equal(comp134Fast.failureReasons.length, 0);

			const sensors134Surg: PhysicalSensorsData = {
				actualTemperatureCelsius: 135.0,
				actualPressureBar: 2.15,
				actualExposureMinutes: 20.0,
			};
			const comp134Surg = evaluateCycleParameters("steam_134_20min", sensors134Surg);
			assert.equal(comp134Surg.isCompliant, true);

			const sensors121: PhysicalSensorsData = {
				actualTemperatureCelsius: 121.5,
				actualPressureBar: 1.15,
				actualExposureMinutes: 20.0,
			};
			const comp121 = evaluateCycleParameters("steam_121_20min", sensors121);
			assert.equal(comp121.isCompliant, true);

			const sensorsTempFail: PhysicalSensorsData = {
				actualTemperatureCelsius: 130.0,
				actualPressureBar: 2.10,
				actualExposureMinutes: 5.0,
			};
			const compTempFail = evaluateCycleParameters("steam_134_5min", sensorsTempFail);
			assert.equal(compTempFail.isCompliant, false);
			assert.equal(compTempFail.isTempCompliant, false);
			assert.ok(compTempFail.failureReasons.some((r) => r.includes("Температура вне нормы")));

			const sensorsPressureFail: PhysicalSensorsData = {
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 1.6,
				actualExposureMinutes: 5.0,
			};
			const compPressureFail = evaluateCycleParameters("steam_134_5min", sensorsPressureFail);
			assert.equal(compPressureFail.isCompliant, false);
			assert.equal(compPressureFail.isPressureCompliant, false);
			assert.ok(compPressureFail.failureReasons.some((r) => r.includes("Давление пара вне нормы")));

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

			const pointsPassed = createDefault5ChamberPoints("Интеграл-134 (Класс 5)", true);
			const evalPassed = evaluate5ChamberPoints(pointsPassed);
			assert.equal(evalPassed.areAllPointsPassed, true);
			assert.equal(evalPassed.passedPointsCount, 5);
			assert.equal(evalPassed.failedPointsCount, 0);
			assert.ok(evalPassed.summaryRu.includes("СТЕРИЛЬНО"));

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

			const resSingle = calculatePackageExpiration(packDate, "paper_self_seal_single", packDate);
			assert.equal(resSingle.daysLifespan, 50);
			assert.equal(resSingle.expDateFormatted, "2026-10-14");
			assert.equal(resSingle.status, "sterile_valid");

			const resDouble = calculatePackageExpiration(packDate, "paper_self_seal_double", packDate);
			assert.equal(resDouble.daysLifespan, 60);
			assert.equal(resDouble.expDateFormatted, "2026-10-24");

			const resCombo = calculatePackageExpiration(packDate, "paper_plastic_pouch", packDate);
			assert.equal(resCombo.daysLifespan, 180);
			assert.equal(resCombo.expDateFormatted, "2027-02-21");

			const resCrepe = calculatePackageExpiration(packDate, "crepe_paper_wrap", packDate);
			assert.equal(resCrepe.daysLifespan, 60);

			const resBix = calculatePackageExpiration(packDate, "bix_with_filter", packDate);
			assert.equal(resBix.daysLifespan, 20);
			assert.equal(resBix.expDateFormatted, "2026-09-14");
		});

		it("evaluates package status transitions correctly", () => {
			const expDate = "2026-09-10";

			assert.equal(evaluateKraftPackageStatus(expDate, false, "2026-08-25"), "sterile_valid");
			assert.equal(evaluateKraftPackageStatus(expDate, false, "2026-09-05"), "expiring_soon_7d");
			assert.equal(evaluateKraftPackageStatus(expDate, false, "2026-09-10"), "expired");
			assert.equal(evaluateKraftPackageStatus(expDate, false, "2026-09-12"), "expired");
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

			const tspl = generateTsplLabelCode(record, { size: "58x40", copies: 2 });
			assert.ok(tspl.includes("SIZE 58 mm, 40 mm"));
			assert.ok(tspl.includes("STERILE - SANPIN 3.3686-21"));
			assert.ok(tspl.includes("PRINT 1,2"));

			const zpl = generateZplLabelCode(record, { size: "58x40", copies: 2 });
			assert.ok(zpl.includes("^XA"));
			assert.ok(zpl.includes("^PW464"));
			assert.ok(zpl.includes("STERILE - SANPIN 3.3686-21"));
			assert.ok(zpl.includes("^PQ2,0,1,Y"));
			assert.ok(zpl.includes("^XZ"));

			const bin = generateEscPosSanpinLabelBinary(record, { clinicName: "СТОМАТОЛОГИЯ DENTE", cutPaper: true });
			assert.ok(bin instanceof Uint8Array);
			assert.ok(bin.length > 50);
			assert.equal(bin[0], 0x1b);
			assert.equal(bin[1], 0x40);
			assert.equal(bin[2], 0x1b);
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
});
