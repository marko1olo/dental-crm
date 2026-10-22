/**
 * planPriceValidationAutonomyAndWorkOrder.test.ts — генерация наряд-заказов и автономия врача (Мандат 8e).
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	generateWorkOrderExportPayload,
	validateTreatmentPlanPrices,
} from "../validation/planPriceValidationEngine";
import {
	PLAN_PRICE_POLICY_PRESETS,
	SAMPLE_CURRENT_PRICELIST,
	SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
} from "../validation/planPriceValidationPresets";

describe("planPriceValidationEngine — Наряд-заказы и автономия (Мандат 8e)", () => {
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

		const act = generateWorkOrderExportPayload(report, "completed_works_act");
		assert.ok(act.orderNumber.startsWith("АВР-"));
		assert.equal(act.orderType, "completed_works_act");
	});

	test("Мандат 8e: план составленный более 30 дней назад НЕ БЛОКИРУЕТ создание нарядов ЗТЛ или оплату", () => {
		const preset = PLAN_PRICE_POLICY_PRESETS.standard_30;
		const expiredDateIso = new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString();
		const expiredPlan = {
			...SAMPLE_TREATMENT_PLAN_FOR_VALIDATION,
			createdAtIso: expiredDateIso,
			items: SAMPLE_TREATMENT_PLAN_FOR_VALIDATION.items.slice(0, 4),
		};

		const report = validateTreatmentPlanPrices(expiredPlan, SAMPLE_CURRENT_PRICELIST, preset);
		assert.equal(report.isPlanExpired, true);
		assert.ok(report.planAgeDays >= 45);
		assert.equal(report.canGenerateWorkOrder, true);
		assert.equal(report.canGenerateCompletedAct, true);
		assert.equal(report.overallStatus, "APPROVED_PRICE_LOCKED");

		const workOrder = generateWorkOrderExportPayload(report, "work_order");
		assert.ok(workOrder.orderNumber.startsWith("НЗ-"));
		assert.equal(workOrder.totalPayableRub, report.resolvedNetRub);

		const expiredPlanWithArchived = { ...SAMPLE_TREATMENT_PLAN_FOR_VALIDATION, createdAtIso: expiredDateIso };
		const reportDoctorAutonomy = validateTreatmentPlanPrices(
			expiredPlanWithArchived,
			SAMPLE_CURRENT_PRICELIST,
			preset,
			undefined,
			undefined,
			{ isAuthorized: true, authorizedByAdminName: "Лечащий врач (автономия)" },
		);
		assert.ok(reportDoctorAutonomy.overallStatus.startsWith("APPROVED_"));
		assert.equal(reportDoctorAutonomy.canGenerateWorkOrder, true);
	});
});
