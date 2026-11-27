import assert from "node:assert/strict";
import test from "node:test";
import { inventoryItemFromServer } from "../inventoryDataMappers.js";

test("ROT-015 inventoryItemFromServer reads *Kopecks as primary source over stale *Rub", () => {
	const fromPrimary = inventoryItemFromServer({
		id: "inv-1",
		name: "Композит Filtek",
		stockQuantity: "12",
		criticalThreshold: "3",
		unitCostKopecks: 12345,
		unitCostRub: "99.00",
	});
	assert.equal(fromPrimary.unitCostKopecks, 12345);
	assert.equal(fromPrimary.unitCostRub, "123.45");

	const fromSnakePricePerUnit = inventoryItemFromServer({
		id: "inv-2",
		name: "Анестетик Ультракаин",
		stockQuantity: 40,
		criticalThreshold: 10,
		price_per_unit_kopecks: 45050,
		price_per_unit: "10.00",
	});
	assert.equal(fromSnakePricePerUnit.unitCostKopecks, 45050);
	assert.equal(fromSnakePricePerUnit.unitCostRub, "450.5");

	const legacyFallback = inventoryItemFromServer({
		id: "inv-3",
		name: "Перчатки нитриловые",
		stockQuantity: 100,
		criticalThreshold: 20,
		unitCostKopecks: 0,
		unitCostRub: "85.50",
	});
	assert.equal(legacyFallback.unitCostKopecks, 8550);
	assert.equal(legacyFallback.unitCostRub, "85.5");
});
