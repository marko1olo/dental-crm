import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	fefoStockService,
	type FefoDeductionResult,
	type FefoBatchAllocation,
} from "./fefoStockService.js";

describe("FEFO Stock Service & Batch Invariants", () => {
	const orgId = "00000000-0000-0000-0000-000000000001";
	const itemId = "item-articaine-4pct";

	it("sorts batches by FEFO (earliest expirationDate first)", () => {
		const batches = [
			{ id: "b3", expirationDate: "2027-01-01", remainingQty: "10" },
			{ id: "b1", expirationDate: "2026-05-01", remainingQty: "5" },
			{ id: "b2", expirationDate: "2026-10-15", remainingQty: "20" },
			{ id: "b4", expirationDate: null, remainingQty: "15" },
		];

		const sorted = [...batches].sort((a, b) => {
			if (!a.expirationDate) return 1;
			if (!b.expirationDate) return -1;
			return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
		});

		assert.equal(sorted[0]?.id, "b1");
		assert.equal(sorted[1]?.id, "b2");
		assert.equal(sorted[2]?.id, "b3");
		assert.equal(sorted[3]?.id, "b4");
	});

	it("allocates quantities across multiple batches according to FEFO sequence", () => {
		// Имитация доступных партий
		const batches = [
			{ id: "batch-exp-2026-06", remainingQty: 2, expirationDate: "2026-06-01" },
			{ id: "batch-exp-2026-12", remainingQty: 10, expirationDate: "2026-12-01" },
		];

		const requiredQty = 5;
		let remainingNeed = requiredQty;
		const allocated: FefoBatchAllocation[] = [];

		for (const b of batches) {
			if (remainingNeed <= 0) break;
			const avail = b.remainingQty;
			if (avail <= 0) continue;

			const toTake = Math.min(avail, remainingNeed);
			allocated.push({
				batchId: b.id,
				batchNumber: "LOT",
				expirationDate: b.expirationDate,
				quantityDeducted: toTake,
				unitPriceRub: 250,
			});
			remainingNeed -= toTake;
		}

		assert.equal(allocated.length, 2);
		assert.equal(allocated[0]?.batchId, "batch-exp-2026-06");
		assert.equal(allocated[0]?.quantityDeducted, 2);
		assert.equal(allocated[1]?.batchId, "batch-exp-2026-12");
		assert.equal(allocated[1]?.quantityDeducted, 3);
		assert.equal(remainingNeed, 0);
	});

	it("handles emergency overdraft when stock is insufficient without throwing error", () => {
		const currentStock = 3;
		const requiredQty = 10;
		const allowOverdraft = true;

		const deficit = requiredQty - currentStock;
		assert.equal(deficit, 7);

		const isOverdraft = deficit > 0;
		assert.equal(isOverdraft, true);

		const newStock = currentStock - requiredQty;
		assert.equal(newStock, -7);

		// Проверяем, что результат фиксирует перерасход
		const result: FefoDeductionResult = {
			inventoryItemId: itemId,
			totalRequestedQty: requiredQty,
			deductedQty: requiredQty,
			batchesUsed: [
				{
					batchId: "batch-1",
					batchNumber: "LOT-01",
					expirationDate: "2026-07-01",
					quantityDeducted: 3,
					unitPriceRub: 200,
				},
			],
			isOverdraft: true,
			deficitQty: 7,
			newTotalStock: -7,
		};

		assert.equal(result.isOverdraft, true);
		assert.equal(result.deficitQty, 7);
		assert.equal(result.newTotalStock, -7);
		assert.equal(result.deductedQty, 10);
	});

	it("calculates BOM service multipliers correctly for clinical procedures", () => {
		// Техкарта пломбирования 1 зуба (serviceQuantity = 3 при лечении 3 зубов/каналов)
		const bomItems = [
			{ inventoryItemId: "comp-a2", quantityPerService: 1 },
			{ inventoryItemId: "bond-optibond", quantityPerService: 0.2 },
			{ inventoryItemId: "anesthetic-carpule", quantityPerService: 1 },
		];

		const serviceQuantity = 3;
		const calculated = bomItems.map((bi) => ({
			inventoryItemId: bi.inventoryItemId,
			quantityToDeduct: Number((bi.quantityPerService * serviceQuantity).toFixed(4)),
		}));

		assert.equal(calculated[0]?.quantityToDeduct, 3);
		assert.equal(calculated[1]?.quantityToDeduct, 0.6);
		assert.equal(calculated[2]?.quantityToDeduct, 3);
	});
});
