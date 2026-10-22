import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	type WarehouseAuditItemLine,
	calculateInventoryAuditTotals,
	computeAuditLineItem,
} from "../warehouseInventoryEngine.js";

describe("Inventory Audit Totals Calculation", () => {
	it("Сводит общие балансовые показатели инвентаризации с копеечной точностью", () => {
		const sampleLines: readonly WarehouseAuditItemLine[] = [
			computeAuditLineItem({
				itemId: "item_1",
				sku: "SKU-1",
				nameRu: "Товар 1",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-1",
				expiryDate: "2027-12-31",
				bookQuantity: 10,
				actualQuantity: 10,
				unitCostKopecks: 100000,
			}),
			computeAuditLineItem({
				itemId: "item_2",
				sku: "SKU-2",
				nameRu: "Товар 2",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-2",
				expiryDate: "2027-12-31",
				bookQuantity: 5,
				actualQuantity: 7,
				unitCostKopecks: 200000,
			}),
			computeAuditLineItem({
				itemId: "item_3",
				sku: "SKU-3",
				nameRu: "Товар 3",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-3",
				expiryDate: "2027-12-31",
				bookQuantity: 8,
				actualQuantity: 7,
				unitCostKopecks: 150000,
			}),
			computeAuditLineItem({
				itemId: "item_4",
				sku: "SKU-4",
				nameRu: "Товар 4",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "LOT-4",
				expiryDate: "2026-01-01",
				bookQuantity: 3,
				actualQuantity: 3,
				unitCostKopecks: 80000,
			}),
		];

		const totals = calculateInventoryAuditTotals(sampleLines);
		assert.equal(totals.totalItemsCount, 4);
		assert.equal(totals.matchedItemsCount, 2);
		assert.equal(totals.surplusItemsCount, 1);
		assert.equal(totals.shortageItemsCount, 1);
		assert.equal(totals.expiredItemsCount, 1);
		assert.equal(totals.totalBookQuantity, 26);
		assert.equal(totals.totalActualQuantity, 27);
		assert.equal(totals.totalSurplusQuantity, 2);
		assert.equal(totals.totalShortageQuantity, 1);
		assert.equal(totals.totalBookCostKopecks, 3440000);
		assert.equal(totals.totalActualCostKopecks, 3690000);
		assert.equal(totals.totalSurplusCostKopecks, 400000);
		assert.equal(totals.totalShortageCostKopecks, 150000);
		assert.equal(totals.netDiscrepancyCostKopecks, 250000);
		assert.equal(totals.netDiscrepancyCostRubles, 2500.0);
	});
});
