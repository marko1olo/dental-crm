import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	evaluateCycleParameters,
	evaluate5ChamberPoints,
	createDefault5ChamberPoints,
	evaluateBioControlResult,
	checkNextBioControlDeadline,
	createForm257Record,
	exportForm257ToCsv,
	generateForm257PrintHtml,
	type ChamberPointEvaluation,
	type Form257Record,
	type BiologicalControlTestRecord,
} from "../autoclaveLog/autoclaveLogEngine.js";
import {
	STATUTORY_STERILIZATION_REGIMES,
	STATUTORY_CHEMICAL_INDICATORS,
	STATUTORY_BIO_INDICATORS,
	STATUTORY_CHAMBER_5_POINTS,
} from "../autoclaveLog/autoclaveLogPresets.js";

describe("SanPiN 3.3686-21 — Autoclave Journal (Form № 257/у)", () => {
	describe("1. Cycle Parameter Validation (134°C 2.1 bar, 121°C 1.1 bar, 180°C dry heat)", () => {
		it("validates standard Class B cycle (134°C, 2.1 bar, 5 min) as COMPLIANT", () => {
			const res = evaluateCycleParameters("steam_134_5min", {
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 2.15,
				actualExposureMinutes: 5.0,
			});
			assert.equal(res.isCompliant, true);
			assert.equal(res.isTempCompliant, true);
			assert.equal(res.isPressureCompliant, true);
			assert.equal(res.isTimeCompliant, true);
			assert.equal(res.failureReasons.length, 0);
		});

		it("validates prion Class B cycle (134°C, 2.15 bar, 20 min) as COMPLIANT", () => {
			const res = evaluateCycleParameters("steam_134_20min_prion", {
				actualTemperatureCelsius: 135.0,
				actualPressureBar: 2.18,
				actualExposureMinutes: 20.0,
			});
			assert.equal(res.isCompliant, true);
			assert.equal(res.isTempCompliant, true);
			assert.equal(res.isPressureCompliant, true);
			assert.equal(res.isTimeCompliant, true);
			assert.equal(res.failureReasons.length, 0);
		});

		it("rejects 134°C cycle if temperature drops below threshold (<134°C)", () => {
			const res = evaluateCycleParameters("steam_134_5min", {
				actualTemperatureCelsius: 132.0,
				actualPressureBar: 2.1,
				actualExposureMinutes: 5.0,
			});
			assert.equal(res.isCompliant, false);
			assert.equal(res.isTempCompliant, false);
			assert.ok(res.failureReasons.some((r) => r.includes("Температура")));
		});

		it("rejects 134°C steam cycle if pressure drops below 2.0 bar", () => {
			const res = evaluateCycleParameters("steam_134_5min", {
				actualTemperatureCelsius: 134.5,
				actualPressureBar: 1.8,
				actualExposureMinutes: 5.0,
			});
			assert.equal(res.isCompliant, false);
			assert.equal(res.isPressureCompliant, false);
			assert.ok(res.failureReasons.some((r) => r.includes("Давление")));
		});

		it("validates delicate Class B cycle (121°C, 1.15 bar, 20 min) for optics/polymers", () => {
			const res = evaluateCycleParameters("steam_121_20min", {
				actualTemperatureCelsius: 121.5,
				actualPressureBar: 1.15,
				actualExposureMinutes: 20.0,
			});
			assert.equal(res.isCompliant, true);
			assert.equal(res.isTempCompliant, true);
			assert.equal(res.isPressureCompliant, true);
			assert.equal(res.isTimeCompliant, true);
		});

		it("rejects delicate cycle if duration is less than statutory 20 minutes", () => {
			const res = evaluateCycleParameters("steam_121_20min", {
				actualTemperatureCelsius: 121.5,
				actualPressureBar: 1.2,
				actualExposureMinutes: 15.0,
			});
			assert.equal(res.isCompliant, false);
			assert.equal(res.isTimeCompliant, false);
			assert.ok(res.failureReasons.some((r) => r.includes("Недостаточная экспозиция")));
		});

		it("validates dry heat sterilizer (180°C, 60 min) as COMPLIANT", () => {
			const res = evaluateCycleParameters("dry_heat_180_60min", {
				actualTemperatureCelsius: 181.0,
				actualPressureBar: 0,
				actualExposureMinutes: 60.0,
			});
			assert.equal(res.isCompliant, true);
			assert.equal(res.isTempCompliant, true);
			assert.equal(res.isTimeCompliant, true);
		});

		it("rejects dry heat if temperature is below 178°C", () => {
			const res = evaluateCycleParameters("dry_heat_180_60min", {
				actualTemperatureCelsius: 175.0,
				actualPressureBar: 0,
				actualExposureMinutes: 60.0,
			});
			assert.equal(res.isCompliant, false);
			assert.equal(res.isTempCompliant, false);
			assert.ok(res.failureReasons.some((r) => r.includes("Температура")));
		});
	});

	describe("2. Chemical Indicators & 5-Point Chamber Audit (Интеграл, МедИС, СтериТЕСТ)", () => {
		it("evaluates default 5 chamber points with 100% compliance as fully valid", () => {
			const valid5Points = createDefault5ChamberPoints("intetest_v_134_5", true);
			const result = evaluate5ChamberPoints(valid5Points);
			assert.equal(result.areAllPointsPassed, true);
			assert.equal(result.passedPointsCount, 5);
			assert.equal(result.failedPointsCount, 0);
			assert.equal(result.failedPointIndices.length, 0);
			assert.ok(result.summaryRu.includes("СТЕРИЛЬНО"));
		});

		it("flags failure when cold spot point 2 (near condensate drain) fails to turn color", () => {
			const defectivePoints = createDefault5ChamberPoints("intetest_v_134_5", true);
			defectivePoints[1] = {
				...defectivePoints[1]!,
				status: "failed",
				actualColorRu: "Светло-фиолетовый (не сработал)",
				notes: "Недостаточный прогрев дренажного угла",
			};

			const result = evaluate5ChamberPoints(defectivePoints);
			assert.equal(result.areAllPointsPassed, false);
			assert.equal(result.passedPointsCount, 4);
			assert.equal(result.failedPointsCount, 1);
			assert.deepEqual(result.failedPointIndices, [2]);
			assert.ok(result.summaryRu.includes("КТ-2"));
		});

		it("verifies chemical indicator catalog integrity (ИнтеТЕСТ Class 5, СтериТЕСТ Class 4)", () => {
			const intetest = STATUTORY_CHEMICAL_INDICATORS.find((c) => c.id === "intetest_v_134_5");
			assert.ok(intetest, "ИнтеТЕСТ-В 134/5 indicator must exist");
			assert.equal(intetest.indicatorClass, 5);

			const steritest = STATUTORY_CHEMICAL_INDICATORS.find((c) => c.id === "steritest_v_134");
			assert.ok(steritest, "СтериТЕСТ-В-134 indicator must exist");
			assert.equal(steritest.indicatorClass, 4);
		});
	});

	describe("3. Biological Control Spore Tests (G. stearothermophilus / B. atrophaeus)", () => {
		it("evaluates negative spore growth as PASSED (sterile)", () => {
			const record: BiologicalControlTestRecord = {
				id: "bio-1",
				sterilizerId: "autoclave-melag-vacuklav-23b",
				sterilizerCode: "АК-01",
				datePlaced: "2026-08-20",
				dateReadout: "2026-08-22",
				bioIndicatorId: "bio_geobacillus_stearothermophilus",
				sporeCultureNameRu: "Geobacillus stearothermophilus (штамм ATCC 7953)",
				lotNumber: "LOT-BIO-7721",
				incubationTempCelsius: 55,
				incubationHours: 48,
				testPointIndex: 1,
				result: "sterile_passed",
				laboratoryName: "ФБУЗ Центр гигиены и эпидемиологии",
				protocolNumber: "ПР-2026/08-11",
				responsibleSpecialistFullName: "Смирнова Е.В.",
				notes: "Рост спор отсутствует, среда прозрачная",
			};

			const bio = evaluateBioControlResult(record);
			assert.equal(bio.isCompliant, true);
			assert.ok(bio.statusRu.includes("СТЕРИЛЬНО"));
			assert.ok(bio.conclusionRu.includes("допущен к эксплуатации"));
		});

		it("evaluates positive spore growth as FAILED with emergency stop recommendation", () => {
			const record: BiologicalControlTestRecord = {
				id: "bio-2",
				sterilizerId: "autoclave-melag-vacuklav-23b",
				sterilizerCode: "АК-01",
				datePlaced: "2026-08-20",
				dateReadout: "2026-08-22",
				bioIndicatorId: "bio_geobacillus_stearothermophilus",
				sporeCultureNameRu: "Geobacillus stearothermophilus (штамм ATCC 7953)",
				lotNumber: "LOT-BIO-7721",
				incubationTempCelsius: 55,
				incubationHours: 48,
				testPointIndex: 5,
				result: "growth_failed",
				laboratoryName: "ФБУЗ Центр гигиены и эпидемиологии",
				protocolNumber: "ПР-2026/08-12",
				responsibleSpecialistFullName: "Смирнова Е.В.",
				notes: "Помутнение среды, положительный рост",
			};

			const bio = evaluateBioControlResult(record);
			assert.equal(bio.isCompliant, false);
			assert.ok(bio.statusRu.includes("БРАК"));
			assert.ok(bio.conclusionRu.includes("немедленному выводу из эксплуатации"));
		});

		it("calculates statutory 6-month biological control deadlines according to SanPiN", () => {
			const now = new Date("2026-08-20T10:00:00Z");
			const recentDateStr = "2026-06-01";
			const status = checkNextBioControlDeadline(recentDateStr, now);
			assert.equal(status.isOverdue, false);
			assert.ok(status.daysRemaining > 0);

			const overdueDateStr = "2025-12-01";
			const overdueStatus = checkNextBioControlDeadline(overdueDateStr, now);
			assert.equal(overdueStatus.isOverdue, true);
			assert.ok(overdueStatus.daysRemaining < 0);
			assert.ok(overdueStatus.statusDescriptionRu.includes("истек"));
		});
	});

	describe("4. Form 257/u Record Construction, CSV Export & Print HTML", () => {
		it("creates a complete, tamper-proof Form 257/u record with hash", () => {
			const chamberPoints = createDefault5ChamberPoints("intetest_v_134_5", true);
			const record = createForm257Record({
				date: "2026-08-22",
				cycleNumber: 4,
				sterilizerId: "autoclave-melag-vacuklav-23b",
				regimeId: "steam_134_5min",
				sensors: {
					actualTemperatureCelsius: 134.5,
					actualPressureBar: 2.15,
					actualExposureMinutes: 5.0,
				},
				itemsDescriptionRu: "Хирургический лоток для имплантации (фрезы, элеваторы, пинцеты)",
				packsCount: 6,
				packagingType: "kraft_pouch_sealed",
				chamberPoints,
				operatorStaffFullName: "Смирнова Елена Викторовна",
				headNurseSignatureFullName: "Ковалева Ольга Сергеевна",
				isHeadNurseVerified: true,
			});

			assert.equal(record.status, "sterile_passed");
			assert.equal(record.cycleNumber, 4);
			assert.ok(record.digitalStampHash.startsWith("DENTE-CSO-257-"));
			assert.equal(record.isHeadNurseVerified, true);
		});

		it("exports Form 257/u records to Russian CSV with official columns", () => {
			const chamberPoints = createDefault5ChamberPoints("intetest_v_134_5", true);
			const record = createForm257Record({
				date: "2026-08-22",
				cycleNumber: 1,
				sterilizerId: "autoclave-melag-vacuklav-23b",
				regimeId: "steam_134_5min",
				sensors: {
					actualTemperatureCelsius: 134.0,
					actualPressureBar: 2.1,
					actualExposureMinutes: 5.0,
				},
				itemsDescriptionRu: "Терапевтический набор (зеркало, зонд, пинцет)",
				packsCount: 10,
				packagingType: "kraft_pouch_sealed",
				chamberPoints,
				operatorStaffFullName: "Иванова А.А.",
			});

			const csv = exportForm257ToCsv([record]);
			assert.ok(csv.startsWith("\uFEFF"), "CSV must include UTF-8 BOM for Microsoft Excel");
			assert.ok(csv.includes("Режим стерилизации"));
			assert.ok(csv.includes("MELAG"));
			assert.ok(csv.includes("СТЕРИЛЬНО"));
			assert.ok(csv.includes("Терапевтический набор"));
		});

		it("generates print-ready HTML for Form 257/u with legal stamp", () => {
			const chamberPoints = createDefault5ChamberPoints("intetest_v_134_5", true);
			const record = createForm257Record({
				date: "2026-08-22",
				cycleNumber: 2,
				sterilizerId: "autoclave-euronda-e9-med",
				regimeId: "steam_134_5min",
				sensors: {
					actualTemperatureCelsius: 134.2,
					actualPressureBar: 2.12,
					actualExposureMinutes: 5.0,
				},
				itemsDescriptionRu: "Наконечники турбинные и угловые",
				packsCount: 4,
				packagingType: "kraft_pouch_sealed",
				chamberPoints,
				operatorStaffFullName: "Петрова С.И.",
			});

			const html = generateForm257PrintHtml(
				[record],
				{
					name: "ООО ДЕНТЕ КЛИНИК",
					ogrn: "1234567890123",
					inn: "7701234567",
					address: "г. Москва, ул. Клиническая, д. 10",
					headNurse: "Ковалева О.С.",
					chiefDoctor: "Д-р Марков М.В.",
				},
				"Август 2026",
			);

			assert.ok(html.includes("Форма № 257/у"));
			assert.ok(html.includes("ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ"));
			assert.ok(html.includes("Euronda"));
			assert.ok(html.includes("ООО ДЕНТЕ КЛИНИК"));
		});
	});
});
