import { strict as assert } from "node:assert";
import { describe, test } from "node:test";
import {
	CentralWarehouseProcurementService,
	type BranchPurchaseRequest,
} from "./CentralWarehouseProcurementService.js";

describe("CentralWarehouseProcurementService — Feature #214 Branch Procurement Aggregation", () => {
	const requests: BranchPurchaseRequest[] = [
		{
			branchId: "branch-arbat",
			branchName: "Филиал Арбат",
			itemId: "item-anesthetic-septanest",
			itemName: "Септанест 1:100 000 (упак. 50 карпул)",
			requestedQuantity: 30,
			baseUnitPriceRub: 4000,
		},
		{
			branchId: "branch-tverskaya",
			branchName: "Филиал Тверская",
			itemId: "item-anesthetic-septanest",
			itemName: "Септанест 1:100 000 (упак. 50 карпул)",
			requestedQuantity: 40,
			baseUnitPriceRub: 4000,
		},
		{
			branchId: "branch-hamovniki",
			branchName: "Филиал Хамовники",
			itemId: "item-anesthetic-septanest",
			itemName: "Септанест 1:100 000 (упак. 50 карпул)",
			requestedQuantity: 40,
			baseUnitPriceRub: 4000,
		},
	];

	test("1. Aggregates item quantities from multiple branches into volume discount tier", () => {
		// Individual branches requested 30, 40, 40 -> Total: 110 units.
		// 110 units qualifies for >= 100 tier (20% discount).
		// Base price 4000 -> Discounted price 3200 RUB.
		const consolidated = CentralWarehouseProcurementService.aggregateProcurement(requests);

		assert.equal(consolidated.participatingBranchesCount, 3);
		assert.equal(consolidated.items.length, 1);

		const item = consolidated.items[0]!;
		assert.equal(item.totalQuantity, 110);
		assert.equal(item.applicableDiscountPercent, 20);
		assert.equal(item.discountedUnitPriceRub, 3200);

		// Base cost: 110 * 4000 = 440,000 RUB
		// Discounted cost: 110 * 3200 = 352,000 RUB
		// Savings: 88,000 RUB
		assert.equal(item.totalBaseCostRub, 440000);
		assert.equal(item.totalDiscountedCostRub, 352000);
		assert.equal(item.totalSavingsRub, 88000);
		assert.equal(consolidated.totalOrderCostRub, 352000);
		assert.equal(consolidated.totalSavingsRub, 88000);

		// Distribution check
		assert.equal(item.branchAllocations.length, 3);
		assert.equal(item.branchAllocations[0]!.allocatedQuantity, 30);
		assert.equal(item.branchAllocations[0]!.allocatedCostRub, 30 * 3200); // 96,000
	});
});
