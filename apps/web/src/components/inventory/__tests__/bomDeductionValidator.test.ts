import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validateDeductionBalances } from "../deductionModules/bomDeductionValidator.js";

describe("bomDeductionValidator unit tests", () => {
	it("validates sufficient balances with zero overdraft", () => {
		const validation = validateDeductionBalances(
			[
				{
					inventoryItemId: "item-1",
					itemName: "Септанест 1:100 000",
					deductedQty: 2,
					remainingQty: 8,
					isOverdraft: false,
					unitCostPriceKopecks: 12000,
					unit: "carpule",
				},
			],
			{
				visitId: "v-101",
				visitNumber: "101",
				totalCostPriceRub: "240 ₽",
			},
		);
		assert.equal(validation.hasOverdraft, false);
		assert.equal(validation.overdraftItems.length, 0);
		assert.equal(validation.toastType, "success");
		assert.ok(validation.toastMessage.includes("Автосписание расходников: 1 поз."));
	});

	it("detects soft overdraft and generates clinical notice with deficit quantities", () => {
		const validation = validateDeductionBalances(
			[
				{
					inventoryItemId: "item-1",
					itemName: "Септанест 1:100 000",
					deductedQty: 5,
					remainingQty: -3,
					isOverdraft: true,
					unitCostPriceKopecks: 12000,
					unit: "carpule",
				},
			],
			{
				visitId: "v-102",
				visitNumber: "102",
			},
		);
		assert.equal(validation.hasOverdraft, true);
		assert.equal(validation.overdraftItems.length, 1);
		assert.equal(validation.overdraftItems[0]?.deficitQty, 3);
		assert.equal(validation.toastType, "warning");
		assert.ok(validation.overdraftNotice.includes("Требуется оприходование"));
		assert.ok(validation.overdraftNotice.includes("102"));
		assert.ok(validation.toastMessage.includes("Мягкий овердрафт"));
	});
});
