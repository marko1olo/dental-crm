import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type WarehouseTransferLineItem,
	calculateTransferTotals,
	validateTransferDraft,
} from "../warehouseTransferEngine.js";
import {
	TRANSFER_STATUS_PIPELINE,
	WAREHOUSE_BRANCHES,
	WAREHOUSE_CATALOG_PRESETS,
	getWarehouseBranch,
} from "../warehouseTransferPresets.js";

describe("Warehouse Transfer Logistics & Preset Catalogs", () => {
	it("Каталог филиалов содержит Центральный склад (ЦС) и периферийные филиалы сети", () => {
		const branchIds = WAREHOUSE_BRANCHES.map((b) => b.id);
		assert.ok(branchIds.includes("central_hub"));
		assert.ok(branchIds.includes("branch_center"));
		assert.ok(branchIds.includes("branch_north"));
		assert.ok(branchIds.includes("branch_south"));

		const central = getWarehouseBranch("central_hub");
		assert.equal(central.isCentralHub, true);
		assert.equal(central.code, "ЦС-01");
		assert.ok(central.okpoCode.length > 0);
	});

	it("Каталог ТМЦ содержит все ключевые категории: анестетики, шовный материал, имплантаты, композиты", () => {
		const categories = new Set(WAREHOUSE_CATALOG_PRESETS.map((p) => p.category));
		assert.ok(categories.has("anesthetics"));
		assert.ok(categories.has("suture"));
		assert.ok(categories.has("implants"));
		assert.ok(categories.has("composites"));
		assert.ok(categories.has("disinfection_ppe"));

		for (const preset of WAREHOUSE_CATALOG_PRESETS) {
			assert.ok(preset.unitCostKopecks > 0);
			assert.ok(preset.sku.length > 0);
			assert.ok(preset.okeiCode.length > 0);
		}
	});

	it("Пайплайн статусов перемещения содержит все этапы жизненного цикла", () => {
		const statuses = Object.keys(TRANSFER_STATUS_PIPELINE);
		assert.ok(statuses.includes("draft"));
		assert.ok(statuses.includes("requested"));
		assert.ok(statuses.includes("dispatched"));
		assert.ok(statuses.includes("in_transit"));
		assert.ok(statuses.includes("received_ok"));
		assert.ok(statuses.includes("discrepancy"));
	});
});

describe("Kopeck-Exact Transfer Totals & Validation", () => {
	const sampleItems: readonly WarehouseTransferLineItem[] = [
		{
			itemId: "mat_ultracain_forte",
			sku: "AN-ULTRA-01",
			nameRu: "Ультракаин Д-С Форте",
			unitRu: "упак",
			okeiCode: "778",
			batchNumber: "LOT-2026A44",
			expiryDate: "2027-12-31",
			requestedQuantity: 10,
			dispatchedQuantity: 10,
			receivedQuantity: 10,
			unitCostKopecks: 650000,
			discrepancyType: "none",
		},
		{
			itemId: "mat_impl_osstem_40_10",
			sku: "IMP-OSST-4010",
			nameRu: "Имплантат Osstem TS III SA Ø4.0 x 10 мм",
			unitRu: "шт",
			okeiCode: "796",
			batchNumber: "LOT-OS-5541",
			expiryDate: "2029-06-30",
			requestedQuantity: 5,
			dispatchedQuantity: 5,
			receivedQuantity: 4,
			unitCostKopecks: 1250000,
			discrepancyType: "shortage",
			discrepancyQuantity: 1,
		},
	];

	it("calculateTransferTotals рассчитывает точные суммы отпуска, приемки и ущерба в копейках", () => {
		const totals = calculateTransferTotals(sampleItems);
		assert.equal(totals.totalDispatchedCostKopecks, 12750000);
		assert.equal(totals.totalDispatchedCostRubles, 127500);
		assert.equal(totals.totalReceivedCostKopecks, 11500000);
		assert.equal(totals.totalReceivedCostRubles, 115000);
		assert.equal(totals.hasDiscrepancy, true);
		assert.equal(totals.totalDiscrepancyDamageKopecks, 1250000);
		assert.equal(totals.totalDiscrepancyDamageRubles, 12500);
	});

	it("validateTransferDraft запрещает перемещение между одинаковыми складами и просроченные ТМЦ", () => {
		const invalidSameBranch = validateTransferDraft("central_hub", "central_hub", sampleItems);
		assert.equal(invalidSameBranch.isValid, false);
		assert.ok(invalidSameBranch.errors.some((e) => e.includes("не могут совпадать")));

		const expiredItem: WarehouseTransferLineItem = {
			...sampleItems[0]!,
			expiryDate: "2025-01-01",
		};
		const invalidExpired = validateTransferDraft("central_hub", "branch_center", [expiredItem]);
		assert.equal(invalidExpired.isValid, false);
		assert.ok(invalidExpired.errors.some((e) => e.includes("истек") || e.includes("запрещено")));

		const validDraft = validateTransferDraft("central_hub", "branch_center", sampleItems);
		assert.equal(validDraft.isValid, true);
		assert.equal(validDraft.errors.length, 0);
	});
});
