import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import { MedicalTourismFxEscrowService } from "./MedicalTourismFxEscrowService.js";

describe("MedicalTourismFxEscrowService — Feature #338 FX Escrow", () => {
	test("1. Locks currency exchange rate accurately", () => {
		const amountForeign = "1000"; // 1000 USD
		const rate = "95.50"; // 95.50 RUB
		
		const result = MedicalTourismFxEscrowService.lockRate(amountForeign, rate);
		assert.equal(result, "95500.00");
	});

	test("2. Calculates stage breakdown accurately", () => {
		const totalRub = "100000.00";
		const stagePercent = 25; // 25%
		
		const result = MedicalTourismFxEscrowService.calculateStageBreakdown(totalRub, stagePercent);
		
		assert.equal(result.stageAmountRub, "25000.00");
		assert.equal(result.remainingEscrowRub, "75000.00");
	});
});
