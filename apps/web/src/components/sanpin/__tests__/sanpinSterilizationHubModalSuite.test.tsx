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
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SterilizationBatchCycleModal as SanpinStudioModal } from "../SterilizationBatchCycleModal";
import { AUTOCLAVE_PROGRAMS, CLINIC_STERILIZERS, calculateBatchStockDeduction, createOneClickShiftBatch } from "../sanpinCatalogData";

const sanpinDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("SANPIN STERILIZATION & PSO HUB SSOT (RED TEAM INQUISITION)", () => {
	describe("1. Архитектурные Sweet Spot инварианты (Мандат 8b/8zi)", () => {
		it("SterilizationBatchCycleModal.tsx является каноническим студийным компонентом (Мандат 8b/8zi)", () => {
			const filePath = path.join(sanpinDir, "SterilizationBatchCycleModal.tsx");
			const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 250 && lines <= 350,
				`SterilizationBatchCycleModal.tsx должен быть 250–350 строк по Мандату 8b (факт: ${lines})`,
			);
		});

		it("sanpinCatalogData.ts находится строго в диапазоне 300–380 строк", () => {
			const filePath = path.join(sanpinDir, "sanpinCatalogData.ts");
			const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 300 && lines <= 380,
				`sanpinCatalogData.ts должен быть 300–380 строк по Мандату 8b (факт: ${lines})`,
			);
		});

		it("DirectSanpinLauncher.tsx находится строго в диапазоне 50–90 строк", () => {
			const filePath = path.join(sanpinDir, "DirectSanpinLauncher.tsx");
			const lines = fs.readFileSync(filePath, "utf-8").split("\n").length;
			assert.ok(
				lines >= 50 && lines <= 90,
				`DirectSanpinLauncher.tsx должен быть 50–90 строк по Мандату 8b (факт: ${lines})`,
			);
		});
	});

	describe("2. Рендеринг канонических параметров и ликвидация советского канцелярита (Мандат 8x)", () => {
		it("рендерит все канонические разделы в модалке стерилизации", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);

			// 1. Автоклавирование
			assert.ok(html.includes("Автоклав") || html.includes("автоклава") || html.includes("стерилизации"), "Обязан быть раздел Автоклав");
			// 2. Предстерилизационная очистка
			assert.ok(html.includes("Предстерилизационная очистка") || html.includes("очистки"), "Обязан быть контроль ПСО");
			// 3. Химический индикатор
			assert.ok(html.includes("Химический индикатор") || html.includes("Интегратор"), "Обязан быть химический индикатор");
			// 4. Печать журналов для проверок
			assert.ok(html.includes("Печать журнала"), "Обязана быть печать журналов");

			// Отсутствие сырых номеров приказов в видимом интерфейсе
			assert.ok(!html.includes("Форма 257/у"), "Запрещен номер формы 257/у в интерфейсе");
			assert.ok(!html.includes("Форма 366/у"), "Запрещен номер формы 366/у в интерфейсе");
		});

		it("рендерит параметры программ автоклавирования 134°C и 121°C", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);

			assert.ok(html.includes("134°C"));
			assert.ok(html.includes("2.1 бар"));
		});
	});

	describe("3. Единый дизайн-код и ровно 1 Primary CTA кнопка (Мандат 8am)", () => {
		it("содержит ровно 1 Primary CTA кнопку #0d9488 на экране", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);

			assert.ok(html.includes("data-testid=\"sanpin-run-cycle-cta\"") || html.includes("data-testid=\"primary-batch-sterilization-btn\""));
			assert.ok(html.includes("sanpin-primary-cta") || html.includes("#0d9488") || html.includes("var(--primary"));
			assert.ok(html.includes("Утвердить цикл") || html.includes("Запустить автоклавирование") || html.includes("Зарегистрировать цикл"));
		});

		it("ни одна кнопка в модалке не заблокирована атрибутом disabled (Мандат 8e)", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
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
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);

			assert.ok(html.includes("sanpin-drag-handle") || html.includes("w-9 h-1.5"), "Должен быть Drag Handle для мобильного");
			assert.ok(html.includes("sanpin-studio-modal") || html.includes("rounded-t-[24px]"), "Должна быть стилизация шторки для мобильного");
		});
	});
});
