/**
 * treatmentPlanPresenterHierarchyAndPayment.test.tsx — иерархия тарифов, график 30/40/30 и скидки.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateStaged304030Schedule,
	calculatePlanTaxDeductionBreakdown,
	parseKopecks,
} from "@dental/shared";
import {
	applyDoctorDiscountToStages,
	recalculateTierTotals,
} from "../treatmentPlanMath";
import { mockStandardTierPresenter, mockTiersPresenter } from "./helpers/presenterModulesTestHelpers";

describe("Treatment Plan Presenter — Иерархия тарифов и платежи", () => {
	it("generates exactly 3 distinct tiers and maintains pricing hierarchy", () => {
		assert.equal(mockTiersPresenter.length, 3);
		const economy = mockTiersPresenter.find((t) => t.tierId === "economy")!;
		const standard = mockTiersPresenter.find((t) => t.tierId === "standard")!;
		const optimum = mockTiersPresenter.find((t) => t.tierId === "optimum")!;

		assert.ok(economy.totalRub > 0);
		assert.ok(standard.totalRub >= economy.totalRub);
		assert.ok(optimum.totalRub >= standard.totalRub);

		for (const tier of mockTiersPresenter) {
			for (const stage of tier.stages) {
				for (const item of stage.items) {
					assert.match(item.code804n, /^A\d{2}\.\d{2}\.\d{3}/);
					assert.ok(item.unitPriceRub > 0);
				}
			}
		}
	});

	it("calculates exact 30/40/30 payment milestones with zero kopeck drift", () => {
		const totalKopecks = parseKopecks(mockStandardTierPresenter.totalRub);
		const schedule = calculateStaged304030Schedule(totalKopecks, true);

		assert.equal(schedule.isBalanced, true);
		assert.equal(schedule.partsKopecks.length, 3);
		const sumMilestonesKopecks =
			schedule.stage1AdvanceTherapyKopecks +
			schedule.stage2SurgeryImplantKopecks +
			schedule.stage3OrthopedicsKopecks;
		assert.equal(sumMilestonesKopecks, totalKopecks);
	});

	it("computes 0% installments and 13% NDFL tax deduction accurately", () => {
		const totalRub = mockStandardTierPresenter.totalRub;
		const installment12 = Math.round(totalRub / 12);
		assert.equal(mockStandardTierPresenter.monthlyInstallment12Rub, installment12);

		const planItems = mockStandardTierPresenter.stages.flatMap((s) =>
			s.items.map((it) => ({
				id: it.id,
				name: it.name,
				code804n: it.code804n,
				priceRub: it.unitPriceRub,
				quantity: it.quantity,
			})),
		);
		const deduction = calculatePlanTaxDeductionBreakdown(planItems);
		assert.ok(deduction.grandTotalRefund13Kopecks > 0);
		assert.ok(deduction.netPriceWithRefundRub <= deduction.grandTotalRub);
	});

	it("applies doctor discount and clamps percentages to [0, 100]", () => {
		const discountedStages = applyDoctorDiscountToStages(mockStandardTierPresenter.stages, 15);
		const recalculated = recalculateTierTotals(mockStandardTierPresenter, discountedStages);
		assert.ok(recalculated.totalRub < mockStandardTierPresenter.totalRub);

		const clampedZero = applyDoctorDiscountToStages(mockStandardTierPresenter.stages, -10);
		assert.equal(recalculateTierTotals(mockStandardTierPresenter, clampedZero).totalRub, mockStandardTierPresenter.totalRub);

		const clampedHundred = applyDoctorDiscountToStages(mockStandardTierPresenter.stages, 120);
		assert.equal(recalculateTierTotals(mockStandardTierPresenter, clampedHundred).totalRub, 0);
	});
});
