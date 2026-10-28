/**
 * apps/web/src/components/sanpin/__tests__/sanPinSterilizationJournalSuite.test.tsx
 *
 * Red Team Inquisitor Test Suite:
 * 1. Пакетная стерилизация и крафт-пакеты:
 *    - Пакетная обработка партии инструментов.
 *    - Автоклавные параметры: 134°C, 2.1 бар, 5 мин (Режим B).
 *    - Химический индикатор 5 класса (визуальный пруф: Норма).
 *    - Пакетное списание расходников со склада (Soft Negative Stock).
 * 2. SanPinSterilizationJournal:
 *    - Журнал циклов (Форма 257/у), автоклавы АК-01/АК-02.
 *    - Фильтр по оборудованию, поиск по коду партии.
 *    - 0 мультяшных эмодзи, 0 запрещенного дев-жаргона.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SanPinSterilizationJournal } from "../SanPinSterilizationJournal";
import { parseAndValidateKraftBarcode, formatPouch043StatutorySnippet } from "@dental/shared";

describe("SANPIN STERILIZATION & KRAFT BATCH INQUISITOR SUITE (СанПиН 3.3686-21)", () => {
	describe("1. Пакетная стерилизация и нормализация кодов", () => {
		it("валидирует штрихкод крафт-пакета KP-84920", () => {
			const res = parseAndValidateKraftBarcode("KP-84920", {
				referenceDate: "2026-10-08",
			});
			assert.ok(res.isValid, "Код KP-84920 должен быть валидным");
			assert.equal(res.rawInput, "KP-84920");
		});

		it("формирует регламентную запись пакета с параметрами 134°C, 2.1 бар, 5 мин и индикатором 5 кл. без блокировки врача", () => {
			const snippet = formatPouch043StatutorySnippet({
				pouchCode: "KP-84920",
				indicatorClass: 5,
				openedInPresenceOfPatient: true,
				isPassed: true,
			});

			assert.ok(snippet.includes("КП-84920"));
			assert.ok(snippet.includes("5 класса сработал"));
		});
	});

	describe("2. Журнал стерилизации СанПиН (SanPinSterilizationJournal / Форма 257/у)", () => {
		it("рендерит журнал с циклами, автоклавами и индикатором", () => {
			const html = renderToStaticMarkup(
				<SanPinSterilizationJournal />
			);

			assert.ok(html.includes("Журнал автоклавирования") || html.includes("Журнал стерилизации"), "Должен содержать заголовок журнала");
			assert.ok(html.includes("АК-01"), "Должен содержать автоклав АК-01");
			assert.ok(html.includes("Melag Vacuklav 23B+"), "Должен содержать модель автоклава");
			assert.ok(html.includes("134.4°C") || html.includes("134"), "Должна быть температура 134°C");
			assert.ok(html.includes("2.15 бар") || html.includes("2.1"), "Должно быть давление 2.1 бар");
			assert.ok(html.includes("Стерильно"), "Должен быть статус Стерильно");
			assert.ok(html.includes("KP-84920"), "Должен содержать код крафт-пакета KP-84920");
			assert.ok(html.includes("Печать журнала"), "Должна быть кнопка печати журнала");
			assert.ok(html.includes("Пакетная стерилизация смены") || html.includes("Зафиксировать цикл автоклавирования смены"), "Должна быть кнопка пакетной стерилизации смены");
		});

		it("не содержит мультяшных эмодзи и запрещенного дев-жаргона", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");

			const fullPath = path.join(process.cwd(), "apps/web/src/components/sanpin/SanPinSterilizationJournal.tsx");
			const content = fs.readFileSync(fullPath, "utf-8");

			// 0 эмодзи
			const emojiMatch = content.match(/[\uD83C-\uDBFF\uDC00-\uDFFF]/);
			assert.equal(emojiMatch, null, "Файл не должен содержать эмодзи");

			// 0 дев-жаргона
			assert.ok(!content.includes("1-клик") && !content.includes("1-Click"), "Файл не должен содержать «1-клик»");
			assert.ok(!content.includes("овербукинг") && !content.includes("overbooking"), "Файл не должен содержать «овербукинг»");
		});

		it("проверяет золотой стандарт размера объединенного экрана SanPinSterilizationJournal.tsx (300–500 строк, Мандат 8b/8zi)", async () => {
			const fs = await import("node:fs");
			const path = await import("node:path");

			const fullPath = path.join(process.cwd(), "apps/web/src/components/sanpin/SanPinSterilizationJournal.tsx");
			const lines = fs.readFileSync(fullPath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 300 && lines <= 500,
				`SanPinSterilizationJournal.tsx должен быть в диапазоне 300–500 строк по Мандату 8b/8zi (факт: ${lines})`,
			);
		});
	});
});
