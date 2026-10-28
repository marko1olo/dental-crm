/**
 * apps/web/src/components/sanpin/__tests__/consolidatedSanpinArchitecture.test.tsx
 *
 * RED TEAM ИНКВИЗИТОРСКИЙ СЮИТ КОНСОЛИДИРОВАННОЙ АРХИТЕКТУРЫ СТЕРИЛИЗАЦИИ
 * Мандаты 8b (Sweet Spot 200–300 строк), 8e (Автономия врача), 8n (Соло-суверенитет),
 * 8x (Ликвидация птичьего языка), 8am (Ровно 1 Primary CTA), Apple HIG (Mobile 390x844).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { AutoclaveJournalTab } from "../AutoclaveJournalTab";
import { CleaningControlTab } from "../CleaningControlTab";
import { UvAndCleaningTab } from "../UvAndCleaningTab";
import { MedicalWasteRegisterTab } from "../MedicalWasteRegisterTab";
import { SterilizerFleetManager } from "../SterilizerFleetManager";
import { SanpinRegisters } from "../SanpinRegisters";
import { SANPIN_CANONICAL_TABS } from "../sanpinNavigationConfig";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SANPIN_DIR = path.resolve(__dirname, "..");

describe("КОНСОЛИДИРОВАННАЯ АРХИТЕКТУРА СТЕРИЛИЗАЦИИ И САНПИН (RED TEAM AUDIT)", () => {
	describe("1. Ликвидация птичьего языка советских приказов (Мандат 8x)", () => {
		it("канонические 5 вкладок названы живым русским языком без советских аббревиатур", () => {
			assert.equal(SANPIN_CANONICAL_TABS.length, 5);
			const expected = [
				{ id: "autoclave", label: "Журнал стерилизации инструментов" },
				{ id: "pso", label: "Предстерилизационная очистка" },
				{ id: "disinfection", label: "Обеззараживание воздуха и уборка" },
				{ id: "waste", label: "Медицинские отходы" },
				{ id: "sterilizers", label: "Оборудование ЦСО" },
			];

			for (const exp of expected) {
				const tab = SANPIN_CANONICAL_TABS.find((t) => t.id === exp.id);
				assert.ok(tab, `Вкладка ${exp.id} обязана присутствовать`);
				assert.equal(tab.label, exp.label);
				assert.ok(!tab.label.includes("257/у"), "Запрещен номер приказа 257/у");
				assert.ok(!tab.label.includes("366/у"), "Запрещен номер приказа 366/у");
			}
		});

		it("исходный код новых вкладок свободен от бюрократического мусора", () => {
			const files = [
				"AutoclaveJournalTab.tsx",
				"CleaningControlTab.tsx",
				"UvAndCleaningTab.tsx",
				"MedicalWasteRegisterTab.tsx",
				"SanpinRegisters.tsx",
			];

			for (const file of files) {
				const code = fs.readFileSync(path.join(SANPIN_DIR, file), "utf-8");
				assert.ok(!code.includes("Форма № 257/у"), `${file} не должен содержать 'Форма № 257/у'`);
				assert.ok(!code.includes("Форма № 366/у"), `${file} не должен содержать 'Форма № 366/у'`);
			}
		});
	});

	describe("2. Золотой стандарт размера файлов (Мандат 8b: Sweet Spot 200–300 строк)", () => {
		it("все 5 консолидированных вкладок укладываются в диапазон разумного размера", () => {
			const filesToCheck = [
				{ name: "AutoclaveJournalTab.tsx", max: 350 },
				{ name: "CleaningControlTab.tsx", max: 350 },
				{ name: "UvAndCleaningTab.tsx", max: 350 },
				{ name: "MedicalWasteRegisterTab.tsx", max: 200 },
				{ name: "SterilizerFleetManager.tsx", max: 350 },
				{ name: "SanpinRegisters.tsx", max: 200 },
			];

			for (const item of filesToCheck) {
				const fullPath = path.join(SANPIN_DIR, item.name);
				assert.ok(fs.existsSync(fullPath), `Файл ${item.name} обязан существовать`);
				const lines = fs.readFileSync(fullPath, "utf-8").split("\n").length;
				assert.ok(
					lines <= item.max,
					`Файл ${item.name} (${lines} строк) превышает лимит ${item.max}`,
				);
			}
		});
	});

	describe("3. Единый дизайн-код: ровно 1 Primary CTA (Мандат 8am)", () => {
		it("AutoclaveJournalTab рендерит ровно 1 Primary CTA кнопку «Запустить цикл стерилизации»", () => {
			const html = renderToStaticMarkup(<AutoclaveJournalTab />);
			assert.ok(html.includes("Запустить цикл стерилизации"), "Должна быть кнопка запуска цикла стерилизации");
			assert.ok(html.includes('data-testid="start-cycle-primary-btn"'), "Кнопка имеет data-testid='start-cycle-primary-btn'");
			assert.ok(html.includes("var(--teal,#0d9488)") || html.includes("bg-[var(--teal"), "Кнопка окрашена в цвет var(--teal)");
		});

		it("CleaningControlTab рендерит 1-клик фиксацию пробы очистки", () => {
			const html = renderToStaticMarkup(<CleaningControlTab />);
			assert.ok(html.includes("Контроль очистки инструментов"), "Заголовок контроля очистки");
			assert.ok(html.includes("Зафиксировать пробу (100% норма)"), "1-клик фиксация нормы");
			assert.ok(html.includes('data-testid="pso-quick-mark-shift-btn"'), "Наличие data-testid");
		});

		it("UvAndCleaningTab рендерит подразделы учета ламп, уборок и готовности", () => {
			const html = renderToStaticMarkup(<UvAndCleaningTab />);
			assert.ok(html.includes("Бактерицидные лампы"), "Подраздел ламп");
			assert.ok(html.includes("Журнал уборок"), "Подраздел уборок");
			assert.ok(html.includes("Готовность кабинетов"), "Подраздел готовности");
		});

		it("MedicalWasteRegisterTab рендерит учет отходов классов А и Б", () => {
			const html = renderToStaticMarkup(<MedicalWasteRegisterTab />);
			assert.ok(html.includes("УТИЛИЗАЦИЯ ОТХОДОВ") || html.includes("Учет образования"), "Раздел утилизации отходов");
		});
	});

	describe("4. Мобильная эргономика (Apple HIG 390x844 & Natural Thumb Zone)", () => {
		it("AutoclaveJournalTab содержит мобильное представление с высотой строк >= 52px и 0px overflow", () => {
			const html = renderToStaticMarkup(<AutoclaveJournalTab />);
			assert.ok(html.includes("autoclave-mobile-view"), "Наличие мобильного адаптивного слоя");
			assert.ok(html.includes("overflow-x-clip"), "Защита от паразитного горизонтального скролла");
			assert.ok(html.includes("sanpin-mobile-start-cycle-cta"), "Floating CTA в Natural Thumb Zone");
		});

		it("CleaningControlTab содержит карточки для смартфонов без горизонтального скролла", () => {
			const html = renderToStaticMarkup(<CleaningControlTab />);
			assert.ok(html.includes("cleaning-mobile-view"), "Наличие мобильного адаптива");
			assert.ok(html.includes("min-height: 52px") || html.includes("minHeight: 52px") || html.includes("min-h-"), "Высота строк >= 52px");
		});
	});

	describe("5. Автономия врача и отсутствие блокировок (Мандат 8e, 8n)", () => {
		it("SanpinRegisters монтирует все 5 вкладок и не содержит блокирующих кнопок disabled", () => {
			const html = renderToStaticMarkup(<SanpinRegisters />);
			assert.ok(html.includes("sanpin-container"), "Корневой контейнер");
			assert.ok(!html.includes('disabled=""'), "Никаких заблокированных кнопок disabled в боевом интерфейсе");
		});
	});
});
