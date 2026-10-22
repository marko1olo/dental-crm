import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	computeAuditLineItem,
	calculateInventoryAuditTotals,
	generateInv3Html,
	generateInv19Html,
} from "../warehouseInventoryEngine.js";

describe("Warehouse Suite: Inventory Audit & Acts", () => {
	it("выявляет излишки, недостачи и совпадения при сличении", () => {
		const matchLine = computeAuditLineItem({
			itemId: "it-1", sku: "SKU-1", nameRu: "Товар 1", category: "СИЗ",
			unitRu: "шт.", okeiCode: "796", batchNumber: "B1", expiryDate: "2028-01-01",
			bookQuantity: 10, actualQuantity: 10, unitCostKopecks: 10000,
		}, "2026-10-07");
		assert.equal(matchLine.discrepancyType, "match");

		const shortageLine = computeAuditLineItem({
			itemId: "it-2", sku: "SKU-2", nameRu: "Товар 2", category: "СИЗ",
			unitRu: "шт.", okeiCode: "796", batchNumber: "B2", expiryDate: "2028-01-01",
			bookQuantity: 10, actualQuantity: 8, unitCostKopecks: 10000,
		}, "2026-10-07");
		assert.equal(shortageLine.discrepancyType, "shortage");
		assert.equal(shortageLine.discrepancyQuantity, -2);

		const surplusLine = computeAuditLineItem({
			itemId: "it-3", sku: "SKU-3", nameRu: "Товар 3", category: "СИЗ",
			unitRu: "шт.", okeiCode: "796", batchNumber: "B3", expiryDate: "2028-01-01",
			bookQuantity: 10, actualQuantity: 13, unitCostKopecks: 10000,
		}, "2026-10-07");
		assert.equal(surplusLine.discrepancyType, "surplus");

		const totals = calculateInventoryAuditTotals([matchLine, shortageLine, surplusLine]);
		assert.equal(totals.totalItemsCount, 3);
		assert.equal(totals.matchedItemsCount, 1);
		assert.equal(totals.shortageItemsCount, 1);
		assert.equal(totals.surplusItemsCount, 1);
	});

	it("генерирует формы ИНВ-3 и ИНВ-19 с поддержкой единоличной подписи соло-врача", () => {
		const line = computeAuditLineItem({
			itemId: "it-1", sku: "SKU-1", nameRu: "Товар 1", category: "СИЗ",
			unitRu: "шт.", okeiCode: "796", batchNumber: "B1", expiryDate: "2028-01-01",
			bookQuantity: 10, actualQuantity: 9, unitCostKopecks: 5000,
		}, "2026-10-07");

		const doc = {
			id: "audit-test-1",
			documentNumber: "ИНВ-2026/10-001",
			orderNumber: "ПР-44",
			orderDate: "2026-10-07",
			auditStartDate: "2026-10-07",
			auditEndDate: "2026-10-07",
			auditDate: "2026-10-07",
			branchId: "org-1",
			branchNameRu: "Центральное отделение",
			warehouseNameRu: "Главный склад",
			molFullName: "Кузнецов А.В. (Врач-стоматолог)",
			molPosition: "Врач-стоматолог",
			status: "reconciliation" as const,
			commission: [
				{
					fullName: "Кузнецов А.В.",
					position: "Врач-стоматолог",
					role: "mol" as const,
					roleRu: "Материально ответственное лицо",
				},
			],
			items: [line],
			organizationNameRu: "ООО «ДЕНТЕ КЛИНИК»",
			organizationOkpo: "12345678",
			organizationInn: "7701987654",
		};

		const inv3Html = generateInv3Html(doc);
		assert.ok(inv3Html.includes("ИНВ-3"));
		assert.ok(inv3Html.includes("Кузнецов А.В."));

		const inv19Html = generateInv19Html(doc);
		assert.ok(inv19Html.includes("ИНВ-19"));
		assert.ok(inv19Html.includes("СЛИЧИТЕЛЬНАЯ ВЕДОМОСТЬ"));
	});
});
