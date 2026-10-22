/**
 * treatmentPlanPresenterHierarchyAndPayment.test.tsx — иерархия тарифов, график 30/40/30 и скидки.
 * (Мандат 8b: строго <= 120 строк).
 */

import { describe, it, expect } from "vitest";
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
		expect(mockTiersPresenter).toHaveLength(3);
		const economy = mockTiersPresenter.find((t) => t.tierId === "economy")!;
		const standard = mockTiersPresenter.find((t) => t.tierId === "standard")!;
		const optimum = mockTiersPresenter.find((t) => t.tierId === "optimum")!;

		expect(economy.totalRub).toBeGreaterThan(0);
		expect(standard.totalRub).toBeGreaterThanOrEqual(economy.totalRub);
		expect(optimum.totalRub).toBeGreaterThanOrEqual(standard.totalRub);

		for (const tier of mockTiersPresenter) {
			for (const stage of tier.stages) {
				for (const item of stage.items) {
					expect(item.code804n).toMatch(/^A\d{2}\.\d{2}\.\d{3}/);
					expect(item.unitPriceRub).toBeGreaterThan(0);
				}
			}
		}
	});

	it("calculates exact 30/40/30 payment milestones with zero kopeck drift", () => {
		const totalKopecks = parseKopecks(mockStandardTierPresenter.totalRub);
		const schedule = calculateStaged304030Schedule(totalKopecks, true);

		expect(schedule.isBalanced).toBe(true);
		expect(schedule.partsKopecks).toHaveLength(3);
		const sumMilestonesKopecks =
			schedule.stage1AdvanceTherapyKopecks +
			schedule.stage2SurgeryImplantKopecks +
			schedule.stage3OrthopedicsKopecks;
		expect(sumMilestonesKopecks).toBe(totalKopecks);
	});

	it("computes 0% installments and 13% NDFL tax deduction accurately", () => {
		const totalRub = mockStandardTierPresenter.totalRub;
		const installment12 = Math.round(totalRub / 12);
		expect(mockStandardTierPresenter.monthlyInstallment12Rub).toBe(installment12);

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
		expect(deduction.grandTotalRefund13Kopecks).toBeGreaterThan(0);
		expect(deduction.netPriceWithRefundRub).toBeLessThanOrEqual(deduction.grandTotalRub);
	});

	it("applies doctor discount and clamps percentages to [0, 100]", () => {
		const discountedStages = applyDoctorDiscountToStages(mockStandardTierPresenter.stages, 15);
		const recalculated = recalculateTierTotals(mockStandardTierPresenter, discountedStages);
		expect(recalculated.totalRub).toBeLessThan(mockStandardTierPresenter.totalRub);

		const clampedZero = applyDoctorDiscountToStages(mockStandardTierPresenter.stages, -10);
		expect(recalculateTierTotals(mockStandardTierPresenter, clampedZero).totalRub).toBe(mockStandardTierPresenter.totalRub);

		const clampedHundred = applyDoctorDiscountToStages(mockStandardTierPresenter.stages, 120);
		expect(recalculateTierTotals(mockStandardTierPresenter, clampedHundred).totalRub).toBe(0);
	});
});
