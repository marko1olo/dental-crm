/**
 * apps/web/src/components/sanpin/__tests__/sanpinSSOTSuite.test.tsx
 *
 * Runtime Behavioral Test Suite for SanPiN SSOT, Autoclaving & P2-1.2 Z-Index/HIG Fixes.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
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
import { SterilizationBatchCycleModal as SanpinStudioModal } from "../SterilizationBatchCycleModal";
import { WorkspaceStudioOverlayHost } from "../../appLayout/WorkspaceStudioOverlayHost";
import { resolveClinicRoute } from "../../../router/routeResolver";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

describe("SANPIN & STERILIZATION CANONICAL SSOT SUITE", () => {
	describe("1. Единый роутер СанПиН (Mandate 8aq)", () => {
		it("resolveClinicRoute направляет #sanpin и ?sanpin=1 в студию sanpin", () => {
			assert.equal(resolveClinicRoute("", "#sanpin").studio?.kind, "sanpin");
			assert.equal(resolveClinicRoute("?sanpin=1", "").studio?.kind, "sanpin");
		});
	});

	describe("2. SSOT Каталог программ, оборудования, индикаторов и упаковок", () => {
		it("содержит канонические программы автоклавирования", () => {
			assert.ok(AUTOCLAVE_PROGRAMS.length >= 3);
			const standard = AUTOCLAVE_PROGRAMS.find((p) => p.id === "standard_134");
			const delicate = AUTOCLAVE_PROGRAMS.find((p) => p.id === "delicate_121");
			const flash = AUTOCLAVE_PROGRAMS.find((p) => p.id === "flash_134");

			assert.ok(standard);
			assert.equal(standard.temperatureCelsius, 134);
			assert.equal(standard.pressureBar, 2.1);
			assert.equal(standard.exposureMinutes, 5);

			assert.ok(delicate);
			assert.equal(delicate.temperatureCelsius, 121);
			assert.equal(delicate.pressureBar, 1.15);
			assert.equal(delicate.exposureMinutes, 20);

			assert.ok(flash);
			assert.equal(flash.temperatureCelsius, 134);
			assert.equal(flash.exposureMinutes, 3);
		});

		it("содержит канонический реестр автоклавов класса B, термосвариватели и дезары", () => {
			assert.ok(CLINIC_STERILIZERS.length >= 3);
			const melag = CLINIC_STERILIZERS.find((a) => a.model.includes("Melag"));
			assert.ok(melag);
			assert.equal(melag.autoclaveClass, "B");
			assert.equal(melag.isCompliant, true);

			assert.ok(CLINIC_SEALING_MACHINES.length >= 2);
			assert.ok(BACTERICIDAL_STANDARD_DEVICES.length >= 3);
			assert.equal(CHEMICAL_INDICATORS.length, 2);
			assert.ok(STERILIZATION_PACKAGING.length >= 4);
			assert.ok(CLINICAL_BATCH_TEMPLATES.length >= 4);
		});
	});

	describe("3. Валидация физических параметров цикла стерилизации", () => {
		it("валидирует успешный стандартный цикл 134°C / 2.1 бар / 5 мин и щадящий 121°C", () => {
			assert.equal(validateSterilizationCycleParameters("standard_134", 134.2, 2.12, 5.0).valid, true);
			assert.equal(validateSterilizationCycleParameters("delicate_121", 121.5, 1.15, 20.0).valid, true);
			assert.equal(validateSterilizationCycleParameters("standard_134", 130.0, 2.1, 5.0).valid, false);
			assert.equal(validateSterilizationCycleParameters("standard_134", 134.0, 1.8, 5.0).valid, false);
			assert.equal(validateSterilizationCycleParameters("standard_134", 134.0, 2.1, 4.0).valid, false);
		});
	});

	describe("4. Пакетная стерилизация смены и списание со склада (Мандат 8n)", () => {
		it("рассчитывает списание материалов и формирует пакет смены", () => {
			const stock = calculateBatchStockDeduction(16);
			assert.equal(stock.length, 4);
			assert.equal(stock.find((s) => s.sku === "KRAFT-100X200")?.quantity, 16);
			assert.equal(stock.find((s) => s.sku === "IND-CLASS5-MEDIS")?.quantity, 4);

			const batch = createOneClickShiftBatch({ packagesCount: 14 });
			assert.equal(batch.sterilizationCycle.temperatureCelsius, 134);
			assert.equal(batch.psoRecord.verdict, "ГОДНО");
			assert.equal(batch.bactericidalRecord.airDisinfectionStatus, "ВЫПОЛНЕНО");
		});

		it("getSanpinBatchRecords изолирует мокапы и generateSanpinPrintHtml формирует А4 бланк", () => {
			assert.equal(getSanpinBatchRecords(false).length, 0);
			const demoRecords = getSanpinBatchRecords(true);
			assert.ok(demoRecords.length >= 2);
			const html = generateSanpinPrintHtml(demoRecords);
			assert.ok(html.includes("Журнал автоклавирования и контроля стерилизации"));
			assert.equal(html.includes("Форма 257/у"), false);
		});
	});

	describe("5. Рендеринг SanpinStudioModal: дизайн-код, z-[100], и эргономика", () => {
		it("рендерит ключевые разделы, Primary CTA, Drag Handle, z-[100] и 0 disabled кнопок", () => {
			const markup = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(markup.includes("Автоклав") || markup.includes("стерилизации"));
			assert.ok(markup.includes("очистка") || markup.includes("индикатор"));
			assert.equal(markup.match(/sanpin-primary-cta/g)?.length, 1);
			assert.ok(markup.includes("Запустить цикл стерилизации"));
			assert.ok(markup.includes("sanpin-drag-handle"));
			assert.ok(markup.includes("z-50"), "Must use valid backdrop z-index scale");
			assert.equal(markup.includes("z-[1100]"), false);
			assert.ok(markup.includes("sm:h-9"), "Desktop buttons must enforce h-9");
			assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(markup), false);
			assert.equal(markup.includes("Форма 257/у"), false);
			assert.equal(markup.includes("Приказ 804н"), false);
			assert.equal(markup.includes("СанПиН 3.3686-21"), false);
		});
	});

	describe("6. Автономный роутинг СанПиН (WorkspaceStudioOverlayHost)", () => {
		it("WorkspaceStudioOverlayHost рендерится без активного оверлея и поддерживает query/hash роутинг СанПиН", () => {
			const markup = renderToStaticMarkup(<WorkspaceStudioOverlayHost />);
			assert.equal(markup, "");
			assert.equal(resolveClinicRoute("?sanpin=1", "").studio?.kind, "sanpin");
			assert.equal(resolveClinicRoute("", "#sanpin").studio?.kind, "sanpin");
		});
	});
});
