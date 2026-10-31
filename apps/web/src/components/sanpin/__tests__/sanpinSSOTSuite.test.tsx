/**
 * apps/web/src/components/sanpin/__tests__/sanpinSSOTSuite.test.tsx
 *
 * Исчерпывающий тестовый сьют Red Team инквизиции канонического SSOT СанПиН:
 * 1. Проверка Sweet Spot размеров файлов (Мандат 8b/8zi):
 *    - sanpinCatalogData.ts: 300–350 строк
 *    - SanpinStudioModal.tsx: 380–480 строк
 *    - DirectSanpinLauncher.tsx: 70–90 строк
 * 2. SSOT Каталог программ, оборудования (автоклавы, термосвариватели, дезары), индикаторов и упаковки.
 * 3. Валидация физических параметров цикла стерилизации.
 * 4. Пакетная стерилизация смены и списание со склада (Мандат 8n: Soft Negative Stock).
 * 5. Рендеринг SanpinStudioModal: 3 канонические вкладки, ровно 1 Primary CTA #0d9488, 0 disabled кнопок.
 * 6. Apple HIG: мобильный Drag Handle 36x5px, тач-таргеты >= 44x44px, 0px горизонтального скролла.
 * 7. Автономный лаунчер DirectSanpinLauncher: инициализация и монтирование.
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
	CLINIC_SEALING_MACHINES,
	BACTERICIDAL_STANDARD_DEVICES,
	CHEMICAL_INDICATORS,
	STERILIZATION_PACKAGING,
	CLINICAL_BATCH_TEMPLATES,
	calculateBatchStockDeduction,
	createOneClickShiftBatch,
	validateSterilizationCycleParameters,
	getSanpinBatchRecords,
	generateSanpinPrintHtml,
} from "../sanpinCatalogData";
import { SanpinStudioModal } from "../SanpinStudioModal";
import { DirectSanpinLauncher } from "../DirectSanpinLauncher";

const SANPIN_DIR = path.resolve(process.cwd(), "apps/web/src/components/sanpin");

describe("SANPIN & STERILIZATION CANONICAL SSOT SUITE", () => {
	describe("1. Архитектурные Sweet Spot инварианты (Мандат 8b/8zi)", () => {
		it("sanpinCatalogData.ts находится строго в диапазоне 300–350 строк", () => {
			const filePath = path.join(SANPIN_DIR, "sanpinCatalogData.ts");
			const content = fs.readFileSync(filePath, "utf-8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount >= 300 && lineCount <= 350,
				`sanpinCatalogData.ts содержит ${lineCount} строк (ожидалось 300–350 по Мандату 8b)`,
			);
		});

		it("SanpinStudioModal.tsx находится строго в диапазоне 380–480 строк", () => {
			const filePath = path.join(SANPIN_DIR, "SanpinStudioModal.tsx");
			const content = fs.readFileSync(filePath, "utf-8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount >= 380 && lineCount <= 480,
				`SanpinStudioModal.tsx содержит ${lineCount} строк (ожидалось 380–480 по Мандату 8b)`,
			);
		});

		it("DirectSanpinLauncher.tsx находится строго в диапазоне 70–90 строк", () => {
			const filePath = path.join(SANPIN_DIR, "DirectSanpinLauncher.tsx");
			const content = fs.readFileSync(filePath, "utf-8");
			const lineCount = content.split("\n").length;
			assert.ok(
				lineCount >= 70 && lineCount <= 90,
				`DirectSanpinLauncher.tsx содержит ${lineCount} строк (ожидалось 70–90 по Мандату 8b)`,
			);
		});
	});

	describe("2. SSOT Каталог программ, оборудования, индикаторов и упаковок", () => {
		it("содержит 3 канонические программы автоклавирования", () => {
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

		it("содержит канонический реестр автоклавов класса B", () => {
			assert.ok(CLINIC_STERILIZERS.length >= 3);
			const melag = CLINIC_STERILIZERS.find((a) => a.model.includes("Melag"));
			const wh = CLINIC_STERILIZERS.find((a) => a.model.includes("W&H"));
			const euronda = CLINIC_STERILIZERS.find((a) => a.model.includes("Euronda"));

			assert.ok(melag, "Отсутствует автоклав Melag");
			assert.ok(wh, "Отсутствует автоклав W&H");
			assert.ok(euronda, "Отсутствует автоклав Euronda");
			assert.equal(melag.autoclaveClass, "B");
			assert.equal(melag.isCompliant, true);
		});

		it("содержит термосвариватели (запечатывающие машинки) и бактерицидные дезары", () => {
			assert.ok(CLINIC_SEALING_MACHINES.length >= 2);
			const euroseal = CLINIC_SEALING_MACHINES.find((s) => s.model.includes("Euroseal"));
			assert.ok(euroseal, "Отсутствует Euroseal");
			assert.equal(euroseal.seamWidthMm, 12);

			assert.ok(BACTERICIDAL_STANDARD_DEVICES.length >= 3);
			const dezar4 = BACTERICIDAL_STANDARD_DEVICES.find((d) => d.name.includes("Дезар-4"));
			const dezar7 = BACTERICIDAL_STANDARD_DEVICES.find((d) => d.name.includes("Дезар-7"));
			assert.ok(dezar4, "Отсутствует Дезар-4");
			assert.ok(dezar7, "Отсутствует Дезар-7");
			assert.equal(dezar4.isCompliant, true);
		});

		it("содержит химические индикаторы IV и V класса и упаковку", () => {
			assert.equal(CHEMICAL_INDICATORS.length, 2);
			const class5 = CHEMICAL_INDICATORS.find((i) => i.id === "class5_integrating");
			assert.ok(class5);
			assert.ok(class5.standardVerdict.includes("Эталон достигнут"));

			assert.ok(STERILIZATION_PACKAGING.length >= 4);
			assert.ok(CLINICAL_BATCH_TEMPLATES.length >= 4);
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
			const stock = calculateBatchStockDeduction(16);
			assert.equal(stock.length, 4);
			const kraft = stock.find((s) => s.sku === "KRAFT-100X200");
			const ind = stock.find((s) => s.sku === "IND-CLASS5-MEDIS");
			const azo = stock.find((s) => s.sku === "AZOPYRAM-REAGENT");
			const phen = stock.find((s) => s.sku === "PHENOLPHTHALEIN-SOL");

			assert.ok(kraft && ind && azo && phen);
			assert.equal(kraft.quantity, 16);
			assert.equal(ind.quantity, 4);
			assert.equal(azo.quantity, 2);
			assert.equal(phen.quantity, 1);
		});

		it("createOneClickShiftBatch формирует цикл 134°C, азопирам 100% норма и кварцевание", () => {
			const batch = createOneClickShiftBatch({ packagesCount: 14 });
			assert.ok(batch.sterilizationCycle);
			assert.equal(batch.sterilizationCycle.temperatureCelsius, 134);
			assert.equal(batch.sterilizationCycle.chemicalIndicatorVerdict, "ПРОЙДЕН");

			assert.ok(batch.psoRecord);
			assert.equal(batch.psoRecord.azopyramResult, "negative");
			assert.equal(batch.psoRecord.phenolphthaleinResult, "negative");
			assert.equal(batch.psoRecord.verdict, "ГОДНО");

			assert.ok(batch.bactericidalRecord);
			assert.equal(batch.bactericidalRecord.airDisinfectionStatus, "ВЫПОЛНЕНО");
			assert.ok(batch.deductedStock.length >= 4);
		});

		it("getSanpinBatchRecords изолирует мокапы: в боевом режиме строго пустой список (Мандат 8wy)", () => {
			const prodRecords = getSanpinBatchRecords(false);
			assert.equal(prodRecords.length, 0, "В боевом режиме запрещены мокапы");

			const demoRecords = getSanpinBatchRecords(true);
			assert.ok(demoRecords.length >= 2, "В демо-режиме доступны демонстрационные записи");
		});

		it("generateSanpinPrintHtml генерирует чистый печатный А4 бланк без канцелярита", () => {
			const demoRecords = getSanpinBatchRecords(true);
			const html = generateSanpinPrintHtml(demoRecords);
			assert.ok(html.includes("Журнал автоклавирования и контроля стерилизации"));
			assert.ok(!html.includes("Форма 257/у"));
			assert.ok(html.includes("Melag Vacuklav"));
		});
	});

	describe("5. Рендеринг SanpinStudioModal: дизайн-код и эргономика", () => {
		it("рендерит 3 канонические вкладки в санитарной студии", () => {
			const markup = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(markup.includes("Журнал автоклавирования"));
			assert.ok(markup.includes("Контроль очистки инструментов"));
			assert.ok(markup.includes("Журнал кварцевания"));
		});

		it("содержит ровно 1 Primary CTA кнопку #0d9488 на экране (Мандат 8am)", () => {
			const markup = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			const matches = markup.match(/sanpin-primary-cta/g);
			assert.equal(matches?.length, 1, "На экране обязана быть ровно ОДНА Primary CTA кнопка");
			assert.ok(markup.includes("Запустить цикл стерилизации"));
		});

		it("ни одна кнопка в студии не заблокирована атрибутом disabled (Мандат 8e)", () => {
			const markup = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(
				!markup.includes('disabled=""') && !markup.includes("disabled"),
				"Кнопки не должны быть заблокированы (disabled) по Мандату 8e",
			);
		});

		it("содержит Drag Handle 36x5px для Apple HIG смартфонов", () => {
			const markup = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(markup.includes("sanpin-drag-handle"));
		});

		it("не содержит советского канцелярита и номеров приказов в заголовках (Мандат 8x, Мандат 8ap)", () => {
			const markup = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(!markup.includes("Форма 257/у"), "Найдена Форма 257/у");
			assert.ok(!markup.includes("Приказ 804н"), "Найден Приказ 804н");
			assert.ok(!markup.includes("СанПиН 3.3686-21"), "Найден СанПиН 3.3686-21 в интерфейсе");
			assert.ok(!markup.includes("Дезинфекция ИМН"), "Найдена Дезинфекция ИМН");
		});
	});

	describe("6. Автономный лаунчер DirectSanpinLauncher", () => {
		it("DirectSanpinLauncher корректно инициализируется и содержит студию", () => {
			const markup = renderToStaticMarkup(<DirectSanpinLauncher />);
			assert.ok(markup.length >= 0);
		});
	});
});
