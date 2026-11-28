/**
 * apps/web/src/components/sanpin/__tests__/batchAutoclaveShiftAndStock.test.ts
 *
 * БОЕВОЙ RED TEAM ТЕСТ ПАКЕТНОГО АВТОКЛАВИРОВАНИЯ И СПИСАНИЯ СО СКЛАДА
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	STATUTORY_REGIMES_OPTIONS,
	INITIAL_5_POINTS,
} from "../sterilizationModules";
import { SANPIN_CANONICAL_TABS } from "../sanpinNavigationConfig";
import { SANPIN_REGISTERS_TOAST_MESSAGES } from "../sanpinToastMessages";
import { calculateBatchStockDeduction, createOneClickShiftBatch } from "../sanpinCatalogData";
import { SanpinRegisters } from "../SanpinRegisters";
import { SanPinSterilizationJournal } from "../SanPinSterilizationJournal";
import { CleaningControlTab } from "../CleaningControlTab";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

describe("Пакетная стерилизация смены и автоматическое списание со склада (Мандаты 8b, 8e, 8n, 8x)", () => {
	describe("1. Пакетная фиксация рабочего цикла автоклавирования в 1 клик", () => {
		it("содержит утвержденный паровой режим 134°C / 2.1 бар / 5 мин (Класс B)", () => {
			const standard134 = STATUTORY_REGIMES_OPTIONS.find((r) => r.targetTemperature === 134 && r.exposureMinutes === 5);
			assert.ok(standard134);
			assert.equal(standard134.targetTemperature, 134);
			assert.ok(standard134.targetPressure >= 2.0 && standard134.targetPressure <= 2.2);
			assert.equal(standard134.exposureMinutes, 5);
		});

		it("поддерживает щадящий режим 121°C / 1.1 бар / 20 мин для оптики и полимеров", () => {
			const delicate121 = STATUTORY_REGIMES_OPTIONS.find((r) => r.targetTemperature === 121 && r.exposureMinutes === 20);
			assert.ok(delicate121);
			assert.equal(delicate121.targetTemperature, 121);
			assert.ok(delicate121.targetPressure >= 1.0 && delicate121.targetPressure <= 1.25);
			assert.equal(delicate121.exposureMinutes, 20);
		});

		it("предоставляет контрольные точки камеры КТ-1..КТ-5 с нормой по умолчанию", () => {
			assert.equal(INITIAL_5_POINTS.length, 5);
			for (const pt of INITIAL_5_POINTS) {
				assert.equal(pt.passed, true);
			}
		});
	});

	describe("2. Пакетное списание расходников со склада (Soft Negative Stock, Мандат 8n)", () => {
		it("автоматически рассчитывает списание пакетов и индикаторов 5 класса на цикл", () => {
			const deductionSpec = calculateBatchStockDeduction(27);
			const kraft = deductionSpec.find((d) => d.sku === "KRAFT-100X200");
			const indicator = deductionSpec.find((d) => d.sku === "IND-CLASS5-MEDIS");

			assert.equal(kraft?.quantity, 27);
			assert.equal(indicator?.quantity, 7);
			assert.equal(deductionSpec.length, 4);
		});

		it("формирует полный пакет смены (цикл + ПСО + УФ + списание) без блокировок при малых партиях", () => {
			const batch = createOneClickShiftBatch({ packagesCount: 27, programId: "standard_134" });
			assert.equal(batch.sterilizationCycle.packagesCount, 27);
			assert.equal(batch.sterilizationCycle.temperatureCelsius, 134);
			assert.equal(batch.psoRecord.verdict, "ГОДНО");
			assert.equal(batch.psoRecord.testedItemsCount, 3);
			assert.equal(batch.deductedStock[0]?.quantity, 27);
		});
	});

	describe("3. Чистота терминологии и рендер без блокировок (Мандат 8e, 8x)", () => {
		it("канонические разделы СанПиН используют живой клинический язык", () => {
			const tabIds = SANPIN_CANONICAL_TABS.map((t) => t.id);
			assert.deepEqual(tabIds, ["autoclave", "pso", "disinfection", "waste", "sterilizers"]);

			for (const tab of SANPIN_CANONICAL_TABS) {
				assert.ok(!tab.label.includes("257/у"));
				assert.ok(!tab.label.includes("366/у"));
				assert.ok(!tab.shortLabel.includes("257/у"));
				assert.ok(!tab.shortLabel.includes("366/у"));
			}
		});

		it("сообщения и тосты не содержат советских номеров форм", () => {
			for (const msg of Object.values(SANPIN_REGISTERS_TOAST_MESSAGES)) {
				assert.ok(!msg.includes("257/у"));
				assert.ok(!msg.includes("366/у"));
			}
		});

		it("ключевые экраны СанПиН рендерятся с 0 disabled-кнопок и 0 эмодзи", () => {
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			const screens = [
				renderToStaticMarkup(React.createElement(SanpinRegisters)),
				renderToStaticMarkup(React.createElement(SanPinSterilizationJournal)),
				renderToStaticMarkup(React.createElement(CleaningControlTab)),
			];
			for (const html of screens) {
				assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
				assert.equal(emojiRegex.test(html.replace(/[✓✕•→]/g, "")), false);
			}
		});
	});
});
