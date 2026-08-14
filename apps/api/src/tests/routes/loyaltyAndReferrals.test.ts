import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateCashbackPoints,
	calculateMaxRedeemablePoints,
} from "@dental/shared";

describe("Loyalty and Bonus Points Engine", () => {
	it("calculates maximum allowable points redemption up to 30% coverage", () => {
		// Invoice 10,000 ₽, patient has 5,000 points, max coverage 30% = max 3,000 ₽
		const res1 = calculateMaxRedeemablePoints(10000, 5000, 30, 1);
		assert.equal(res1.maxAllowedPoints, 3000);
		assert.equal(res1.maxDiscountRub, 3000);
		assert.equal(res1.remainingPaymentRub, 7000);

		// Invoice 10,000 ₽, patient has only 1,200 points = can redeem all 1,200 points
		const res2 = calculateMaxRedeemablePoints(10000, 1200, 30, 1);
		assert.equal(res2.maxAllowedPoints, 1200);
		assert.equal(res2.maxDiscountRub, 1200);
		assert.equal(res2.remainingPaymentRub, 8800);

		// Zero balance check
		const res3 = calculateMaxRedeemablePoints(5000, 0, 30, 1);
		assert.equal(res3.maxAllowedPoints, 0);
		assert.equal(res3.maxDiscountRub, 0);
		assert.equal(res3.remainingPaymentRub, 5000);
	});

	it("calculates cashback points from paid treatment amounts", () => {
		// 5% cashback on 20,000 ₽ treatment = 1,000 bonus points
		assert.equal(calculateCashbackPoints(20000, 5, 1), 1000);

		// 3% standard bronze tier cashback on 4,500 ₽ = 135 bonus points
		assert.equal(calculateCashbackPoints(4500, 3, 1), 135);

		// 0% edge case
		assert.equal(calculateCashbackPoints(10000, 0, 1), 0);
	});
});
