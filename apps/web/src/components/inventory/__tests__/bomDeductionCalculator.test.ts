import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	normalizeRenderedServices804n,
	buildCabinetScopedStockMap,
	generateDeterministicWasteActIdentifiers,
	executeShiftCloseClassBWasteDisposal,
} from "../deductionModules/bomDeductionCalculator.js";
import type { InventoryItem } from "../inventoryDataMappers.js";

describe("bomDeductionCalculator unit tests", () => {
	it("normalizes rendered services handling various input fields", () => {
		const normalized = normalizeRenderedServices804n([
			{ serviceCode: "A16.07.002", name: "Кариес", quantity: 1, toothNumber: 16 },
			{ code: "A11.07.012", title: "Анестезия", quantity: 2 },
		]);
		assert.equal(normalized.length, 2);
		assert.equal(normalized[0]?.serviceCode, "A16.07.002");
		assert.equal(normalized[0]?.toothNumber, 16);
		assert.equal(normalized[1]?.serviceCode, "A11.07.012");
		assert.equal(normalized[1]?.quantity, 2);
		assert.equal(normalized[1]?.toothNumber, null);
	});

	it("builds cabinet-scoped stock map correctly", () => {
		const mockItems: (InventoryItem & { cabinetId?: string; chairId?: string; locationId?: string })[] = [
			{
				id: "item-1",
				name: "Салфетки",
				stockQuantity: 50,
				criticalThreshold: 10,
				unitCostRub: "3",
				updatedAt: "2026-01-01",
				cabinetId: "cab-1",
			},
			{
				id: "item-2",
				name: "Перчатки",
				stockQuantity: 20,
				criticalThreshold: 5,
				unitCostRub: "10",
				updatedAt: "2026-01-01",
				cabinetId: "cab-2",
			},
		];

		const scopedStock = buildCabinetScopedStockMap(
			mockItems,
			undefined,
			{ cabinetId: "cab-1" },
		);

		assert.equal(scopedStock["item-1"], 50);
		assert.equal(scopedStock["item-2"], undefined);
	});

	it("generates deterministic waste act identifiers conforming to SanPiN format", () => {
		const ids = generateDeterministicWasteActIdentifiers("2026-10-12", 42);
		assert.equal(ids.actNumber, "АКТ-ОТХОД-Б-20261012-0042");
		assert.equal(ids.sealNumber, "ПЛ-Б-2026-0042");
		assert.equal(ids.barcode, "WASTE-CLASS_B-DENT-20261012-0042");
	});

	it("executes 1-click SanPiN Class B disposal with zero cartoon emojis", async () => {
		const toastCalls: string[] = [];
		const result = await executeShiftCloseClassBWasteDisposal({
			responsibleStaffName: "Иванова А. С.",
			responsibleStaffPosition: "Старшая медсестра",
			accumulatedCarpulesCount: 12,
			accumulatedNeedlesCount: 12,
			brokenCarpulesCount: 1,
			partiallyUsedCarpulesCount: 2,
			onToast: (msg) => toastCalls.push(msg),
		});

		assert.equal(result.success, true);
		assert.equal(result.totalCarpulesCount, 12);
		assert.equal(result.brokenCarpulesCount, 1);
		assert.equal(result.partiallyUsedCarpulesCount, 2);
		assert.equal(result.totalSharpsCount, 12);
		assert.equal(result.singlePersonApproval, true);
		assert.ok(result.actHtml.includes("АКТ НАКОПЛЕНИЯ И ПЕРЕДАЧИ МЕДИЦИНСКИХ ОТХОДОВ КЛАССА Б"));
		assert.equal(result.actHtml.includes("🗑️"), false);
		assert.equal(result.actHtml.includes("⚠️"), false);
		assert.equal(toastCalls.length, 1);
	});
});
