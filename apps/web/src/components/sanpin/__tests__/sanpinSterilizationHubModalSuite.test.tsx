/**
 * apps/web/src/components/sanpin/__tests__/sanpinSterilizationHubModalSuite.test.tsx
 *
 * RED TEAM ИНКВИЗИТОРСКИЙ ТЕСТОВЫЙ СЬЮТ:
 * Канонический SSOT хаб стерилизации и предстерилизационной очистки (SanpinSterilizationHubModal.tsx).
 * Мандаты 8b (Sweet Spot 350–450 строк), 8e (Автономия персонала), 8n (Пакетное списание),
 * 8am (Ровно 1 Primary CTA #0d9488), 8x (Ликвидация советских шифров), Apple HIG (Bottom Sheet 390x844).
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SanpinSterilizationHubModal } from "../SanpinSterilizationHubModal";
import { AUTOCLAVE_PROGRAMS, CLINIC_STERILIZERS, calculateBatchStockDeduction, createOneClickShiftBatch } from "../sanpinCatalogData";

describe("SANPIN STERILIZATION & PSO HUB SSOT (RED TEAM INQUISITION)", () => {
	describe("1. Архитектурные Sweet Spot инварианты (Мандат 8b/8zi)", () => {
		it("SanpinSterilizationHubModal.tsx находится строго в диапазоне 350–450 строк", () => {
			const filePath = path.join(process.cwd(), "apps/web/src/components/sanpin/SanpinSterilizationHubModal.tsx");
			const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 350 && lines <= 450,
				`SanpinSterilizationHubModal.tsx должен быть 350–450 строк по Мандату 8b (факт: ${lines})`,
			);
		});

		it("sanpinCatalogData.ts находится строго в диапазоне 200–250 строк", () => {
			const filePath = path.join(process.cwd(), "apps/web/src/components/sanpin/sanpinCatalogData.ts");
			const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 200 && lines <= 250,
				`sanpinCatalogData.ts должен быть 200–250 строк по Мандату 8b (факт: ${lines})`,
			);
		});

		it("DirectSanpinLauncher.tsx находится строго в диапазоне 50–90 строк", () => {
			const filePath = path.join(process.cwd(), "apps/web/src/components/sanpin/DirectSanpinLauncher.tsx");
			const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 50 && lines <= 90,
				`DirectSanpinLauncher.tsx должен быть 50–90 строк по Мандату 8b (факт: ${lines})`,
			);
		});
	});

	describe("2. Рендеринг 4 канонических вкладок и ликвидация советского канцелярита (Мандат 8x)", () => {
		it("рендерит все 4 канонические вкладки в хабе", () => {
			const html = renderToStaticMarkup(
				<SanpinSterilizationHubModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);

			// 1. Экспресс-смена
			assert.ok(html.includes("Экспресс-смена"), "Обязана быть вкладка Экспресс-смена");
			// 2. Автоклавирование
			assert.ok(html.includes("Автоклавирование"), "Обязана быть вкладка Автоклавирование");
			// 3. Очистка и пробы
			assert.ok(html.includes("Очистка и пробы"), "Обязана быть вкладка Очистка и пробы");
			// 4. Печать журналов для Роспотребнадзора (А4)
			assert.ok(html.includes("Печать журналов (А4)"), "Обязана быть вкладка Печать журналов");

			// Отсутствие сырых номеров приказов в видимом интерфейсе
			assert.ok(!html.includes("Форма 257/у"), "Запрещен номер формы 257/у в интерфейсе");
			assert.ok(!html.includes("Форма 366/у"), "Запрещен номер формы 366/у в интерфейсе");
		});

		it("рендерит параметры программ автоклавирования 134°C и 121°C", () => {
			const html = renderToStaticMarkup(
				<SanpinSterilizationHubModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);

			assert.ok(html.includes("134°C • Универсальная (Класс B)"));
			assert.ok(html.includes("121°C • Деликатная (Класс B)"));
			assert.ok(html.includes("2.1 бар"));
		});
	});

	describe("3. Единый дизайн-код и ровно 1 Primary CTA кнопка (Мандат 8am)", () => {
		it("содержит ровно 1 Primary CTA кнопку #0d9488 на экране", () => {
			const html = renderToStaticMarkup(
				<SanpinSterilizationHubModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);

			assert.ok(html.includes("data-testid=\"primary-batch-sterilization-btn\""));
			assert.ok(html.includes("background-color:#0d9488"));
			assert.ok(html.includes("Зафиксировать цикл автоклавирования"));

			// Никаких других Primary CTA кнопок с #0d9488 в разметке
			const matches = html.match(/background-color:#0d9488/g);
			assert.equal(matches?.length, 1, "Должна быть ровно 1 Primary CTA кнопка #0d9488 на экране");
		});

		it("ни одна кнопка в модалке не заблокирована атрибутом disabled (Мандат 8e)", () => {
			const html = renderToStaticMarkup(
				<SanpinSterilizationHubModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);

			assert.ok(!html.includes("disabled"), "Никакие кнопки не должны быть заблокированы (disabled)");
		});
	});

	describe("4. Пакетная стерилизация смены и списание со склада (Мандат 8n)", () => {
		it("createOneClickShiftBatch формирует цикл 134°C, азопирам 100% норма и списание 4 позиций", () => {
			const batch = createOneClickShiftBatch({ packagesCount: 18, operatorName: "Тест" });

			assert.equal(batch.sterilizationCycle.temperatureCelsius, 134);
			assert.equal(batch.sterilizationCycle.pressureBar, 2.1);
			assert.equal(batch.sterilizationCycle.exposureMinutes, 5);
			assert.equal(batch.sterilizationCycle.chemicalIndicatorVerdict, "ПРОЙДЕН");

			assert.equal(batch.psoRecord.azopyramResult, "negative");
			assert.equal(batch.psoRecord.phenolphthaleinResult, "negative");
			assert.equal(batch.psoRecord.verdict, "ГОДНО");

			const kraft = batch.deductedStock.find((s) => s.sku === "KRAFT-100X200");
			assert.ok(kraft);
			assert.equal(kraft.quantity, 18);
		});
	});

	describe("5. Apple HIG Touch Ergonomics & Mobile Sheet Invariants", () => {
		it("содержит Drag Handle 36x5px и скругление rounded-t-[24px] для смартфонов", () => {
			const html = renderToStaticMarkup(
				<SanpinSterilizationHubModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);

			assert.ok(html.includes("rounded-t-[24px]") || html.includes("max-sm:rounded-t-[24px]"), "Должно быть скругление 24px для мобильного");
			assert.ok(html.includes("w-9 h-1.5") || html.includes("w-12 h-1.5"), "Должен быть Drag Handle для мобильного");
			assert.ok(html.includes("min-h-[44px]"), "Интерактивные элементы обязаны иметь сенсорный минимум >= 44px");
		});
	});
});
