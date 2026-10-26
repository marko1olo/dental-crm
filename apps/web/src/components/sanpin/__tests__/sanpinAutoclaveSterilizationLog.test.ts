import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	evaluateCycleParameters,
	evaluate5ChamberPoints,
	createDefault5ChamberPoints,
	checkNextBioControlDeadline,
	createSterilizationLogRecord,
	exportSterilizationLogToCsv,
	generateSterilizationLogPrintHtml,
	generateBatchSterilizationRecords,
} from "../autoclaveLog/autoclaveLogEngine.js";

describe("Журнал контроля автоклавирования и работы стерилизаторов — 1-клик автономия", () => {
	it("1-клик пакетная норма: пустые контрольные точки автоматически принимаются как 100% норма", () => {
		const res = evaluate5ChamberPoints([]);
		assert.equal(res.areAllPointsPassed, true);
		assert.equal(res.passedPointsCount, 5);
		assert.equal(res.failedPointsCount, 0);
		assert.ok(res.summaryRu.includes("СТЕРИЛЬНО"));
	});

	it("создает дефолтные индикаторы смены 134°C со статусом passed без ручного ввода", () => {
		const points = createDefault5ChamberPoints("intetest_v_134_5", true);
		assert.equal(points.length, 5);
		assert.ok(points.every((p) => p.status === "passed"));
		const res = evaluate5ChamberPoints(points);
		assert.equal(res.areAllPointsPassed, true);
	});

	it("валидирует стандартный режим автоклава 134°C, 2.1 бар, 5 мин как СТЕРИЛЬНО", () => {
		const res = evaluateCycleParameters("steam_134_5min", {
			actualTemperatureCelsius: 134.5,
			actualPressureBar: 2.15,
			actualExposureMinutes: 5.0,
		});
		assert.equal(res.isCompliant, true);
		assert.equal(res.failureReasons.length, 0);
	});

	it("отсекает физически невозможные параметры цикла (время <= 0 или температура < 134°C)", () => {
		const resZeroTime = evaluateCycleParameters("steam_134_5min", {
			actualTemperatureCelsius: 134.5,
			actualPressureBar: 2.15,
			actualExposureMinutes: 0,
		});
		assert.equal(resZeroTime.isCompliant, false);

		const resLowTemp = evaluateCycleParameters("steam_134_5min", {
			actualTemperatureCelsius: 130.0,
			actualPressureBar: 2.15,
			actualExposureMinutes: 5.0,
		});
		assert.equal(resLowTemp.isCompliant, false);
	});

	it("формирует запись журнала автоклавирования с цифровым штампом целостности", () => {
		const record = createSterilizationLogRecord({
			date: "2026-10-25",
			cycleNumber: 1,
			sterilizerId: "autoclave-melag-vacuklav-23b",
			regimeId: "steam_134_5min",
			sensors: { actualTemperatureCelsius: 134.5, actualPressureBar: 2.15, actualExposureMinutes: 5.0 },
			itemsDescriptionRu: "Стоматологический инструментарий смены (смотровые, терапия)",
			packsCount: 27,
			packagingType: "kraft_pouch_sealed",
			chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
			operatorStaffFullName: "Медсестра ЦСО",
			isHeadNurseVerified: true,
		});
		assert.equal(record.status, "sterile_passed");
		assert.ok(record.digitalStampHash.startsWith("DENTE-CSO-257-"));
	});

	it("экспортирует журнал в CSV и генерирует чистую печатную HTML форму без канцелярита", () => {
		const record = createSterilizationLogRecord({
			date: "2026-10-25",
			cycleNumber: 1,
			sterilizerId: "autoclave-melag-vacuklav-23b",
			regimeId: "steam_134_5min",
			sensors: { actualTemperatureCelsius: 134.0, actualPressureBar: 2.1, actualExposureMinutes: 5.0 },
			itemsDescriptionRu: "Наборы инструментов",
			packsCount: 20,
			packagingType: "kraft_pouch_sealed",
			chamberPoints: createDefault5ChamberPoints("intetest_v_134_5", true),
			operatorStaffFullName: "Медсестра ЦСО",
		});
		const csv = exportSterilizationLogToCsv([record]);
		assert.ok(csv.includes("MELAG") && csv.includes("СТЕРИЛЬНО"));

		const html = generateSterilizationLogPrintHtml([record]);
		assert.ok(html.includes("ЖУРНАЛ КОНТРОЛЯ РАБОТЫ СТЕРИЛИЗАТОРОВ"));
		assert.ok(html.includes("table-layout: fixed"));
	});

	it("генерирует пакетную запись стерилизации за период", () => {
		const records = generateBatchSterilizationRecords({
			startDate: "2026-10-01",
			endDate: "2026-10-05",
			excludeSundays: true,
			cyclesPerDay: 2,
			packsPerCycle: 10,
		});
		assert.ok(records.length > 0);
		assert.ok(records.every((r) => r.isCyclePassed));
	});

	it("контролирует регулярность биоконтроля автоклава (1 раз в 6 месяцев)", () => {
		const now = new Date("2026-10-25T10:00:00Z");
		const recentStatus = checkNextBioControlDeadline("2026-08-01", now);
		assert.equal(recentStatus.isOverdue, false);
	});
});
