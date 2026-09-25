/**
 * ============================================================================
 * UNIT TESTS: CHAIRSIDE STERILIZATION POUCH ENGINE (СанПиН 3.3686-21)
 * Проверка 1-клик генерации крафт-пакетов «КП-0925-14», контроля индикаторов
 * 4-5 классов (розовый -> коричневый), параметров автоклава B-класса (134°C,
 * 2.1 бар, 5 мин), вставки в дневник 043/у и связи с журналом Формы 257/у.
 * ============================================================================
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	generateChairsidePouchCode,
	normalizeChairsidePouchCode,
	parseChairsidePouchInput,
	createChairsidePouchRecord,
	formatPouch043StatutorySnippet,
	formatPouch043FullDiaryText,
	insertPouchIntoDiaryText,
	createForm257Link,
	exportChairsidePouchToForm257Record,
	STATUTORY_INDICATOR_TRANSITIONS,
	DEFAULT_CHAIRSIDE_AUTOCLAVE_PARAMS,
	CHAIRSIDE_TRAY_PRESETS,
} from "@dental/shared";

describe("ChairsideSterilizationPouchEngine (СанПиН 3.3686-21)", () => {
	// ─── 1. ГЕНЕРАЦИЯ И НОРМАЛИЗАЦИЯ НОМЕРОВ КРАФТ-ПАКЕТОВ ────────────────────
	describe("1. Генерация и нормализация номеров крафт-пакетов", () => {
		it("генерирует стандартный номер пакета в формате «КП-MMDD-NN»", () => {
			const fixedDate = new Date("2026-09-25T10:00:00.000Z");
			const code = generateChairsidePouchCode(fixedDate, 14);
			assert.equal(code, "КП-0925-14");

			const code2 = generateChairsidePouchCode(fixedDate, 1);
			assert.equal(code2, "КП-0925-01");
		});

		it("нормализует латинские префиксы KP в кириллицу КП", () => {
			assert.equal(normalizeChairsidePouchCode("KP-0925-14"), "КП-0925-14");
			assert.equal(normalizeChairsidePouchCode("kp-0925-14"), "КП-0925-14");
			assert.equal(normalizeChairsidePouchCode("  КП-0925-14  "), "КП-0925-14");
		});

		it("преобразует одиночные цифры номера пакета в текущий формат дня", () => {
			const normalized = normalizeChairsidePouchCode("14");
			assert.ok(normalized.startsWith("КП-"));
			assert.ok(normalized.endsWith("-14"));
		});

		it("парсит 2D DataMatrix со структурой СанПиН", () => {
			const matrix = "KB-20260925-01#14|АК-01|CYC2|2026-09-25|2026-11-14|NURSE-01|set_therapeutic_tray";
			const parsed = parseChairsidePouchInput(matrix);
			assert.equal(parsed.pouchCode, "KB-20260925-01-14");
			assert.equal(parsed.detectedAutoclaveCode, "АК-01");
			assert.equal(parsed.detectedCycleNumber, 2);
			assert.equal(parsed.detectedKind, "therapeutic");
			assert.equal(parsed.parsedPackDateIso, "2026-09-25");
		});

		it("парсит 1D штрихкод KB{YYMMDD}{NNNN}", () => {
			const parsed = parseChairsidePouchInput("KB2609250114");
			assert.equal(parsed.pouchCode, "КП-0925-14");
			assert.equal(parsed.detectedCycleNumber, 1);
			assert.equal(parsed.parsedPackDateIso, "2026-09-25");
		});
	});

	// ─── 2. ХИМИЧЕСКИЕ ИНДИКАТОРЫ 4-5 КЛАССОВ (РОЗОВЫЙ -> КОРИЧНЕВЫЙ) ─────────
	describe("2. Контроль химических индикаторов 4-5 классов", () => {
		it("содержит регламентные цветовые переходы индикаторов 4 и 5 классов", () => {
			const class5Steam = STATUTORY_INDICATOR_TRANSITIONS.find((t) => t.id === "pink_to_brown");
			assert.ok(class5Steam);
			assert.equal(class5Steam.indicatorClass, 5);
			assert.equal(class5Steam.initialColorRu, "розовый");
			assert.equal(class5Steam.finalColorRu, "коричневый");
			assert.equal(class5Steam.labelRu, "розовый -> коричневый, стерильно");

			const class4Steam = STATUTORY_INDICATOR_TRANSITIONS.find((t) => t.id === "blue_to_brown");
			assert.ok(class4Steam);
			assert.equal(class4Steam.indicatorClass, 4);
		});

		it("создает запись с активным индикатором 5 класса по умолчанию", () => {
			const record = createChairsidePouchRecord({
				customCode: "КП-0925-14",
				referenceDate: "2026-09-25",
			});

			assert.equal(record.indicator.indicatorClass, 5);
			assert.equal(record.indicator.isPassed, true);
			assert.equal(record.indicator.transitionId, "pink_to_brown");
			assert.ok(record.indicator.colorStatusText.includes("розовый -> коричневый, стерильно"));
		});

		it("формирует статус отбраковки при несработавшем индикаторе", () => {
			const record = createChairsidePouchRecord({
				customCode: "КП-0925-14",
				indicatorPassed: false,
			});

			assert.equal(record.indicator.isPassed, false);
			assert.ok(record.indicator.colorStatusText.includes("НЕ сработал"));
			assert.ok(record.statutoryDiarySnippet.includes("[САНПИН НАРУШЕНИЕ]"));
		});
	});

	// ─── 3. ПАРАМЕТРЫ АВТОКЛАВА B-КЛАССА D-ТИПА (134°C, 2.1 БАР, 5 МИН) ──────
	describe("3. Параметры автоклава B-класса D-типа", () => {
		it("по умолчанию использует режим 134°C, 2.1 бар, экспозиция 5 мин", () => {
			const record = createChairsidePouchRecord({
				customCode: "КП-0925-14",
			});

			assert.equal(record.autoclave.autoclaveCode, "АК-01");
			assert.ok(record.autoclave.autoclaveModel.includes("B-класса D-типа"));
			assert.equal(record.autoclave.temperatureC, 134);
			assert.equal(record.autoclave.pressureBar, 2.1);
			assert.equal(record.autoclave.exposureMinutes, 5);
			assert.ok(record.autoclave.regimeName.includes("134°C, 2.1 бар, экспозиция 5 мин"));
			assert.equal(record.autoclave.shiftName, "Смена 1 (утро)");
			assert.equal(record.autoclave.cycleNumber, 1);
		});

		it("позволяет задать кастомные параметры автоклава (например смена 2, цикл 3)", () => {
			const record = createChairsidePouchRecord({
				customCode: "КП-0925-14",
				autoclaveParams: {
					shiftName: "Смена 2 (вечер)",
					cycleNumber: 3,
					autoclaveCode: "АК-02",
				},
			});

			assert.equal(record.autoclave.shiftName, "Смена 2 (вечер)");
			assert.equal(record.autoclave.cycleNumber, 3);
			assert.equal(record.autoclave.autoclaveCode, "АК-02");
		});
	});

	// ─── 4. ВСТАВКА В ДНЕВНИК КАРТЫ ФОРМЫ 043/У ────────────────────────────────
	describe("4. Вставка регламентной записи в дневник 043/у", () => {
		it("генерирует точный канонический текст по СанПиН для карты 043/у", () => {
			const snippet = formatPouch043StatutorySnippet({
				pouchCode: "КП-0925-14",
				indicatorClass: 5,
				openedInPresenceOfPatient: true,
				isPassed: true,
			});

			assert.equal(
				snippet,
				"Стерильный лоток №КП-0925-14 вскрыт в присутствии пациента, индикатор 5 класса сработал.",
			);
		});

		it("вставляет запись крафт-пакета в существующий дневник приёма", () => {
			const currentDiary = "Препарирование кариозной полости зуба 16. Коффердам, адгезивный протокол.";
			const snippet = "Стерильный лоток №КП-0925-14 вскрыт в присутствии пациента, индикатор 5 класса сработал.";

			const updated = insertPouchIntoDiaryText(currentDiary, snippet, "КП-0925-14");
			assert.ok(updated.startsWith(snippet));
			assert.ok(updated.includes(currentDiary));
		});

		it("не дублирует запись, если крафт-пакет уже внесен в дневник", () => {
			const currentDiary = "Стерильный лоток №КП-0925-14 вскрыт в присутствии пациента, индикатор 5 класса сработал.\n\nЛечение кариеса.";
			const snippet = "Стерильный лоток №КП-0925-14 вскрыт в присутствии пациента, индикатор 5 класса сработал.";

			const result = insertPouchIntoDiaryText(currentDiary, snippet, "КП-0925-14");
			assert.equal(result, currentDiary);
		});
	});

	// ─── 5. СВЯЗЬ С ЭЛЕКТРОННЫМ ЖУРНАЛОМ АВТОКЛАВИРОВАНИЯ (ФОРМА № 257/У) ───────
	describe("5. Связь с электронным журналом автоклавирования (Форма № 257/у)", () => {
		it("создает ссылку с криптографическим штампом и ID записи Формы 257/у", () => {
			const link = createForm257Link("КП-0925-14", {
				...DEFAULT_CHAIRSIDE_AUTOCLAVE_PARAMS,
				dateIso: "2026-09-25",
				cycleNumber: 1,
				autoclaveCode: "АК-01",
			});

			assert.equal(link.isLinked, true);
			assert.equal(link.recordId, "F257-20260925-АК01-C01");
			assert.ok(link.digitalStampHash.startsWith("DENTE-CSO-257-"));
			assert.ok(link.sanpinClauseRu.includes("СанПиН 3.3686-21"));
		});

		it("экспортирует крафт-пакет в полноценную запись журнала Формы 257/у", () => {
			const record = createChairsidePouchRecord({
				customCode: "КП-0925-14",
				referenceDate: "2026-09-25",
			});

			const form257 = exportChairsidePouchToForm257Record(record);
			assert.equal(form257.id, "F257-20260925-АК01-C01");
			assert.equal(form257.cycleNumber, 1);
			assert.equal(form257.actualTemperatureCelsius, 134);
			assert.equal(form257.actualPressureBar, 2.1);
			assert.equal(form257.actualExposureMinutes, 5);
			assert.equal(form257.isCyclePassed, true);
			assert.equal(form257.chamberPoints.length, 5);
			assert.equal(form257.areAllPointsPassed, true);
			assert.ok(form257.notes?.includes("КП-0925-14"));
		});
	});

	// ─── 6. ПРЕСЕТЫ ЛОТКОВ И СРОКИ ГОДНОСТИ ─────────────────────────────────────
	describe("6. Пресеты лотков и нормативные сроки годности СанПиН", () => {
		it("содержит стандартные пресеты (терапевтический, хирургический, эндо)", () => {
			assert.equal(CHAIRSIDE_TRAY_PRESETS.length, 4);
			const therapy = CHAIRSIDE_TRAY_PRESETS.find((p) => p.trayKind === "therapeutic");
			assert.ok(therapy);
			assert.equal(therapy.shelfLifeDays, 50);

			const surgery = CHAIRSIDE_TRAY_PRESETS.find((p) => p.trayKind === "surgical");
			assert.ok(surgery);
			assert.equal(surgery.shelfLifeDays, 60);

			const endo = CHAIRSIDE_TRAY_PRESETS.find((p) => p.trayKind === "endodontic");
			assert.ok(endo);
			assert.equal(endo.shelfLifeDays, 180);
		});

		it("рассчитывает срок годности крафт-пакета (50 суток для терапии)", () => {
			const record = createChairsidePouchRecord({
				customCode: "КП-0925-14",
				trayKind: "therapeutic",
				referenceDate: "2026-09-25",
			});

			assert.equal(record.packDateIso, "2026-09-25");
			assert.equal(record.expDateIso, "2026-11-14"); // 25.09 + 50 дней = 14.11
			assert.equal(record.daysRemaining, 50);
			assert.equal(record.isExpired, false);
		});
	});
});
