/**
 * Unit Test Suite for Treatment Plan Multi-Variant Comparator & Presentation Studio
 * (DOMAIN: PLAN COMPARATOR)
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_TREATMENT_PLAN_PRESETS,
	type ComprehensivePlanVariant,
} from "../components/treatment-plans/comparator/planPresentationPresets";
import {
	calculateNdflTaxRefund,
	calculatePlanDifferential,
	generate3TierComparisonSummary,
	generatePaymentSchedules,
	getPlanCategoryBreakdown,
} from "../components/treatment-plans/comparator/planComparatorEngine";

describe("Treatment Plan Comparator - Clinical Presets & 3-Tier Model", () => {
	it("contains all 3 clinical archetypes (Optimum VIP, Standard Recommended, Economy Basic)", () => {
		const presets = DEFAULT_TREATMENT_PLAN_PRESETS;
		assert.ok(presets.optimum_vip);
		assert.ok(presets.standard_recommended);
		assert.ok(presets.economy_basic);

		// Optimum VIP characteristics
		assert.equal(presets.optimum_vip.tierCode, "optimum_vip");
		assert.equal(presets.optimum_vip.warrantyYears, 10);
		assert.equal(presets.optimum_vip.estimatedServiceLifeYears, 25);
		assert.equal(presets.optimum_vip.aestheticScore, 10);
		assert.match(presets.optimum_vip.implantSystem, /Straumann/);

		// Standard Recommended characteristics
		assert.equal(presets.standard_recommended.isRecommended, true);
		assert.equal(presets.standard_recommended.warrantyYears, 3);
		assert.equal(presets.standard_recommended.estimatedServiceLifeYears, 15);
		assert.equal(presets.standard_recommended.aestheticScore, 8.5);
		assert.match(presets.standard_recommended.implantSystem, /Osstem/);

		// Economy Basic characteristics
		assert.equal(presets.economy_basic.warrantyYears, 1);
		assert.equal(presets.economy_basic.estimatedServiceLifeYears, 5);
		assert.equal(presets.economy_basic.aestheticScore, 6.0);
	});

	it("calculates accurate clinical category cost breakdown and percentage shares", () => {
		const optimum = DEFAULT_TREATMENT_PLAN_PRESETS.optimum_vip;
		const breakdown = getPlanCategoryBreakdown(optimum);

		assert.equal(breakdown.totalRub, optimum.totalCostRub);
		assert.ok(breakdown.surgeryImplantRub > 0);
		assert.ok(breakdown.orthopedicsProstheticsRub > 0);
		assert.ok(breakdown.hygienePerioRub > 0);

		// Sum of category percentages should equal 100%
		const totalShare = breakdown.categories.reduce((acc, c) => acc + c.sharePercent, 0);
		assert.ok(Math.abs(totalShare - 100) < 0.5, `Total share ${totalShare}% should be ~100%`);
	});
});

describe("Treatment Plan Financial Math & Payment Schedules Engine", () => {
	it("calculates 100% single payment with 5% discount accurately", () => {
		const total = 500000;
		const payments = generatePaymentSchedules(total, true);

		// 5% of 500,000 = 25,000
		assert.equal(payments.singlePaymentWith5PctDiscount.discountRub, 25000);
		assert.equal(payments.singlePaymentWith5PctDiscount.finalPayableRub, 475000);
		assert.equal(payments.singlePaymentWith5PctDiscount.discountPct, 5);
	});

	it("generates staged 30/40/30 milestone payments with exact penny balance", () => {
		const total = 345678.99;
		const payments = generatePaymentSchedules(total, true);

		const { stage1DiagnosticRub, stage2SurgeryRub, stage3OrthopedicsRub, isBalanced } =
			payments.stagedPayment;

		assert.equal(isBalanced, true);
		const sum = Number((stage1DiagnosticRub + stage2SurgeryRub + stage3OrthopedicsRub).toFixed(2));
		assert.equal(sum, total);
	});

	it("generates 6, 12, and 24 month zero-overpayment installment schedules", () => {
		const total = 240000;
		const payments = generatePaymentSchedules(total, true);

		assert.equal(payments.installments.length, 3);

		// 6 months: 240,000 / 6 = 40,000
		const inst6 = payments.installments.find((i) => i.months === 6)!;
		assert.equal(inst6.monthlyPaymentRub, 40000);
		assert.equal(inst6.isZeroOverpayment, true);

		// 12 months: 240,000 / 12 = 20,000
		const inst12 = payments.installments.find((i) => i.months === 12)!;
		assert.equal(inst12.monthlyPaymentRub, 20000);

		// 24 months: 240,000 / 24 = 10,000
		const inst24 = payments.installments.find((i) => i.months === 24)!;
		assert.equal(inst24.monthlyPaymentRub, 10000);
	});

	it("calculates NDFL 13% tax deduction: standard Code 01 (capped) vs high-cost Code 02 (uncapped)", () => {
		// Standard therapy plan of 300,000 руб (Code 01 capped at 150,000 -> 13% of 150,000 = 19,500)
		const standardNdfl = calculateNdflTaxRefund(300000, false);
		assert.equal(standardNdfl.code, "01");
		assert.equal(standardNdfl.refundAmountRub, 19500);
		assert.equal(standardNdfl.effectiveNetCostRub, 300000 - 19500);

		// High-cost surgical implant plan of 580,000 руб (Code 02 uncapped -> 13% of 580,000 = 75,400)
		const surgicalNdfl = calculateNdflTaxRefund(580000, true);
		assert.equal(surgicalNdfl.code, "02");
		assert.equal(surgicalNdfl.refundAmountRub, 75400);
		assert.equal(surgicalNdfl.effectiveNetCostRub, 580000 - 75400);
	});
});

describe("Differential Plan Comparison & Multi-Variant Summary", () => {
	it("computes accurate differential delta metrics between Standard and Optimum plans", () => {
		const standard = DEFAULT_TREATMENT_PLAN_PRESETS.standard_recommended;
		const optimum = DEFAULT_TREATMENT_PLAN_PRESETS.optimum_vip;

		const diff = calculatePlanDifferential(standard, optimum);

		assert.equal(diff.baseTier, "standard_recommended");
		assert.equal(diff.targetTier, "optimum_vip");
		assert.equal(diff.costDeltaRub, optimum.totalCostRub - standard.totalCostRub);
		assert.equal(diff.warrantyYearsDelta, 10 - 3); // 7 years
		assert.equal(diff.serviceLifeYearsDelta, 25 - 15); // 10 years
		assert.equal(diff.aestheticScoreDelta, 1.5); // 10 - 8.5
		assert.ok(diff.costPerYearServiceTargetRub > 0);
		assert.ok(diff.costPerYearServiceBaseRub > 0);
	});

	it("generates 3-Tier comparison summary and selects appropriate leader tags", () => {
		const summary = generate3TierComparisonSummary(DEFAULT_TREATMENT_PLAN_PRESETS);

		assert.equal(summary.recommendedTier, "standard_recommended");
		assert.equal(summary.lowestInitialCostTier, "economy_basic");
		assert.equal(summary.longestServiceLifeTier, "optimum_vip");
		assert.equal(summary.highestAestheticTier, "optimum_vip");
		assert.ok(summary.tierSummaries.optimum_vip);
		assert.ok(summary.tierSummaries.standard_recommended);
		assert.ok(summary.tierSummaries.economy_basic);
	});
});
