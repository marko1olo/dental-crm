/**
 * apps/web/src/components/sanpin/__tests__/sterilizationSSOTSuite.test.tsx
 *
 * Runtime Behavioral Test Suite for Sterilization SSOT & Autoclave Cycles.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
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
} from "../sanpinCatalogData";
import { SterilizationBatchCycleModal as SanpinStudioModal } from "../SterilizationBatchCycleModal";
import { WorkspaceStudioOverlayHost } from "../../appLayout/WorkspaceStudioOverlayHost";
import { resolveClinicRoute } from "../../../router/routeResolver";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

describe("STERILIZATION SSOT & AUTOCLAVE RED TEAM SUITE", () => {
	describe("1. Единый роутинг СанПиН (Mandate 8aq)", () => {
		it("resolveClinicRoute распознаёт маршруты стерилизации", () => {
			assert.equal(resolveClinicRoute("", "#sanpin").studio?.kind, "sanpin");
			assert.equal(resolveClinicRoute("?sanpin=1", "").studio?.kind, "sanpin");
		});
	});

	describe("2. SSOT Каталог программ, автоклавов, индикаторов и упаковки", () => {
		it("содержит 4 канонических режима, автоклавы, индикаторы и упаковки", () => {
			assert.equal(AUTOCLAVE_PROGRAMS.length, 4);
			const standard = AUTOCLAVE_PROGRAMS.find((p) => p.id === "standard_134");
			const delicate = AUTOCLAVE_PROGRAMS.find((p) => p.id === "delicate_121");
			const flash = AUTOCLAVE_PROGRAMS.find((p) => p.id === "flash_134");
			const prion = AUTOCLAVE_PROGRAMS.find((p) => p.id === "prion_134");

			assert.ok(standard && delicate && flash && prion);
			assert.equal(standard.temperatureCelsius, 134);
			assert.equal(delicate.temperatureCelsius, 121);
			assert.equal(flash.exposureMinutes, 3);
			assert.equal(prion.exposureMinutes, 18);

			assert.ok(CLINIC_STERILIZERS.some((a) => a.model.includes("Melag") && a.autoclaveClass === "B"));
			assert.equal(CHEMICAL_INDICATORS.length, 2);
			assert.ok(STERILIZATION_PACKAGING.length >= 4);
			assert.ok(CLINICAL_BATCH_TEMPLATES.length >= 4);
		});
	});

	describe("3. Валидация физических параметров цикла стерилизации", () => {
		it("валидирует корректные циклы 134°C и 121°C и отклоняет нарушения", () => {
			assert.equal(validateSterilizationCycleParameters("standard_134", 134.2, 2.12, 5.0).valid, true);
			assert.equal(validateSterilizationCycleParameters("delicate_121", 121.5, 1.15, 20.0).valid, true);
			assert.equal(validateSterilizationCycleParameters("standard_134", 130.0, 2.1, 5.0).valid, false);
			assert.equal(validateSterilizationCycleParameters("standard_134", 134.0, 1.8, 5.0).valid, false);
			assert.equal(validateSterilizationCycleParameters("standard_134", 134.0, 2.1, 4.0).valid, false);
		});
	});

	describe("4. Пакетная стерилизация смены и списание со склада (Мандат 8n)", () => {
		it("рассчитывает списание материалов и формирует пакет смены", () => {
			const deductions = calculateBatchStockDeduction(16);
			assert.equal(deductions.length, 4);
			assert.equal(deductions.find((d) => d.sku === "KRAFT-100X200")?.quantity, 16);

			const batch = createOneClickShiftBatch({ packagesCount: 16 });
			assert.equal(batch.sterilizationCycle.packagesCount, 16);
			assert.equal(batch.psoRecord.verdict, "ГОДНО");
			assert.equal(batch.deductedStock.length, 4);
		});

		it("изолирует мокапы и генерирует печатный А4 бланк", () => {
			assert.equal(getSanpinBatchRecords(false).length, 0);
			const demoRecords = getSanpinBatchRecords(true);
			assert.ok(demoRecords.length >= 2);
			const html = generateSanpinPrintHtml(demoRecords);
			assert.ok(html.includes("<!DOCTYPE html>"));
			assert.ok(html.includes("Журнал контроля стерилизации"));
		});
	});

	describe("5. Рендеринг SterilizationBatchCycleModal: дизайн-код и эргономика", () => {
		it("рендерит ключевые разделы, Primary CTA, Drag Handle и 0 disabled кнопок", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);
			assert.ok(html.includes("Автоклав") || html.includes("стерилизации"));
			assert.ok(html.includes("Печать журнала"));
			assert.equal(html.match(/sanpin-primary-cta/g)?.length, 1);
			assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
			assert.ok(html.includes("sanpin-drag-handle") || html.includes("w-9 h-1.5"));
			assert.equal(html.includes("Форма 257/у"), false);
			assert.equal(html.includes("Форма 366/у"), false);
		});
	});

	describe("6. Единый роутер через WorkspaceStudioOverlayHost", () => {
		it("WorkspaceStudioOverlayHost корректно инициализируется", () => {
			const hostHtml = renderToStaticMarkup(<WorkspaceStudioOverlayHost />);
			assert.ok(typeof hostHtml === "string");
		});
	});
});
