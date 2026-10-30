/**
 * apps/web/src/components/sanpin/__tests__/sterilizationSSOTSuite.test.tsx
 *
 * Исчерпывающий тестовый сьют Red Team инквизиции SSOT стерилизации и автоклавирования:
 * 1. Проверка Sweet Spot размеров файлов (Мандат 8b/8zi).
 * 2. Проверка SSOT каталога программ, автоклавов, индикаторов и упаковки.
 * 3. Валидация физических параметров цикла (температура, давление, экспозиция).
 * 4. Пакетное списание со склада (Soft Negative Stock, Мандат 8n).
 * 5. Рендеринг SterilizationHubModal: 4 вкладки, ровно 1 Primary CTA #0d9488, 0 disabled кнопок.
 * 6. Apple HIG: мобильный Drag Handle 36x5px, тач-таргеты >= 44x44px.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	AUTOCLAVE_PROGRAMS,
	CLINIC_STERILIZERS,
	CHEMICAL_INDICATORS,
	STERILIZATION_PACKAGING,
	CLINICAL_BATCH_TEMPLATES,
	calculateBatchStockDeduction,
	createOneClickShiftBatch,
	validateSterilizationCycleParameters,
	getSanpinBatchRecords,
	generateSanpinPrintHtml,
} from "../sterilizationCatalogData";
import { SterilizationHubModal } from "../SterilizationHubModal";
import { DirectSterilizationLauncher } from "../DirectSterilizationLauncher";

const SANPIN_DIR = path.resolve(process.cwd(), "apps/web/src/components/sanpin");

describe("STERILIZATION SSOT & AUTOCLAVE RED TEAM SUITE", () => {
	describe("1. Архитектурные Sweet Spot инварианты (Мандат 8b/8zi)", () => {
		it("sterilizationCatalogData.ts находится строго в диапазоне 250–350 строк", () => {
			const filePath = path.join(SANPIN_DIR, "sterilizationCatalogData.ts");
			const content = fs.readFileSync(filePath, "utf-8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount >= 250 && lineCount <= 350,
				`sterilizationCatalogData.ts содержит ${lineCount} строк (ожидалось 250–350)`,
			);
		});

		it("SterilizationHubModal.tsx находится строго в диапазоне 300–450 строк", () => {
			const filePath = path.join(SANPIN_DIR, "SterilizationHubModal.tsx");
			const content = fs.readFileSync(filePath, "utf-8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount >= 300 && lineCount <= 450,
				`SterilizationHubModal.tsx содержит ${lineCount} строк (ожидалось 300–450)`,
			);
		});

		it("DirectSterilizationLauncher.tsx находится строго в диапазоне 50–90 строк", () => {
			const filePath = path.join(SANPIN_DIR, "DirectSterilizationLauncher.tsx");
			const content = fs.readFileSync(filePath, "utf-8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount >= 50 && lineCount <= 90,
				`DirectSterilizationLauncher.tsx содержит ${lineCount} строк (ожидалось 50–90)`,
			);
		});
	});

	describe("2. SSOT Каталог программ, автоклавов, индикаторов и упаковки", () => {
		it("содержит 3 канонических режима автоклавирования", () => {
			assert.equal(AUTOCLAVE_PROGRAMS.length, 3);
			const standard = AUTOCLAVE_PROGRAMS.find((p) => p.id === "standard_134");
			const delicate = AUTOCLAVE_PROGRAMS.find((p) => p.id === "delicate_121");
			const flash = AUTOCLAVE_PROGRAMS.find((p) => p.id === "flash_134");

			assert.ok(standard, "Отсутствует стандартная программа 134°C");
			assert.equal(standard.temperatureCelsius, 134);
			assert.equal(standard.pressureBar, 2.1);
			assert.equal(standard.exposureMinutes, 5);

			assert.ok(delicate, "Отсутствует деликатная программа 121°C");
			assert.equal(delicate.temperatureCelsius, 121);
			assert.equal(delicate.pressureBar, 1.15);
			assert.equal(delicate.exposureMinutes, 20);

			assert.ok(flash, "Отсутствует экспресс-программа");
			assert.equal(flash.temperatureCelsius, 134);
			assert.equal(flash.exposureMinutes, 3);
		});

		it("содержит предустановленный флот автоклавов класса B", () => {
			assert.ok(CLINIC_STERILIZERS.length >= 3);
			const melag = CLINIC_STERILIZERS.find((a) => a.model.includes("Melag"));
			const euronda = CLINIC_STERILIZERS.find((a) => a.model.includes("Euronda"));
			const sirona = CLINIC_STERILIZERS.find((a) => a.model.includes("DAC Universal"));

			assert.ok(melag, "Отсутствует Melag Vacuklav");
			assert.ok(euronda, "Отсутствует Euronda E9");
			assert.ok(sirona, "Отсутствует Dentsply Sirona DAC");
			assert.equal(melag.autoclaveClass, "B");
			assert.equal(melag.isCompliant, true);
		});

		it("содержит химические индикаторы IV и V класса с эталоном теста", () => {
			assert.equal(CHEMICAL_INDICATORS.length, 2);
			const class5 = CHEMICAL_INDICATORS.find((i) => i.id === "class5_integrating");
			assert.ok(class5);
			assert.ok(class5.standardVerdict.includes("Эталон достигнут"));
		});

		it("содержит канонические типы упаковок и клинические шаблоны", () => {
			assert.ok(STERILIZATION_PACKAGING.length >= 4);
			assert.ok(CLINICAL_BATCH_TEMPLATES.length >= 4);
			const kraft200 = STERILIZATION_PACKAGING.find((p) => p.id === "kraft_100x200");
			assert.ok(kraft200);
			assert.equal(kraft200.shelfLifeDays, 50);
		});
	});

	describe("3. Валидация физических параметров цикла стерилизации", () => {
		it("валидирует успешный стандартный цикл 134°C / 2.1 бар / 5 мин", () => {
			const res = validateSterilizationCycleParameters("standard_134", 134.2, 2.12, 5.0);
			assert.equal(res.valid, true);
		});

		it("отклоняет заниженную температуру (< 132°C)", () => {
			const res = validateSterilizationCycleParameters("standard_134", 130.0, 2.1, 5.0);
			assert.equal(res.valid, false);
			assert.ok(res.reason?.includes("Температура"));
		});

		it("отклоняет заниженное давление (< 2.0 бар)", () => {
			const res = validateSterilizationCycleParameters("standard_134", 134.0, 1.8, 5.0);
			assert.equal(res.valid, false);
			assert.ok(res.reason?.includes("Давление"));
		});

		it("отклоняет недостаточное время экспозиции (< 5 мин)", () => {
			const res = validateSterilizationCycleParameters("standard_134", 134.0, 2.1, 4.0);
			assert.equal(res.valid, false);
			assert.ok(res.reason?.includes("экспозиции"));
		});

		it("валидирует щадящий цикл 121°C / 1.15 бар / 20 мин", () => {
			const res = validateSterilizationCycleParameters("delicate_121", 121.5, 1.15, 20.0);
			assert.equal(res.valid, true);
		});
	});

	describe("4. Пакетная стерилизация смены и списание со склада (Мандат 8n)", () => {
		it("рассчитывает списание материалов для смены на 16 упаковок", () => {
			const deductions = calculateBatchStockDeduction(16);
			assert.equal(deductions.length, 4);

			const kraft = deductions.find((d) => d.sku === "KRAFT-100X200");
			const indicator = deductions.find((d) => d.sku === "IND-CLASS5-MEDIS");
			const azopyram = deductions.find((d) => d.sku === "AZOPYRAM-REAGENT");
			const phenolphthalein = deductions.find((d) => d.sku === "PHENOLPHTHALEIN-SOL");

			assert.equal(kraft?.quantity, 16);
			assert.equal(indicator?.quantity, 4);
			assert.equal(azopyram?.quantity, 2);
			assert.equal(phenolphthalein?.quantity, 1);
		});

		it("createOneClickShiftBatch формирует цикл 134°C, азопирам 100% норма и списание", () => {
			const batch = createOneClickShiftBatch({ packagesCount: 16 });
			assert.equal(batch.sterilizationCycle.packagesCount, 16);
			assert.equal(batch.sterilizationCycle.temperatureCelsius, 134);
			assert.equal(batch.sterilizationCycle.pressureBar, 2.1);
			assert.equal(batch.sterilizationCycle.exposureMinutes, 5);
			assert.equal(batch.sterilizationCycle.chemicalIndicatorVerdict, "ПРОЙДЕН");
			assert.equal(batch.sterilizationCycle.status, "completed");

			assert.equal(batch.psoRecord.azopyramResult, "negative");
			assert.equal(batch.psoRecord.phenolphthaleinResult, "negative");
			assert.equal(batch.psoRecord.verdict, "ГОДНО");

			assert.equal(batch.deductedStock.length, 4);
		});

		it("getSanpinBatchRecords изолирует мокапы: в боевом режиме строго пустой список (Мандат 8wy)", () => {
			const prodRecords = getSanpinBatchRecords(false);
			assert.equal(prodRecords.length, 0);

			const demoRecords = getSanpinBatchRecords(true);
			assert.ok(demoRecords.length >= 2);
		});

		it("generateSanpinPrintHtml генерирует чистый печатный А4 бланк", () => {
			const demoRecords = getSanpinBatchRecords(true);
			const html = generateSanpinPrintHtml(demoRecords);
			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("Журнал контроля стерилизации"));
			assert.ok(html.includes("Melag Vacuklav"));
		});
	});

	describe("5. Рендеринг SterilizationHubModal: дизайн-код и эргономика", () => {
		it("рендерит все 4 канонические вкладки в хабе", () => {
			const html = renderToStaticMarkup(
				<SterilizationHubModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(html.includes("Экспресс-смена"));
			assert.ok(html.includes("Автоклавирование"));
			assert.ok(html.includes("Очистка и пробы"));
			assert.ok(html.includes("Печать журналов (А4)"));
		});

		it("содержит ровно 1 Primary CTA кнопку #0d9488 на экране (Мандат 8am)", () => {
			const html = renderToStaticMarkup(
				<SterilizationHubModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			const primaryCtaMatches = html.match(/data-testid="primary-batch-sterilization-btn"/g);
			assert.equal(primaryCtaMatches?.length, 1);
			assert.ok(html.includes("#0d9488") || html.includes("background-color:#0d9488"));
			assert.ok(html.includes("Зафиксировать цикл автоклавирования"));
		});

		it("ни одна кнопка в модалке не заблокирована атрибутом disabled (Мандат 8e)", () => {
			const html = renderToStaticMarkup(
				<SterilizationHubModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			const hasDisabled = /<button[^>]*\bdisabled\b[^>]*>/i.test(html);
			assert.equal(hasDisabled, false, "Обнаружена заблокированная кнопка (Мандат 8e нарушен)");
		});

		it("содержит Drag Handle 36x5px и скругление rounded-t-[24px] для Apple HIG смартфонов", () => {
			const html = renderToStaticMarkup(
				<SterilizationHubModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(html.includes("w-9 h-1.5"));
			assert.ok(html.includes("max-sm:rounded-t-[24px]"));
		});

		it("не содержит советского канцелярита в заголовках (Мандат 8x)", () => {
			const html = renderToStaticMarkup(
				<SterilizationHubModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(!html.includes("Форма 257/у"));
			assert.ok(!html.includes("СанПиН 3.3686-21"));
			assert.ok(html.includes("Журнал автоклавирования и стерилизации"));
		});
	});

	describe("6. Автономный лаунчер DirectSterilizationLauncher", () => {
		it("DirectSterilizationLauncher корректно инициализируется", () => {
			assert.ok(DirectSterilizationLauncher);
			assert.equal(typeof DirectSterilizationLauncher, "function");
		});
	});
});
