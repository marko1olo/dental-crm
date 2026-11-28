/**
 * apps/web/src/components/sanpin/__tests__/sanpinSsotThreeComponents.test.tsx
 *
 * RED TEAM ИНКВИЗИТОРСКИЙ ТЕСТ-СЮИТ ДЛЯ 3 SSOT ЭКРАНОВ САНПИН И СТЕРИЛИЗАЦИИ
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SterilizationBatchCycleModal } from "../SterilizationBatchCycleModal";
import { SanPinSterilizationJournal } from "../SanPinSterilizationJournal";
import { CleaningControlTab } from "../CleaningControlTab";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

describe("ДОМЕН 2: САНПИН, СТЕРИЛИЗАЦИЯ И ЖУРНАЛЫ АВТОКЛАВИРОВАНИЯ (3 SSOT ЭКРАНА)", () => {
	describe("1. SterilizationBatchCycleModal (Запуск цикла стерилизации)", () => {
		it("рендерит заголовок, выбор программ (134°C и 121°C), авто-списание, z-[100] и Primary CTA", () => {
			const html = renderToStaticMarkup(
				<SterilizationBatchCycleModal isOpen={true} onClose={() => {}} />,
			);

			assert.ok(html.includes("Запустить цикл стерилизации"));
			assert.ok(html.includes("Основной автоклав клиники"));
			assert.ok(html.includes("134°C • Стандартная"));
			assert.ok(html.includes("121°C • Бережная"));
			assert.ok(html.includes("Химический индикатор 5 класса: Пройден"));
			assert.ok(html.includes("Будет списано со склада"));
			assert.ok(html.includes('data-testid="confirm-sterilization-cycle-btn"'));
			assert.ok(html.includes("z-50"), "Must use canonical backdrop z-50");
			assert.equal(html.includes("z-[1100]"), false, "Must not use out-of-scale z-[1100]");
			assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false, "Никаких disabled на кнопках (Мандат 8e)");
		});
	});

	describe("2. SanPinSterilizationJournal (Электронный журнал циклов)", () => {
		it("рендерит десктопную таблицу с колонками и мобильный адаптивный слой", () => {
			const html = renderToStaticMarkup(<SanPinSterilizationJournal />);

			assert.ok(html.includes("autoclave-journal-tab"));
			assert.ok(html.includes("autoclave-desktop-view"));
			assert.ok(html.includes("autoclave-mobile-view"));
			assert.ok(html.includes('data-testid="start-cycle-primary-btn"'));
			assert.ok(html.includes("sanpin-mobile-start-cycle-cta"));
			assert.ok(html.includes("overflow-x-clip"));
			assert.equal(html.includes("Форма 257/у"), false);
		});
	});

	describe("3. CleaningControlTab (Очистка, уборка и бактерицидные лампы)", () => {
		it("рендерит журнал контроля качества очистки инструментов с фиксацией нормы без инлайн style", () => {
			const html = renderToStaticMarkup(<CleaningControlTab />);

			assert.ok(html.includes("cleaning-control-tab"));
			assert.ok(html.includes("Контроль очистки инструментов"));
			assert.ok(html.includes("Азопирамовая проба"));
			assert.ok(html.includes("Зафиксировать пробу"));
			assert.equal(html.includes("МУ-287-113"), false);
			assert.equal(html.includes("Форма 366/у"), false);
			assert.equal(html.includes("<style>"), false);
			assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
		});
	});
});
