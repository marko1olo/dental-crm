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
	detectMissingSterilizationDays,
} from "../autoclaveLog/autoclaveLogEngine.js";

describe("Журнал автоклавирования — 1-клик пакетная обработка смены", () => {
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
		const record = createForm257Record({
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
		const record = createForm257Record({
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
		const csv = exportForm257ToCsv([record]);
		assert.ok(csv.includes("MELAG") && csv.includes("СТЕРИЛЬНО"));

		const html = generateForm257PrintHtml([record]);
		assert.ok(html.includes("ЖУРНАЛ АВТОКЛАВИРОВАНИЯ И СТЕРИЛИЗАЦИИ"));
		assert.ok(html.includes("table-layout: fixed"));
	});

	it("контролирует регулярность биоконтроля автоклава (1 раз в 6 месяцев)", () => {
		const now = new Date("2026-10-25T10:00:00Z");
		const recentStatus = checkNextBioControlDeadline("2026-08-01", now);
		assert.equal(recentStatus.isOverdue, false);

		const overdueStatus = checkNextBioControlDeadline("2025-10-01", now);
		assert.equal(overdueStatus.isOverdue, true);
	});

	it("детектирует пропущенные дни автоклавирования при наличии приемов пациентов", () => {
		const audit = detectMissingSterilizationDays([{ date: "2026-10-24" }], ["2026-10-24", "2026-10-25"]);
		assert.equal(audit.isMissingAutoclaveLog, true);
		assert.deepEqual(audit.missingDates, ["2026-10-25"]);
	});
});
