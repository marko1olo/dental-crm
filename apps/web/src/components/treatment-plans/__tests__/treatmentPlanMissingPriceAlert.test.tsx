/**
 * treatmentPlanMissingPriceAlert.test.tsx — тестирование MissingPriceAlert и интеграции со StageCard.
 * (Мандат 8b: строго <= 120 строк).
 */

import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { MissingPriceAlert } from "../MissingPriceAlert";
import { TreatmentPlanStageCard } from "../TreatmentPlanStageCard";
import type { TreatmentPlanStage } from "../types";
import { sampleItemMissingPrice, sampleItemPriced } from "./helpers/copilotTestHelpers";

describe("MissingPriceAlert Suite", () => {
	it("renders full banner alert when price is 0 or requiresManualPricing is true", () => {
		const html = renderToString(<MissingPriceAlert item={sampleItemMissingPrice} variant="full" />);
		assert.ok(html.includes("Требуется ручная оценка: услуга не найдена в прайс-листе клиники"));
		assert.ok(html.includes("Указать цену"));
		assert.ok(html.includes(sampleItemMissingPrice.name));
	});

	it("renders inline alert when variant is inline or compact", () => {
		const html = renderToString(<MissingPriceAlert item={sampleItemMissingPrice} variant="inline" />);
		assert.ok(html.includes("missing-price-alert-inline"));
		assert.ok(html.includes("Требуется ручная оценка"));
		assert.ok(html.includes("Указать цену"));
	});

	it("renders null if item has positive price and requiresManualPricing is false", () => {
		const html = renderToString(<MissingPriceAlert item={sampleItemPriced} variant="full" />);
		assert.equal(html, "");
	});

	it("renders MissingPriceAlert inside TreatmentPlanStageCard when an item is unpriced", () => {
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
		assert.ok(
			html.includes("missing-price-alert-item-custom-01") ||
			html.includes("Требуется ручная оценка: услуга не найдена в прайс-листе клиники"),
		);
	});
});
