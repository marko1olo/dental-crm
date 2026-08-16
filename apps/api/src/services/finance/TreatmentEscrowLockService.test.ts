import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { TreatmentEscrowLockService } from "./TreatmentEscrowLockService.js";

describe("TreatmentEscrowLockService — Feature #258 Treatment Plan Escrow Lock", () => {
	test("1. Calculates proportional stage release accurately with Decimal.js", () => {
		const totalEscrow = "150000.00"; // 150 000 руб за тотальную реабилитацию
		const stagePercent = 33.33; // 1-й хирургический этап (установка имплантатов)

		const result = TreatmentEscrowLockService.calculateStageRelease(totalEscrow, stagePercent);
		assert.equal(result.releaseAmountRub, "49995.00");
		assert.equal(result.remainingEscrowRub, "100005.00");
	});

	test("2. Calculates exact remaining refund on contract termination", () => {
		const totalEscrow = "200000.00";
		const releasedAmount = "85000.50";

		const refund = TreatmentEscrowLockService.calculateRefundAmount(totalEscrow, releasedAmount);
		assert.equal(refund, "114999.50");
	});
});
