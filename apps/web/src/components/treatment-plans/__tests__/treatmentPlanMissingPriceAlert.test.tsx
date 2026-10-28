/**
 * treatmentPlanMissingPriceAlert.test.tsx — тестирование спокойного инлайн-редактора цены услуги.
 * Никаких панических алертов и красных баннеров (Мандат 8e, Мандат 8b: <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { MissingPriceAlert } from "../MissingPriceAlert";
import { TreatmentPlanStageCard } from "../TreatmentPlanStageCard";
import { parseKopecksFromRubString } from "../useMissingPriceAlert";
import type { TreatmentPlanStage } from "../types";
import { sampleItemMissingPrice, sampleItemPriced } from "./helpers/copilotTestHelpers";

describe("MissingPriceAlert Suite — Спокойный инлайн-инпут цены без панических баннеров", () => {
	it("renders calm custom pricing panel when price is 0 or requiresManualPricing is true", () => {
		const html = renderToString(<MissingPriceAlert item={sampleItemMissingPrice} variant="full" />);
		assert.ok(html.includes("Индивидуальная цена"));
		assert.ok(html.includes("Указать цену"));
		assert.ok(html.includes("Гарантия 0 ₽"));
		assert.ok(html.includes(sampleItemMissingPrice.name));
		assert.equal(html.includes("услуга не найдена в прайс-листе"), false, "No scary bureaucratic text");
	});

	it("renders inline calm alert when variant is inline or compact", () => {
		const html = renderToString(<MissingPriceAlert item={sampleItemMissingPrice} variant="inline" />);
		assert.ok(html.includes("missing-price-alert-inline"));
		assert.ok(html.includes("Индивидуальная цена"));
		assert.ok(html.includes("Указать цену"));
		assert.ok(html.includes("Гарантия 0 ₽"));
	});

	it("renders null if item has positive price and requiresManualPricing is false", () => {
		const html = renderToString(<MissingPriceAlert item={sampleItemPriced} variant="full" />);
		assert.equal(html, "");
	});

	it("renders calm price editor inside TreatmentPlanStageCard when an item is unpriced", () => {
		const sampleStageWithMissingPrice: TreatmentPlanStage = {
			stageNumber: 1,
			stageKind: "stage_1_therapy",
			title: "Этап 1: Неотложная помощь и санация",
			subtitle: "Санация",
			clinicalGoal: "Ликвидация очагов инфекции",
			items: [sampleItemMissingPrice, sampleItemPriced],
			totalRub: 4500,
			totalKopecks: 450000 as any,
			estimatedVisits: 1,
			estimatedWeeks: 1,
			order804nCodes: ["A16.07.002.099", "A16.07.002.001"],
		};

		const html = renderToString(<TreatmentPlanStageCard stage={sampleStageWithMissingPrice} defaultExpanded={true} />);
		assert.ok(html.includes("missing-price-alert-item-custom-01") || html.includes("Индивидуальная цена"));
		assert.equal(html.includes("услуга не найдена в прайс-листе"), false);
	});

	it("accurately parses amountKopecks without floating point errors", () => {
		const res1 = parseKopecksFromRubString("4500.50");
		assert.ok(res1);
		assert.equal(res1.kopecks, 450050);
		assert.equal(res1.rub, 4500.5);

		const res2 = parseKopecksFromRubString("0");
		assert.ok(res2);
		assert.equal(res2.kopecks, 0);
		assert.equal(res2.rub, 0);

		const res3 = parseKopecksFromRubString("  12 990,99 ");
		assert.ok(res3);
		assert.equal(res3.kopecks, 1299099);
		assert.equal(res3.rub, 12990.99);

		const invalid = parseKopecksFromRubString("abc");
		assert.equal(invalid, null);
	});
});
