import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	computeAuditLineItem,
	calculateInventoryAuditTotals,
	quarantineExpiredBatchesFromAudit,
} from "../warehouseInventoryEngine.js";

describe("Inventory Audit Overdraft & Expired Quarantine", () => {
	it("складской аудит точно считает позиции и объем овердрафта", () => {
		const line1 = computeAuditLineItem({
			itemId: "art-1",
			sku: "ART-01",
			nameRu: "Артикаин",
			unitRu: "шт",
			okeiCode: "796",
			batchNumber: "LOT-A1",
			expiryDate: "2027-01-01",
			bookQuantity: -3,
			actualQuantity: 0,
			unitCostKopecks: 12000,
			cabinetId: "cab-1",
			chairId: "chair-1",
		});
		assert.equal(line1.bookQuantity, -3);

		const line2 = computeAuditLineItem({
			itemId: "needle-1",
			sku: "NDL-01",
			nameRu: "Иглы 30G",
			unitRu: "шт",
			okeiCode: "796",
			batchNumber: "LOT-N1",
			expiryDate: "2027-01-01",
			bookQuantity: 5,
			actualQuantity: 5,
			unitCostKopecks: 1500,
			cabinetId: "cab-1",
		});

		const totals = calculateInventoryAuditTotals([line1, line2]);
		assert.equal(totals.overdraftItemsCount, 1);
		assert.equal(totals.totalOverdraftQuantity, 3);
	});

	it("quarantineExpiredBatchesFromAudit корректно отделяет просроченные партии", () => {
		const lineExpired = computeAuditLineItem(
			{
				itemId: "art-exp",
				sku: "ART-EXP",
				nameRu: "Артикаин просроченный",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "B1",
				expiryDate: "2026-01-01",
				bookQuantity: 10,
				actualQuantity: 10,
				unitCostKopecks: 12000,
			},
			"2026-06-01",
		);

		const lineValid = computeAuditLineItem(
			{
				itemId: "art-valid",
				sku: "ART-VALID",
				nameRu: "Артикаин годный",
				unitRu: "шт",
				okeiCode: "796",
				batchNumber: "B2",
				expiryDate: "2027-01-01",
				bookQuantity: 20,
				actualQuantity: 20,
				unitCostKopecks: 12000,
			},
			"2026-06-01",
		);

		const res = quarantineExpiredBatchesFromAudit([lineExpired, lineValid]);
		assert.equal(res.validLines.length, 1);
		assert.equal(res.validLines[0]!.batchNumber, "B2");
		assert.equal(res.expiredQuarantineLines.length, 1);
		assert.equal(res.expiredQuarantineLines[0]!.batchNumber, "B1");
		assert.equal(res.totalExpiredQuantity, 10);
		assert.equal(res.totalExpiredCostKopecks, 120000);
	});
});
