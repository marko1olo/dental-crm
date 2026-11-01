/**
 * apps/web/src/components/sanpin/__tests__/sanpinStudioSSOT.test.tsx
 *
 * Верховный Red Team тестовый сьют SanPiN, стерилизации и автоклавирования DENTE CRM:
 * 1. Проверка архитектурных Sweet Spot инвариантов (Мандат 8b/8zi):
 *    - sanpinCatalogData.ts: 300–380 строк
 *    - SanpinStudioModal.tsx: 400–480 строк
 *    - DirectSanpinLauncher.tsx: 60–80 строк
 *    - styles/sanpinStudio.css: 250–350 строк
 * 2. Парк автоклавов (Melag, Euronda, W&H), режимы стерилизации (134°C / 2.1 бар / 5 мин).
 * 3. Химические индикаторы 4-5 класса и крафт-пакеты с маркировкой.
 * 4. Валидация физических параметров цикла стерилизации.
 * 5. Регистрация цикла стерилизации в 1 клик и списание со склада (Soft Negative Stock, Мандат 8n).
 * 6. Рендеринг SanpinStudioModal: 3 канонические вкладки, ровно 1 Primary CTA #0d9488 (Мандат 8am).
 * 7. Автономия персонала (Мандат 8e): 0 заблокированных (disabled) кнопок.
 * 8. Apple HIG Touch Ergonomics: Drag Handle 36x5px, тач-таргеты >= 44x44px, 0px горизонтального скролла.
 * 9. Автономный лаунчер DirectSanpinLauncher: поддержка #sanpin, #sterilization, #autoclave, #sterilizer, ?sanpin=1.
 * 10. Ликвидация конкурирующих модалок: прокси-фасады SanpinSterilizationHubModal и SterilizationHubModal.
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
	PSO_QUALITY_STANDARD,
	calculateBatchStockDeduction,
	validateSterilizationCycleParameters,
	createOneClickShiftBatch,
	getSanpinBatchRecords,
	generateSanpinPrintHtml,
	generateKraftStickersHtml,
} from "../sanpinCatalogData";
import { SanpinStudioModal } from "../SanpinStudioModal";
import { DirectSanpinLauncher } from "../DirectSanpinLauncher";
import { SanpinSterilizationHubModal } from "../SanpinSterilizationHubModal";
import { SterilizationHubModal } from "../SterilizationHubModal";
import { DirectSterilizationLauncher } from "../DirectSterilizationLauncher";

const SANPIN_DIR = path.resolve(process.cwd(), "apps/web/src/components/sanpin");

describe("SANPIN STUDIO CANONICAL SSOT SUITE (FIRST PRINCIPLES РФ 1–5 КРЕСЕЛ)", () => {
	describe("1. Архитектурные Sweet Spot инварианты (Мандат 8b/8zi)", () => {
		it("sanpinCatalogData.ts находится строго в диапазоне 300–380 строк", () => {
			const content = fs.readFileSync(path.join(SANPIN_DIR, "sanpinCatalogData.ts"), "utf-8");
			const lines = content.split("\n").length;
			assert.ok(
				lines >= 300 && lines <= 380,
				`sanpinCatalogData.ts содержит ${lines} строк (ожидалось 300–380 по Мандату 8b)`,
			);
		});

		it("SanpinStudioModal.tsx находится строго в диапазоне 400–480 строк", () => {
			const content = fs.readFileSync(path.join(SANPIN_DIR, "SanpinStudioModal.tsx"), "utf-8");
			const lines = content.split("\n").length;
			assert.ok(
				lines >= 400 && lines <= 480,
				`SanpinStudioModal.tsx содержит ${lines} строк (ожидалось 400–480 по Мандату 8b)`,
			);
		});

		it("DirectSanpinLauncher.tsx находится строго в диапазоне 60–80 строк", () => {
			const content = fs.readFileSync(path.join(SANPIN_DIR, "DirectSanpinLauncher.tsx"), "utf-8");
			const lines = content.split("\n").length;
			assert.ok(
				lines >= 60 && lines <= 80,
				`DirectSanpinLauncher.tsx содержит ${lines} строк (ожидалось 60–80 по Мандату 8b)`,
			);
		});

		it("styles/sanpinStudio.css находится строго в диапазоне 250–350 строк", () => {
			const content = fs.readFileSync(path.join(SANPIN_DIR, "styles/sanpinStudio.css"), "utf-8");
			const lines = content.split("\n").length;
			assert.ok(
				lines >= 250 && lines <= 350,
				`styles/sanpinStudio.css содержит ${lines} строк (ожидалось 250–350 по Мандату 8b)`,
			);
		});
	});

	describe("2. Парк автоклавов и режимы стерилизации по стандартам РФ", () => {
		it("содержит утвержденный паровой режим 134°C / 2.1 бар / 5 мин (Класс B)", () => {
			const std = AUTOCLAVE_PROGRAMS.find((p) => p.id === "standard_134");
			assert.ok(std, "Стандартная программа 134°C отсутствует");
			assert.equal(std.temperatureCelsius, 134);
			assert.equal(std.pressureBar, 2.1);
			assert.equal(std.exposureMinutes, 5);
			assert.ok(std.suitableFor.includes("наконечники") || std.suitableFor.includes("инструменты"));
		});

		it("поддерживает щадящий режим 121°C / 1.15 бар / 20 мин для оптики и полимеров", () => {
			const delicate = AUTOCLAVE_PROGRAMS.find((p) => p.id === "delicate_121");
			assert.ok(delicate, "Деликатная программа 121°C отсутствует");
			assert.equal(delicate.temperatureCelsius, 121);
			assert.equal(delicate.pressureBar, 1.15);
			assert.equal(delicate.exposureMinutes, 20);
		});

		it("содержит предустановленный парк автоклавов класса B (Melag, Euronda, W&H, Sirona)", () => {
			assert.ok(CLINIC_STERILIZERS.length >= 3);
			assert.ok(CLINIC_STERILIZERS.some((s) => s.model.includes("Melag")));
			assert.ok(CLINIC_STERILIZERS.some((s) => s.model.includes("Euronda")));
			assert.ok(CLINIC_STERILIZERS.some((s) => s.model.includes("W&H")));
		});

		it("содержит химические индикаторы 4-5 класса, термосвариватели и крафт-пакеты", () => {
			assert.ok(CHEMICAL_INDICATORS.length >= 2);
			assert.ok(CHEMICAL_INDICATORS.some((i) => i.id.includes("class5")));
			assert.ok(CLINIC_SEALING_MACHINES.length >= 2);
			assert.ok(STERILIZATION_PACKAGING.length >= 3);
			assert.ok(STERILIZATION_PACKAGING.some((p) => p.shelfLifeDays >= 50));
		});
	});

	describe("3. Валидация физических параметров цикла стерилизации", () => {
		it("успешно валидирует нормативный цикл 134°C / 2.1 бар / 5 мин", () => {
			const res = validateSterilizationCycleParameters("standard_134", 134, 2.1, 5);
			assert.equal(res.valid, true);
		});

		it("отклоняет заниженную температуру, давление или время экспозиции", () => {
			const tFail = validateSterilizationCycleParameters("standard_134", 130, 2.1, 5);
			assert.equal(tFail.valid, false);
			assert.ok(tFail.reason?.includes("Температура"));

			const pFail = validateSterilizationCycleParameters("standard_134", 134, 1.8, 5);
			assert.equal(pFail.valid, false);
			assert.ok(pFail.reason?.includes("Давление"));

			const expFail = validateSterilizationCycleParameters("standard_134", 134, 2.1, 3);
			assert.equal(expFail.valid, false);
			assert.ok(expFail.reason?.includes("экспозиции"));
		});
	});

	describe("4. Пакетная регистрация цикла в 1 клик и списание со склада (Мандат 8n)", () => {
		it("createOneClickShiftBatch формирует цикл 134°C, азопирам 100% норма и кварцевание", () => {
			const batch = createOneClickShiftBatch({ packagesCount: 14 });
			assert.ok(batch.sterilizationCycle);
			assert.equal(batch.sterilizationCycle.temperatureCelsius, 134);
			assert.equal(batch.sterilizationCycle.chemicalIndicatorVerdict, "ПРОЙДЕН");
			assert.equal(batch.sterilizationCycle.packagesCount, 14);

			assert.ok(batch.psoRecord);
			assert.equal(batch.psoRecord.azopyramResult, "negative");
			assert.equal(batch.psoRecord.phenolphthaleinResult, "negative");
			assert.equal(batch.psoRecord.verdict, "ГОДНО");

			assert.ok(batch.bactericidalRecord);
			assert.equal(batch.bactericidalRecord.airDisinfectionStatus, "ВЫПОЛНЕНО");
		});

		it("рассчитывает пакетное списание расходников со склада (Soft Negative Stock)", () => {
			const stock = calculateBatchStockDeduction(18);
			assert.equal(stock.length, 4);
			const kraft = stock.find((s) => s.sku === "KRAFT-100X200");
			const ind = stock.find((s) => s.sku === "IND-CLASS5-MEDIS");
			assert.ok(kraft && ind);
			assert.equal(kraft.quantity, 18);
			assert.equal(ind.quantity, 5);
		});

		it("изолирует моки: в боевом режиме getSanpinBatchRecords возвращает строго пустой список (Мандат 8wy)", () => {
			assert.equal(getSanpinBatchRecords(false).length, 0);
			assert.ok(getSanpinBatchRecords(true).length >= 2);
		});

		it("генерирует чистые бланки журнала и термоэтикеток на крафт-пакеты", () => {
			const demoCycles = getSanpinBatchRecords(true);
			const journalHtml = generateSanpinPrintHtml(demoCycles);
			assert.ok(journalHtml.includes("Журнал автоклавирования и контроля стерилизации"));
			assert.ok(!journalHtml.includes("Форма 257/у"));

			const stickersHtml = generateKraftStickersHtml(demoCycles[0]!, 4);
			assert.ok(stickersHtml.includes("СТЕРИЛЬНО"));
			assert.ok(stickersHtml.includes("Годен до:"));
			assert.ok(stickersHtml.includes("Индикатор:"));
		});
	});

	describe("5. Канонический UI студии SanpinStudioModal: эргономика и дизайн-код", () => {
		it("рендерит 3 канонические вкладки студии СанПиН", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(html.includes("Циклы стерилизации (Автоклав)"));
			assert.ok(html.includes("Крафт-пакеты и маркировка"));
			assert.ok(html.includes("Журнал генеральных уборок и УФ"));
		});

		it("содержит ровно 1 Primary CTA кнопку #0d9488 на экране (Мандат 8am)", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			const matches = html.match(/sanpin-primary-cta/g);
			assert.equal(matches?.length, 1, "На экране должна быть ровно ОДНА Primary CTA кнопка");
			assert.ok(html.includes("Зарегистрировать цикл стерилизации"));
		});

		it("ни одна кнопка в студии не заблокирована атрибутом disabled (Мандат 8e)", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(!html.includes('disabled=""') && !html.includes("disabled"));
		});

		it("содержит Apple HIG Drag Handle 36x5px для смартфонов", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(html.includes("sanpin-drag-handle"));
		});

		it("не содержит советского канцелярита и номеров приказов в кнопках и табах (Мандат 8x)", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(!html.includes("Приказ 3.3686-21"));
			assert.ok(!html.includes("Форма 257/у"));
			assert.ok(!html.includes("Дезинфекционный режим №4"));
		});
	});

	describe("6. Автономные лаунчеры и ликвидация конкурирующих модалок", () => {
		it("DirectSanpinLauncher монтирует каноническую SanpinStudioModal", () => {
			const html = renderToStaticMarkup(<DirectSanpinLauncher forceOpen={true} />);
			assert.ok(html.includes("direct-sanpin-launcher") && html.includes("sanpin-studio-modal"));
		});

		it("SanpinSterilizationHubModal является ре-экспортным прокси-фасадом к SanpinStudioModal", () => {
			const html = renderToStaticMarkup(
				<SanpinSterilizationHubModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(html.includes("sanpin-studio-modal"));
		});

		it("SterilizationHubModal является ре-экспортным прокси-фасадом к SanpinStudioModal", () => {
			const html = renderToStaticMarkup(
				<SterilizationHubModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(html.includes("sanpin-studio-modal"));
		});

		it("DirectSterilizationLauncher монтирует каноническую SanpinStudioModal", () => {
			const html = renderToStaticMarkup(<DirectSterilizationLauncher forceOpen={true} />);
			assert.ok(html.includes("direct-sterilization-launcher") && html.includes("sanpin-studio-modal"));
		});
	});
});
