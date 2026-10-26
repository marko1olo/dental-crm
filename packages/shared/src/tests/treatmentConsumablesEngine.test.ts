/**
 * treatmentConsumablesEngine.test.ts — Soft Negative Stock & Batch Deduction (Mandate 8b <= 120 lines).
 * Verifies Mandates 8e & 8n: Doctor autonomy, background write-offs, zero blocking on overdraft.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateConsumablesForTreatment,
	calculateServiceConsumables,
	processConsumablesStockDeduction,
	type PlannedServiceConsumable,
	type TreatmentConsumableLink,
	type TreatmentPerformedEvent,
} from "../warehouse/treatmentConsumablesEngine.js";

describe("treatmentConsumablesEngine — Soft Negative Stock (Mandates 8e, 8n)", () => {
	it("deducts consumables into soft negative stock without throwing errors", () => {
		const event: TreatmentPerformedEvent = {
			treatmentReferenceId: "trt-101",
			catalogItemId: "A16.07.002",
			serviceQuantity: 1,
			performedAt: new Date().toISOString(),
		};

		const links: TreatmentConsumableLink[] = [
			{
				id: "link-1",
				catalogItemId: "A16.07.002",
				inventoryItemId: "mat-composite-a2",
				inventoryItemName: "Filtek A2",
				unit: "шприц",
				quantityPerService: 1,
			},
		];

		// Current stock is 0. Deduction of 1 must succeed and yield resultingStock = -1 (soft overdraft)
		const currentStocks = { "mat-composite-a2": 0 };
		const result = calculateConsumablesForTreatment(event, links, currentStocks, true);

		assert.equal(result.hasOverdraft, true, "Must flag soft overdraft");
		assert.equal(result.items.length, 1);
		assert.equal(result.items[0]?.resultingStock, -1, "Stock drops to -1 in quiet back-office");
		assert.equal(result.items[0]?.isOverdraft, true);
	});

	it("batch deduction processes multiple services in 1-click without blocking treatment protocol", () => {
		const planned: PlannedServiceConsumable[] = [
			{
				linkId: "link-1",
				service804nCode: "A16.07.002",
				serviceTitle: "Пломбирование",
				toothNumber: 16,
				inventoryItemId: "mat-1",
				itemName: "Ультракаин Д-С",
				category: "anesthetic",
				unit: "карпула",
				requiredQuantity: 2,
				unitCostPriceKopecks: 6500,
				totalCostPriceKopecks: 13000,
				isMandatory: true,
			},
		];

		// Stock is completely empty (0). Allow overdraft must not throw!
		const stockMap = { "mat-1": 0 };
		const deduction = processConsumablesStockDeduction(planned, stockMap, { allowOverdraft: true });

		assert.equal(deduction.hasOverdraft, true);
		assert.equal(deduction.deductedItems.length, 1);
		assert.equal(deduction.deductedItems[0]?.remainingQty, -2);
		assert.equal(deduction.softOverdrafts.length, 1);
		assert.ok(deduction.softOverdrafts[0]?.includes("Складской овердрафт"));
		assert.ok(deduction.softOverdrafts[0]?.includes("Операция не блокируется"));
	});
});
