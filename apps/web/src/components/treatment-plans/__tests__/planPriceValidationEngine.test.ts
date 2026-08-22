/**
 * planPriceValidationEngine.test.ts — тестирование финансово-валидационного движка проверки цен,
 * сопоставления с каталогом, срока действия сметы и экспорта в наряд-заказ / акт.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	applyBatchResolutionToAllItems,
	calculateDaysBetween,
	findCatalogService,
	generateWorkOrderExportPayload,
	validateSinglePlanItem,
	validateTreatmentPlanPrices,
} from "../validation/planPriceValidationEngine";
import {
	PLAN_PRICE_POLICY_PRESETS,
	SAMPLE_CURRENT_PRICELIST,
	SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
} from "../validation/planPriceValidationPresets";

describe("planPriceValidationEngine: Pricelist Matching, Inflation Thresholds & Export", () => {
	test("calculateDaysBetween точно считает разницу в днях между датами", () => {
		const start = "2026-08-01T00:00:00.000Z";
		const end = "2026-08-21T00:00:00.000Z";
		assert.equal(calculateDaysBetween(start, end), 20);
	});

	test("findCatalogService сопоставляет услугу сначала по ID, затем по коду 804н", () => {
		const byId = findCatalogService(
			"A16.07.054.001",
			"srv_implant_straumann",
			SAMPLE_CURRENT_PRICELIST,
		);
		assert.ok(byId);
		assert.equal(byId?.id, "srv_implant_straumann");

		const byCode = findCatalogService(
			"A16.07.050",
			undefined,
			SAMPLE_CURRENT_PRICELIST,
		);
		assert.ok(byCode);
		assert.equal(byCode?.code804n, "A16.07.050");
	});

	test("validateSinglePlanItem корректно определяет подорожание, удешевление и архивные позиции", () => {
		const preset = PLAN_PRICE_POLICY_PRESETS.standard_30;

		// 1. Подорожание
		const itemIncreased = SAMPLE_TREATMENT_PLAN_FOR_VALIDATION.items[0]!;
		const resInc = validateSinglePlanItem(
			itemIncreased,
			SAMPLE_CURRENT_PRICELIST,
			preset,
			false,
		);
		assert.equal(resInc.discrepancyKind, "PRICE_INCREASED");
		assert.ok(resInc.unitPriceDeltaRub > 0);

		// 2. Архивный статус (позиция item_5 в SAMPLE_TREATMENT_PLAN_FOR_VALIDATION)
		const itemArchived = SAMPLE_TREATMENT_PLAN_FOR_VALIDATION.items[4]!;
		const resArch = validateSinglePlanItem(
			itemArchived,
			SAMPLE_CURRENT_PRICELIST,
			preset,
			false,
		);
		assert.equal(resArch.discrepancyKind, "SERVICE_ARCHIVED");
		assert.equal(resArch.isArchived, true);
	});

	test("validateTreatmentPlanPrices формирует полный отчет с расчетом абсорбции клиникой", () => {
		const preset = PLAN_PRICE_POLICY_PRESETS.standard_30;
		const report = validateTreatmentPlanPrices(
			SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
			SAMPLE_CURRENT_PRICELIST,
			preset,
		);

		assert.ok(report.totalItemsCount > 0);
		assert.ok(report.originalPlanNetRub > 0);
		assert.ok(report.currentCatalogGrossRub > 0);
		assert.ok(report.resolvedNetRub > 0);

		// Пакетная фиксация цен
		const reportFixed = applyBatchResolutionToAllItems(
			SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
			SAMPLE_CURRENT_PRICELIST,
			preset,
			"LOCK_ORIGINAL_PRICE",
		);
		assert.ok(reportFixed.totalClinicAbsorptionRub >= 0);
	});

	test("generateWorkOrderExportPayload формирует структуру Наряд-заказа и Акта", () => {
		const preset = PLAN_PRICE_POLICY_PRESETS.standard_30;
		const report = validateTreatmentPlanPrices(
			SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
			SAMPLE_CURRENT_PRICELIST,
			preset,
			undefined,
			undefined,
			{ isAuthorized: true, authorizedByAdminName: "Главный врач" },
		);

		const workOrder = generateWorkOrderExportPayload(report, "work_order");
		assert.ok(workOrder.orderNumber.startsWith("НЗ-"));
		assert.equal(workOrder.orderType, "work_order");
		assert.equal(workOrder.isApprovedByManager, true);
		assert.equal(workOrder.items.length, report.items.length);

		const act = generateWorkOrderExportPayload(report, "completed_works_act");
		assert.ok(act.orderNumber.startsWith("АВР-"));
		assert.equal(act.orderType, "completed_works_act");
	});
});
