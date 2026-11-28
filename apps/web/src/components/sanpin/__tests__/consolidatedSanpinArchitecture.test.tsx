/**
 * apps/web/src/components/sanpin/__tests__/consolidatedSanpinArchitecture.test.tsx
 *
 * RED TEAM ИНКВИЗИТОРСКИЙ СЮИТ КОНСОЛИДИРОВАННОЙ АРХИТЕКТУРЫ СТЕРИЛИЗАЦИИ
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SanPinSterilizationJournal } from "../SanPinSterilizationJournal";
import { CleaningControlTab } from "../CleaningControlTab";
import { UvAndCleaningTab } from "../UvAndCleaningTab";
import { MedicalWasteRegisterTab } from "../MedicalWasteRegisterTab";
import { SterilizerFleetManager } from "../SterilizerFleetManager";
import { SanpinRegisters } from "../SanpinRegisters";
import { SANPIN_CANONICAL_TABS } from "../sanpinNavigationConfig";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

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
				assert.ok(tab);
				assert.equal(tab.label, exp.label);
				assert.ok(!tab.label.includes("257/у"));
				assert.ok(!tab.label.includes("366/у"));
			}
		});

		it("рендер всех вкладок свободен от бюрократического мусора и мультяшных эмодзи", () => {
			const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
			const screens = [
				renderToStaticMarkup(<SanPinSterilizationJournal />),
				renderToStaticMarkup(<CleaningControlTab />),
				renderToStaticMarkup(<UvAndCleaningTab />),
				renderToStaticMarkup(<MedicalWasteRegisterTab />),
				renderToStaticMarkup(<SterilizerFleetManager />),
				renderToStaticMarkup(<SanpinRegisters />),
			];

			for (const html of screens) {
				assert.equal(html.includes("Форма № 257/у"), false);
				assert.equal(html.includes("Форма № 366/у"), false);
				assert.equal(emojiRegex.test(html.replace(/[✓✕•→]/g, "")), false);
			}
		});
	});

	describe("2. Единый дизайн-код: ровно 1 Primary CTA (Мандат 8am)", () => {
		it("SanPinSterilizationJournal рендерит Primary CTA кнопку «Запустить цикл стерилизации»", () => {
			const html = renderToStaticMarkup(<SanPinSterilizationJournal />);
			assert.ok(html.includes("Запустить цикл стерилизации"));
			assert.ok(html.includes('data-testid="start-cycle-primary-btn"'));
			assert.ok(html.includes("var(--primary)") || html.includes("bg-[var(--primary)]"));
		});

		it("CleaningControlTab рендерит фиксацию пробы очистки без инлайн <style> тега (P2-1.2)", () => {
			const html = renderToStaticMarkup(<CleaningControlTab />);
			assert.ok(html.includes("Контроль очистки инструментов"));
			assert.ok(html.includes("Зафиксировать пробу (100% норма)"));
			assert.ok(html.includes('data-testid="pso-quick-mark-shift-btn"'));
			assert.equal(html.includes("<style>"), false, "Must not inject inline <style> tag");
		});

		it("UvAndCleaningTab рендерит подразделы учета ламп, уборок и готовности", () => {
			const html = renderToStaticMarkup(<UvAndCleaningTab />);
			assert.ok(html.includes("Бактерицидные лампы"));
			assert.ok(html.includes("Журнал уборок"));
			assert.ok(html.includes("Готовность кабинетов"));
		});

		it("MedicalWasteRegisterTab рендерит учет отходов классов А и Б", () => {
			const html = renderToStaticMarkup(<MedicalWasteRegisterTab />);
			assert.ok(html.includes("УТИЛИЗАЦИЯ ОТХОДОВ") || html.includes("Учет образования"));
		});
	});

	describe("3. Мобильная эргономика и автономия (Apple HIG & Мандат 8e)", () => {
		it("SanPinSterilizationJournal содержит мобильное представление с 0px overflow", () => {
			const html = renderToStaticMarkup(<SanPinSterilizationJournal />);
			assert.ok(html.includes("autoclave-mobile-view"));
			assert.ok(html.includes("overflow-x-clip"));
			assert.ok(html.includes("sanpin-mobile-start-cycle-cta"));
		});

		it("CleaningControlTab адаптируется к смартфонам без инлайн style и горизонтального скролла", () => {
			const origWindow = globalThis.window;
			Object.defineProperty(globalThis, "window", {
				value: {
					innerWidth: 390,
					addEventListener: () => {},
					removeEventListener: () => {},
					matchMedia: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
				},
				writable: true,
				configurable: true,
			});
			try {
				const html = renderToStaticMarkup(<CleaningControlTab />);
				assert.ok(html.includes("cleaning-control-tab"));
				assert.ok(html.includes("pso-mobile-start-cta") || html.includes("cleaning-mobile-view"));
				assert.equal(html.includes("<style>"), false);
			} finally {
				Object.defineProperty(globalThis, "window", { value: origWindow, writable: true, configurable: true });
			}
		});

		it("SanpinRegisters монтирует все вкладки без disabled-кнопок", () => {
			const html = renderToStaticMarkup(<SanpinRegisters />);
			assert.ok(html.includes("sanpin-container"));
			assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
		});
	});
});
