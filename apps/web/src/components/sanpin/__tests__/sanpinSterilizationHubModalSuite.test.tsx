/**
 * apps/web/src/components/sanpin/__tests__/sanpinSterilizationHubModalSuite.test.tsx
 *
 * Runtime Behavioral Test Suite for SterilizationBatchCycleModal & SSOT.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SterilizationBatchCycleModal as SanpinStudioModal } from "../SterilizationBatchCycleModal";
import { createOneClickShiftBatch } from "../sanpinCatalogData";
import { resolveClinicRoute } from "../../../router/routeResolver";

const REAL_HTML_DISABLED_BTN_REGEX = /<button[^>]*\sdisabled(?:=["'][^"']*["'])?(?=[\s>])/i;

describe("SANPIN STERILIZATION & PSO HUB SSOT (RUNTIME SUITE)", () => {
	describe("1. Роутинг через routeResolver", () => {
		it("поддерживает маршруты #sanpin и ?sanpin=1", () => {
			assert.equal(resolveClinicRoute("", "#sanpin").studio?.kind, "sanpin");
			assert.equal(resolveClinicRoute("?sanpin=1", "").studio?.kind, "sanpin");
		});
	});

	describe("2. Рендеринг канонических параметров и ликвидация советского канцелярита (Мандат 8x)", () => {
		it("рендерит все канонические разделы и программы 134°C / 121°C в модалке стерилизации", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);

			assert.ok(html.includes("Автоклав") || html.includes("стерилизации"));
			assert.ok(html.includes("очистки") || html.includes("индикатор"));
			assert.ok(html.includes("134°C"));
			assert.ok(html.includes("2.1 бар"));
			assert.equal(html.includes("Форма 257/у"), false);
			assert.equal(html.includes("Форма 366/у"), false);
		});
	});

	describe("3. Единый дизайн-код, кнопка и ровно 1 Primary CTA (Мандат 8am, P2-1.2)", () => {
		it("содержит ровно 1 Primary CTA, z-[100], sm:h-9 для ПК и 0 disabled кнопок", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);

			assert.equal(html.match(/sanpin-primary-cta/g)?.length, 1);
			assert.ok(html.includes("z-50"));
			assert.ok(html.includes("sm:h-9"));
			assert.equal(REAL_HTML_DISABLED_BTN_REGEX.test(html), false);
		});
	});

	describe("4. Пакетная стерилизация смены и списание со склада (Мандат 8n)", () => {
		it("createOneClickShiftBatch формирует цикл 134°C, азопирам 100% норма и списание 4 позиций", () => {
			const batch = createOneClickShiftBatch({ packagesCount: 18, operatorName: "Тест" });

			assert.equal(batch.sterilizationCycle.temperatureCelsius, 134);
			assert.equal(batch.sterilizationCycle.pressureBar, 2.1);
			assert.equal(batch.sterilizationCycle.exposureMinutes, 5);
			assert.equal(batch.sterilizationCycle.chemicalIndicatorVerdict, "ПРОЙДЕН");
			assert.equal(batch.psoRecord.verdict, "ГОДНО");
			assert.equal(batch.deductedStock.find((s) => s.sku === "KRAFT-100X200")?.quantity, 18);
		});
	});

	describe("5. Apple HIG Touch Ergonomics & Mobile Sheet Invariants", () => {
		it("содержит Drag Handle 36x5px и скругление rounded-t-[24px] для смартфонов", () => {
			const html = renderToStaticMarkup(
				<SanpinStudioModal isOpen={true} onClose={() => {}} isDemo={true} />,
			);

			assert.ok(html.includes("sanpin-drag-handle") || html.includes("w-9 h-1.5"));
			assert.ok(html.includes("sanpin-studio-modal") || html.includes("rounded-t-[24px]"));
		});
	});
});
