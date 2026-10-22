import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sortBatchesByFefo } from "../fefoTrafficLight.js";
import {
	computeAuditLineItem,
	calculateInventoryAuditTotals,
	calculateFefoStatus,
} from "../warehouseInventoryEngine.js";

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("RED TEAM INQUISITOR: FEFO & Audit Balance (Part 2)", () => {
	it("сортирует годные партии строго по принципу FEFO (First Expired, First Out)", () => {
		const batches = [
			{ id: "batch-3", lotNumber: "LOT-2028", expiryDate: "2028-12-31", quantity: 5 },
			{ id: "batch-1", lotNumber: "LOT-2026-NOV", expiryDate: "2026-11-15", quantity: 2 },
			{ id: "batch-2", lotNumber: "LOT-2027", expiryDate: "2027-05-01", quantity: 10 },
		];

		const sorted = sortBatchesByFefo(batches, new Date("2026-10-08"));

		assert.equal(sorted[0]?.id, "batch-1");
		assert.equal(sorted[1]?.id, "batch-2");
		assert.equal(sorted[2]?.id, "batch-3");
	});

	it("присваивает строгие медицинские статусы партий без мультяшных эмодзи", () => {
		const expiredStatus = calculateFefoStatus("2024-01-01", "2026-10-08");
		assert.equal(expiredStatus.fefoStatus, "expired");
		assert.equal(expiredStatus.badgeLabelRu, "Просрочен");
		assert.equal(emojiRegex.test(expiredStatus.badgeLabelRu), false);

		const freshStatus = calculateFefoStatus("2029-12-31", "2026-10-08");
		assert.equal(freshStatus.fefoStatus, "fresh");
		assert.ok(freshStatus.badgeLabelRu.includes("Свежий"));
		assert.equal(emojiRegex.test(freshStatus.badgeLabelRu), false);
	});

	it("корректно рассчитывает недостачи и излишки инвентаризации в копейках", () => {
		const lineShortage = computeAuditLineItem(
			{
				itemId: "item-short",
				sku: "SKU-001",
				nameRu: "Адгезив светового отверждения",
				category: "Терапия",
				unitRu: "фл.",
				okeiCode: "796",
				batchNumber: "LOT-ADH-01",
				expiryDate: "2027-01-01",
				storageLocationRu: "Стеллаж 1",
				bookQuantity: 5,
				actualQuantity: 3,
				unitCostKopecks: 150000,
			},
			"2026-10-08",
		);

		assert.equal(lineShortage.discrepancyType, "shortage");
		assert.equal(lineShortage.discrepancyQuantity, -2);
		assert.equal(lineShortage.discrepancyCostKopecks, -300000);

		const lineSurplus = computeAuditLineItem(
			{
				itemId: "item-surplus",
				sku: "SKU-002",
				nameRu: "Слюноотсосы одноразовые",
				category: "Расходные",
				unitRu: "уп.",
				okeiCode: "796",
				batchNumber: "LOT-SUC-01",
				expiryDate: "2028-01-01",
				storageLocationRu: "Стеллаж 2",
				bookQuantity: 10,
				actualQuantity: 12,
				unitCostKopecks: 45000,
			},
			"2026-10-08",
		);

		assert.equal(lineSurplus.discrepancyType, "surplus");
		assert.equal(lineSurplus.discrepancyQuantity, 2);
		assert.equal(lineSurplus.discrepancyCostKopecks, 90000);

		const totals = calculateInventoryAuditTotals([lineShortage, lineSurplus]);
		assert.equal(totals.totalItemsCount, 2);
		assert.equal(totals.shortageItemsCount, 1);
		assert.equal(totals.surplusItemsCount, 1);
		assert.equal(totals.totalShortageCostKopecks, 300000);
		assert.equal(totals.totalSurplusCostKopecks, 90000);
	});
});
