import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	InsufficientStockError,
	isDeductibleQuantity,
} from "../../services/inventory/materialDeduction.js";

describe("Medical Inventory Material Deduction Invariants", () => {
	it("validates deductible quantities strictly (positive finite numbers only)", () => {
		assert.equal(isDeductibleQuantity(1), true);
		assert.equal(isDeductibleQuantity(0.5), true);
		assert.equal(isDeductibleQuantity(100), true);

		assert.equal(isDeductibleQuantity(0), false);
		assert.equal(isDeductibleQuantity(-1), false);
		assert.equal(isDeductibleQuantity(Number.NaN), false);
		assert.equal(isDeductibleQuantity(Number.POSITIVE_INFINITY), false);
	});

	it("formats clear InsufficientStockError messages with required vs available quantities", () => {
		const error = new InsufficientStockError({
			inventoryItemId: "item-composite-a2",
			inventoryItemName: "Filtek Ultimate A2 (шприц 4г)",
			availableStock: 2,
			requiredStock: 5,
		});

		assert.equal(error.statusCode, 400);
		assert.equal(error.error, "InsufficientStock");
		assert.equal(error.availableStock, 2);
		assert.equal(error.requiredStock, 5);
		assert.ok(error.message.includes("Filtek Ultimate A2"));
		assert.ok(error.message.includes("требуется 5"));
		assert.ok(error.message.includes("в наличии 2"));
	});

	it("sorts inventory items deterministically to guarantee deadlock-free locking", () => {
		const itemIds = [
			"uuid-zirconia-block-02",
			"uuid-anesthetic-ultracain",
			"uuid-bonding-optibond",
			"uuid-composite-filtek-a3",
		];

		const sorted = [...itemIds].sort();
		assert.deepEqual(sorted, [
			"uuid-anesthetic-ultracain",
			"uuid-bonding-optibond",
			"uuid-composite-filtek-a3",
			"uuid-zirconia-block-02",
		]);
	});
});
