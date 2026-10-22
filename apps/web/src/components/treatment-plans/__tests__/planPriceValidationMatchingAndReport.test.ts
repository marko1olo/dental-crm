/**
 * planPriceValidationMatchingAndReport.test.ts — сопоставление с каталогом, разница цен и отчет валидации.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	applyBatchResolutionToAllItems,
	calculateDaysBetween,
	findCatalogService,
	validateSinglePlanItem,
	validateTreatmentPlanPrices,
} from "../validation/planPriceValidationEngine";
import {
	PLAN_PRICE_POLICY_PRESETS,
	SAMPLE_CURRENT_PRICELIST,
	SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
} from "../validation/planPriceValidationPresets";

describe("planPriceValidationEngine — Сопоставление с каталогом и отчет", () => {
	test("calculateDaysBetween точно считает разницу в днях между датами", () => {
		assert.equal(calculateDaysBetween("2026-08-01T00:00:00.000Z", "2026-08-21T00:00:00.000Z"), 20);
	});

	test("findCatalogService сопоставляет услугу сначала по ID, затем по коду 804н", () => {
		const byId = findCatalogService("A16.07.054.001", "srv_implant_straumann", SAMPLE_CURRENT_PRICELIST);
		assert.equal(byId?.id, "srv_implant_straumann");

		const byCode = findCatalogService("A16.07.050", undefined, SAMPLE_CURRENT_PRICELIST);
		assert.equal(byCode?.code804n, "A16.07.050");
	});

	test("validateSinglePlanItem корректно определяет подорожание и архивные позиции", () => {
		const preset = PLAN_PRICE_POLICY_PRESETS.standard_30;
		const resInc = validateSinglePlanItem(SAMPLE_TREATMENT_PLAN_FOR_VALIDATION.items[0]!, SAMPLE_CURRENT_PRICELIST, preset, false);
		assert.equal(resInc.discrepancyKind, "PRICE_INCREASED");
		assert.ok(resInc.unitPriceDeltaRub > 0);

		const resArch = validateSinglePlanItem(SAMPLE_TREATMENT_PLAN_FOR_VALIDATION.items[4]!, SAMPLE_CURRENT_PRICELIST, preset, false);
		assert.equal(resArch.discrepancyKind, "SERVICE_ARCHIVED");
		assert.equal(resArch.isArchived, true);
	});

	test("validateTreatmentPlanPrices формирует полный отчет с расчетом абсорбции клиникой", () => {
		const preset = PLAN_PRICE_POLICY_PRESETS.standard_30;
		const report = validateTreatmentPlanPrices(SAMPLE_TREATMENT_PLAN_FOR_VALIDATION, SAMPLE_CURRENT_PRICELIST, preset);

		assert.ok(report.totalItemsCount > 0);
		assert.ok(report.originalPlanNetRub > 0);
		assert.ok(report.currentCatalogGrossRub > 0);
		assert.ok(report.resolvedNetRub > 0);

		const reportFixed = applyBatchResolutionToAllItems(SAMPLE_TREATMENT_PLAN_FOR_VALIDATION, SAMPLE_CURRENT_PRICELIST, preset, "LOCK_ORIGINAL_PRICE");
		assert.ok(reportFixed.totalClinicAbsorptionRub >= 0);
	});
});
