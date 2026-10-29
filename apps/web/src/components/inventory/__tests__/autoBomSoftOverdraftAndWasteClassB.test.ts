import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	calculateClassBWasteFromItems,
	executeAutoVisitBomDeduction,
} from "@dental/shared";

describe("BOM Deduction: Soft Overdraft & Class B Waste Recognition", () => {
	it("при нулевом остатке на складе списание НЕ падает, а фиксирует отрицательный остаток и овердрафт", () => {
		const currentStockMap: Record<string, number> = {
			"mat-anes-art-100k": 0,
			"mat-anes-needle-30g": 10,
		};

		const result = executeAutoVisitBomDeduction({
			visitId: "VISIT-TEST-001",
			patientId: "PAT-001",
			doctorId: "DOC-001",
			renderedServices: [
				{
					serviceCode: "A11.07.012",
					serviceTitle: "Инфильтрационная анестезия",
					quantity: 1,
					toothNumber: 16,
				},
			],
			currentStockMap,
			allowOverdraft: true,
		});

		assert.equal(result.hasOverdraft, true);
		assert.ok(result.softOverdrafts.length >= 1);
		assert.ok(
			result.softOverdrafts[0]!.includes("Складской овердрафт") ||
			result.softOverdrafts[0]!.includes("Мягкий овердрафт"),
		);

		const carpuleItem = result.items.find((i) => i.inventoryItemId === "mat-anes-art-100k");
		assert.ok(carpuleItem);
		assert.equal(carpuleItem.isOverdraft, true);
		assert.equal(carpuleItem.remainingQty, -1);
		assert.ok(carpuleItem.overdraftWarning);

		assert.ok(result.statutoryActText.includes("АКТ СПИСАНИЯ РАСХОДНЫХ МАТЕРИАЛОВ"));
		assert.ok(result.statutoryActText.includes("Зафиксирован мягкий овердрафт"));
	});

	it("при allowOverdraft = false фиксирует мягкий овердрафт без блокирования лечения (Мандат 8e)", () => {
		const result = executeAutoVisitBomDeduction({
			visitId: "VISIT-TEST-002",
			patientId: "PAT-002",
			doctorId: "DOC-002",
			renderedServices: [
				{
					serviceCode: "A11.07.012",
					serviceTitle: "Инфильтрационная анестезия",
					quantity: 1,
				},
			],
			currentStockMap: { "mat-anes-art-100k": 0 },
			allowOverdraft: false,
		});

		assert.equal(result.hasOverdraft, true);
		assert.ok(result.softOverdrafts.length >= 1);
		const carpuleItem = result.items.find((i) => i.inventoryItemId === "mat-anes-art-100k");
		assert.ok(carpuleItem);
		assert.equal(carpuleItem.isOverdraft, true);
		assert.equal(carpuleItem.remainingQty, -1);
	});

	it("точно классифицирует карпулы, колюще-режущие иглы/лезвия и загрязненные СИЗ", () => {
		const items = [
			{ itemName: "Артикаин 4% с адреналином 1.7 мл (карпула)", category: "anesthetic", unit: "карпула", deductedQty: 2 },
			{ itemName: "Игла стоматологическая карпульная 30G", unit: "шт", deductedQty: 2 },
			{ itemName: "Лезвие скальпеля хирургическое №15C", unit: "шт", deductedQty: 1 },
			{ itemName: "Перчатки нитриловые смотровые", unit: "пар", deductedQty: 1 },
			{ itemName: "Слюноотсос стоматологический", unit: "шт", deductedQty: 1 },
		];

		const waste = calculateClassBWasteFromItems(items);
		assert.equal(waste.wasteClass, "class_B");
		assert.equal(waste.carpulesCount, 2);
		assert.equal(waste.sharpsCount, 3);
		assert.equal(waste.contaminatedItemsCount, 2);
		assert.equal(waste.packagingRecommended, "yellow_container_sharps");
		assert.ok(waste.sealNumber.startsWith("ПЛ-Б-"));
		assert.ok(waste.barcode.startsWith("WASTE-CLASS_B-DENT-"));
		assert.equal(waste.singlePersonApproval, true);
		assert.ok(waste.estimatedWeightKg >= 0.05);
	});
});
