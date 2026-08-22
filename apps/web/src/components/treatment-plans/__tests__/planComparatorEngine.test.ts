/**
 * planComparatorEngine.test.ts — тестирование дифференциальной математики компаратора планов,
 * разбивки по категориям, графиков оплат и налогового вычета 13% НДФЛ.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	calculateNdflTaxRefund,
	calculatePlanDifferential,
	generate3TierComparisonSummary,
	generatePaymentSchedules,
	getPlanCategoryBreakdown,
} from "../comparator/planComparatorEngine";
import { DEFAULT_TREATMENT_PLAN_PRESETS } from "../comparator/planPresentationPresets";

describe("planComparatorEngine: 3-Tier Multi-Variant Presentation & Payment Math", () => {
	test("getPlanCategoryBreakdown корректно распределяет затраты по 4 клиническим категориям", () => {
		const opt = DEFAULT_TREATMENT_PLAN_PRESETS.optimum_vip;
		const breakdown = getPlanCategoryBreakdown(opt);

		assert.ok(breakdown.totalRub > 0);
		assert.equal(breakdown.categories.length, 4);

		const totalSumOfCategories =
			breakdown.surgeryImplantRub +
			breakdown.orthopedicsProstheticsRub +
			breakdown.therapyEndoRub +
			breakdown.hygienePerioRub;

		assert.equal(
			totalSumOfCategories,
			opt.totalCostRub,
			"Сумма по категориям должна в точности равняться общей стоимости плана",
		);

		// Проверяем наличие долей в процентах
		for (const cat of breakdown.categories) {
			assert.ok(cat.sharePercent >= 0 && cat.sharePercent <= 100);
			assert.ok(cat.categoryNameRu.length > 0);
		}
	});

	test("calculateNdflTaxRefund рассчитывает возврат для Код 01 (лимит) и Код 02 (без лимита)", () => {
		// Код 02: Дорогостоящее (350 000 ₽) -> 13% = 45 500 ₽
		const res02 = calculateNdflTaxRefund(350000, true);
		assert.equal(res02.code, "02");
		assert.equal(res02.refundAmountRub, 45500);
		assert.equal(res02.effectiveNetCostRub, 304500);

		// Код 01: Стандартное (200 000 ₽) -> Лимит 150 000 ₽ -> 13% = 19 500 ₽
		const res01 = calculateNdflTaxRefund(200000, false);
		assert.equal(res01.code, "01");
		assert.equal(res01.refundAmountRub, 19500);
		assert.equal(res01.effectiveNetCostRub, 180500);
	});

	test("generatePaymentSchedules формирует точный график платежей, скидку 5% и рассрочку", () => {
		const totalRub = 250000;
		const sched = generatePaymentSchedules(totalRub, true);

		assert.equal(sched.grossTotalRub, 250000);

		// 1. Скидка 5%
		assert.equal(sched.singlePaymentWith5PctDiscount.discountRub, 12500);
		assert.equal(sched.singlePaymentWith5PctDiscount.finalPayableRub, 237500);

		// 2. Поэтапная оплата 30/40/30
		assert.equal(sched.stagedPayment.stage1DiagnosticRub, 75000);
		assert.equal(sched.stagedPayment.stage2SurgeryRub, 100000);
		assert.equal(sched.stagedPayment.stage3OrthopedicsRub, 75000);
		assert.equal(sched.stagedPayment.isBalanced, true);

		// 3. Рассрочка (6, 12, 24 мес)
		assert.equal(sched.installments.length, 3);
		assert.equal(sched.installments[0]?.months, 6);
		assert.equal(sched.installments[1]?.months, 12);
		assert.equal(sched.installments[2]?.months, 24);
		assert.ok(sched.installments[1]!.monthlyPaymentRub > 0);
	});

	test("calculatePlanDifferential вычисляет дельты стоимости, сроков и стоимости за 1 год службы", () => {
		const econ = DEFAULT_TREATMENT_PLAN_PRESETS.economy_basic;
		const opt = DEFAULT_TREATMENT_PLAN_PRESETS.optimum_vip;

		const diff = calculatePlanDifferential(econ, opt);
		assert.equal(diff.baseTier, "economy_basic");
		assert.equal(diff.targetTier, "optimum_vip");

		assert.ok(diff.costDeltaRub > 0, "Премиум дороже эконома");
		assert.ok(diff.serviceLifeYearsDelta > 0, "Срок службы премиума дольше");
		assert.ok(diff.aestheticScoreDelta > 0, "Эстетический индекс премиума выше");
		assert.ok(diff.costPerYearServiceBaseRub > 0);
		assert.ok(diff.costPerYearServiceTargetRub > 0);
	});

	test("generate3TierComparisonSummary сводит 3 варианта и определяет оптимальные номинации", () => {
		const summary = generate3TierComparisonSummary(DEFAULT_TREATMENT_PLAN_PRESETS);

		assert.equal(summary.recommendedTier, "standard_recommended");
		assert.equal(summary.lowestInitialCostTier, "economy_basic");
		assert.equal(summary.longestServiceLifeTier, "optimum_vip");
		assert.equal(summary.highestAestheticTier, "optimum_vip");

		assert.ok(summary.tierSummaries.economy_basic);
		assert.ok(summary.tierSummaries.standard_recommended);
		assert.ok(summary.tierSummaries.optimum_vip);
	});
});
