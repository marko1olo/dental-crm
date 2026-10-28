/**
 * apps/web/src/components/sanpin/__tests__/sanpinSsotThreeComponents.test.tsx
 *
 * RED TEAM ИНКВИЗИТОРСКИЙ ТЕСТ-СЮИТ ДЛЯ 3 SSOT ЭКРАНОВ САНПИН И СТЕРИЛИЗАЦИИ:
 * 1. SterilizationBatchCycleModal.tsx (250–350L)
 * 2. AutoclaveSterilizationJournalView.tsx (280–380L)
 * 3. SanpinCleaningAndDisinfectionView.tsx (250–350L)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SterilizationBatchCycleModal } from "../SterilizationBatchCycleModal";
import { AutoclaveSterilizationJournalView } from "../AutoclaveSterilizationJournalView";
import { SanpinCleaningAndDisinfectionView } from "../SanpinCleaningAndDisinfectionView";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SANPIN_DIR = path.resolve(__dirname, "..");

describe("ДОМЕН 2: САНПИН, СТЕРИЛИЗАЦИЯ И ЖУРНАЛЫ АВТОКЛАВИРОВАНИЯ (3 SSOT ЭКРАНА)", () => {
	describe("1. Золотой стандарт размера файлов (Мандат 8b Sweet Spot)", () => {
		it("SterilizationBatchCycleModal укладывается в диапазон 250–350 строк", () => {
			const filePath = path.join(SANPIN_DIR, "SterilizationBatchCycleModal.tsx");
			assert.ok(fs.existsSync(filePath), "SterilizationBatchCycleModal.tsx обязан существовать");
			const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 220 && lines <= 360,
				`SterilizationBatchCycleModal.tsx (${lines} строк) должен быть около 250–350 строк`,
			);
		});

		it("AutoclaveSterilizationJournalView укладывается в диапазон 280–380 строк", () => {
			const filePath = path.join(SANPIN_DIR, "AutoclaveSterilizationJournalView.tsx");
			assert.ok(fs.existsSync(filePath), "AutoclaveSterilizationJournalView.tsx обязан существовать");
			const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 250 && lines <= 390,
				`AutoclaveSterilizationJournalView.tsx (${lines} строк) должен быть около 280–380 строк`,
			);
		});

		it("SanpinCleaningAndDisinfectionView укладывается в диапазон 250–350 строк", () => {
			const filePath = path.join(SANPIN_DIR, "SanpinCleaningAndDisinfectionView.tsx");
			assert.ok(fs.existsSync(filePath), "SanpinCleaningAndDisinfectionView.tsx обязан существовать");
			const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 240 && lines <= 360,
				`SanpinCleaningAndDisinfectionView.tsx (${lines} строк) должен быть около 250–350 строк`,
			);
		});
	});

	describe("2. SterilizationBatchCycleModal (Запуск цикла стерилизации в 1 клик)", () => {
		it("рендерит заголовок, выбор программ (134°C и 121°C), авто-списание и Primary CTA", () => {
			const html = renderToStaticMarkup(
				<SterilizationBatchCycleModal isOpen={true} onClose={() => {}} />,
			);

			assert.ok(html.includes("Запустить цикл стерилизации"), "Заголовок окна");
			assert.ok(html.includes("Основной автоклав клиники"), "Дефолтный автоклав");
			assert.ok(html.includes("134°C • Стандартная"), "Программа 134°C");
			assert.ok(html.includes("121°C • Бережная"), "Программа 121°C");
			assert.ok(html.includes("Химический индикатор 5 класса: Пройден"), "Хим. индикатор 5 класса норма");
			assert.ok(html.includes("Будет списано со склада"), "Авто-списание со склада");
			assert.ok(html.includes('data-testid="confirm-sterilization-cycle-btn"'), "Primary CTA кнопка");
			assert.ok(!html.includes('disabled=""'), "Никаких disabled на кнопках (Мандат 8e)");
		});
	});

	describe("3. AutoclaveSterilizationJournalView (Электронный журнал циклов)", () => {
		it("рендерит десктопную таблицу с колонками и мобильный адаптивный слой", () => {
			const html = renderToStaticMarkup(<AutoclaveSterilizationJournalView />);

			assert.ok(html.includes("autoclave-journal-view"), "Контейнер журнала");
			assert.ok(html.includes("autoclave-desktop-table"), "Десктопная таблица");
			assert.ok(html.includes("autoclave-mobile-cards"), "Мобильный слой карточек");
			assert.ok(html.includes('data-testid="start-cycle-primary-btn"'), "Primary CTA кнопка запуска");
			assert.ok(html.includes("sanpin-mobile-start-cycle-cta"), "Floating Bottom Bar для смартфонов");
			assert.ok(html.includes("overflow-x-clip"), "0px паразитного горизонтального скролла");
			assert.ok(!html.includes("Форма 257/у"), "Запрещен советский канцелярит 257/у");
		});
	});

	describe("4. SanpinCleaningAndDisinfectionView (Очистка, уборка и бактерицидные лампы)", () => {
		it("рендерит 3 подраздела и 1-клик фиксацию норм", () => {
			const html = renderToStaticMarkup(<SanpinCleaningAndDisinfectionView />);

			assert.ok(html.includes("sanpin-cleaning-view"), "Корневой контейнер");
			assert.ok(html.includes("Контроль очистки"), "Подраздел контроля очистки");
			assert.ok(html.includes("Журнал уборок"), "Подраздел уборок");
			assert.ok(html.includes("Бактерицидные лампы"), "Подраздел ламп");
			assert.ok(html.includes("Азопирамовая проба"), "Азопирамовая проба");
			assert.ok(html.includes("Зафиксировать пробу (100% норма)"), "1-клик фиксация нормы");
			assert.ok(!html.includes("МУ-287-113"), "Запрещен советский канцелярит МУ-287-113");
			assert.ok(!html.includes("Форма 366/у"), "Запрещен советский канцелярит 366/у");
		});
	});
});
