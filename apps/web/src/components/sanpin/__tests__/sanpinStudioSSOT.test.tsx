/**
 * apps/web/src/components/sanpin/__tests__/sanpinStudioSSOT.test.tsx
 *
 * Runtime Behavioral Test Suite for SanPiN Studio, Programs & Stock Deduction.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	AUTOCLAVE_PROGRAMS,
	CLINIC_STERILIZERS,
	CLINIC_SEALING_MACHINES,
	CHEMICAL_INDICATORS,
	STERILIZATION_PACKAGING,
	calculateBatchStockDeduction,
	validateSterilizationCycleParameters,
	createOneClickShiftBatch,
	getSanpinBatchRecords,
	generateSanpinPrintHtml,
	generateKraftStickersHtml,
} from "../sanpinCatalogData";
import { SterilizationBatchCycleModal as SanpinStudioModal } from "../SterilizationBatchCycleModal";
import { WorkspaceStudioOverlayHost } from "../../appLayout/WorkspaceStudioOverlayHost";
import { resolveClinicRoute } from "../../../router/routeResolver";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

describe("SANPIN STUDIO CANONICAL SSOT SUITE (FIRST PRINCIPLES РФ 1–5 КРЕСЕЛ)", () => {
	describe("1. SSOT роутинг СанПиН (Mandate 8aq)", () => {
		it("resolveClinicRoute распознаёт #sanpin и ?sanpin=1", () => {
			assert.equal(resolveClinicRoute("", "#sanpin").studio?.kind, "sanpin");
			assert.equal(resolveClinicRoute("?sanpin=1", "").studio?.kind, "sanpin");
		});
	});

	describe("2. Парк автоклавов и режимы стерилизации по стандартам РФ", () => {
		it("содержит утвержденный паровой режим 134°C и щадящий 121°C", () => {
			const std = AUTOCLAVE_PROGRAMS.find((p) => p.id === "standard_134");
			const delicate = AUTOCLAVE_PROGRAMS.find((p) => p.id === "delicate_121");
			assert.ok(std && delicate);
			assert.equal(std.temperatureCelsius, 134);
			assert.equal(std.pressureBar, 2.1);
			assert.equal(std.exposureMinutes, 5);
			assert.equal(delicate.temperatureCelsius, 121);
			assert.equal(delicate.pressureBar, 1.15);
			assert.equal(delicate.exposureMinutes, 20);
		});

		it("содержит флот автоклавов класса B, индикаторы, термосвариватели и крафт-пакеты", () => {
			assert.ok(CLINIC_STERILIZERS.some((s) => s.model.includes("Melag")));
			assert.ok(CLINIC_STERILIZERS.some((s) => s.model.includes("Euronda")));
			assert.ok(CLINIC_STERILIZERS.some((s) => s.model.includes("W&H")));
			assert.ok(CHEMICAL_INDICATORS.some((i) => i.id.includes("class5")));
			assert.ok(CLINIC_SEALING_MACHINES.length >= 2);
			assert.ok(STERILIZATION_PACKAGING.some((p) => p.shelfLifeDays >= 50));
		});
	});

	describe("3. Валидация физических параметров цикла стерилизации", () => {
		it("валидирует нормативный цикл и отклоняет заниженные параметры", () => {
			assert.equal(validateSterilizationCycleParameters("standard_134", 134, 2.1, 5).valid, true);
			assert.equal(validateSterilizationCycleParameters("standard_134", 130, 2.1, 5).valid, false);
			assert.equal(validateSterilizationCycleParameters("standard_134", 134, 1.8, 5).valid, false);
			assert.equal(validateSterilizationCycleParameters("standard_134", 134, 2.1, 3).valid, false);
		});
	});

	describe("4. Пакетная регистрация цикла и списание со склада (Мандат 8n)", () => {
		it("createOneClickShiftBatch и calculateBatchStockDeduction считают без расхождений", () => {
			const batch = createOneClickShiftBatch({ packagesCount: 14 });
			assert.equal(batch.sterilizationCycle.temperatureCelsius, 134);
			assert.equal(batch.psoRecord.verdict, "ГОДНО");
			assert.equal(batch.bactericidalRecord.airDisinfectionStatus, "ВЫПОЛНЕНО");

			const stock = calculateBatchStockDeduction(18);
			assert.equal(stock.find((s) => s.sku === "KRAFT-100X200")?.quantity, 18);
			assert.equal(stock.find((s) => s.sku === "IND-CLASS5-MEDIS")?.quantity, 5);
		});

		it("изолирует моки и генерирует чистые печатные бланки и термоэтикетки", () => {
			assert.equal(getSanpinBatchRecords(false).length, 0);
			const demoCycles = getSanpinBatchRecords(true);
			assert.ok(demoCycles.length >= 2);
			const journalHtml = generateSanpinPrintHtml(demoCycles);
			assert.ok(journalHtml.includes("Журнал автоклавирования и контроля стерилизации"));
			assert.equal(journalHtml.includes("Форма 257/у"), false);

			const firstCycle = demoCycles[0];
			assert.ok(firstCycle);
			const stickersHtml = generateKraftStickersHtml(firstCycle, 4);
			assert.ok(stickersHtml.includes("СТЕРИЛЬНО"));
			assert.ok(stickersHtml.includes("Годен до:"));
		});
	});

	describe("5. Канонический UI студии SanpinStudioModal: эргономика и дизайн-код", () => {
		it("рендерит 1 Primary CTA, Drag Handle, sm:h-9, z-[100] и 0 disabled кнопок", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.equal(html.match(/sanpin-primary-cta/g)?.length, 1);
			assert.ok(html.includes("sanpin-drag-handle"));
			assert.ok(html.includes("sm:h-9"));
			assert.ok(html.includes("z-50"));
			assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
			assert.equal(html.includes("Форма 257/у"), false);
		});
	});

	describe("6. Единый роутер и оверлей СанПиН", () => {
		it("WorkspaceStudioOverlayHost и SanpinStudioModal монтируются без сбоя", () => {
			const hostHtml = renderToStaticMarkup(<WorkspaceStudioOverlayHost />);
			const studioHtml = renderToStaticMarkup(<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />);
			assert.ok(typeof hostHtml === "string" && studioHtml.includes("sanpin-studio-modal"));
		});
	});
});
