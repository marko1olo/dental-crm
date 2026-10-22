/**
 * treatmentPlanMathInstallmentsAndNdfl.test.ts — расчет рассрочки 0% и вычета 13% НДФЛ.
 * (Мандат 8b: строго <= 120 строк).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Kopecks } from "@dental/shared";
import {
	calculateChairsideInstallments,
	calculateChairsideTaxDeduction,
	NDFL_STANDARD_ANNUAL_LIMIT_RUB,
	NDFL_STANDARD_ANNUAL_LIMIT_KOPECKS,
} from "../treatmentPlanMath";

describe("treatmentPlanMath — Рассрочка 0% и вычет 13% НДФЛ", () => {
	it("returns 0 for zero or negative kopecks", () => {
		const installments = calculateChairsideInstallments(0 as Kopecks);
		for (const months of [3, 6, 12, 24] as const) {
			const plan = installments[months];
			assert.ok(plan);
			assert.equal(plan.monthlyPaymentRub, 0);
			assert.equal(plan.remainderKopecks, 0);
			assert.equal(plan.partsKopecks.length, months);
		}
	});

	it("distributes odd kopecks to first payment ensuring exact sum parity", () => {
		const oddKopecks = 10000001 as Kopecks;
		const installments = calculateChairsideInstallments(oddKopecks);

		for (const months of [3, 6, 12, 24] as const) {
			const plan = installments[months];
			assert.ok(plan);
			assert.equal(plan.months, months);
			assert.equal(plan.partsKopecks.length, months);

			const sumOfParts = plan.partsKopecks.reduce((acc, p) => (acc + p) as Kopecks, 0 as Kopecks);
			assert.equal(sumOfParts, oddKopecks);
			assert.equal(plan.partsKopecks[0], (plan.monthlyPaymentKopecks + plan.remainderKopecks) as Kopecks);
		}
	});

	it("calculates 12 months installment for 120 000 ₽ exactly", () => {
		const total = 12000000 as Kopecks;
		const installments = calculateChairsideInstallments(total);
		const plan12 = installments[12];
		assert.ok(plan12);
		assert.equal(plan12.monthlyPaymentRub, 10000);
		assert.equal(plan12.remainderKopecks, 0);
		assert.equal(plan12.partsKopecks.every((p) => p === 1000000), true);
	});

	it("calculates Code 01 standard deduction capped at 150 000 ₽ limit", () => {
		assert.equal(NDFL_STANDARD_ANNUAL_LIMIT_RUB, 150000);
		assert.equal(NDFL_STANDARD_ANNUAL_LIMIT_KOPECKS, 15000000);

		const under = calculateChairsideTaxDeduction(10000000 as Kopecks, false);
		assert.equal(under.code, "01");
		assert.equal(under.isHighCostTreatment, false);
		assert.equal(under.refundRub, 13000);
		assert.equal(under.finalPriceWithRefundRub, 87000);

		const over = calculateChairsideTaxDeduction(30000000 as Kopecks, false);
		assert.equal(over.code, "01");
		assert.equal(over.refundRub, 19500);
		assert.equal(over.finalPriceWithRefundRub, 280500);
	});

	it("calculates Code 02 expensive treatment deduction WITHOUT limit", () => {
		const highCost = calculateChairsideTaxDeduction(40000000 as Kopecks, true);
		assert.equal(highCost.code, "02");
		assert.equal(highCost.isHighCostCode02, true);
		assert.equal(highCost.annualLimitRub, undefined);
		assert.equal(highCost.refundRub, 52000);
		assert.equal(highCost.finalPriceWithRefundRub, 348000);
	});
});
