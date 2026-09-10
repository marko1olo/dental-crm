/**
 * inventoryReorderEngine.test.ts — Unit tests for predictive reorder engine.
 *
 * Ground truth test suite matching DentalPin specification:
 * - 30 units over 90 days -> daily_usage 0.33
 * - lead_time 5 days -> lead_time_demand ceil(0.33 * 5) = 2
 * - cover 30 days -> ceil(0.33 * 30) = 10
 * - reorder_point = max(0, 2) = 2
 * - available = 0 -> suggested = 2 + 10 - 0 = 12
 * - Kopeck exactness on currency math.
 * - Soft overdraft support (negative stock replenishment).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	REORDER_COVER_DAYS,
	REORDER_LOOKBACK_DAYS,
	calculateDailyUsage,
	calculateLeadTimeDemand,
	calculateReorderPoint,
	calculateSuggestedQuantity,
	computeReorderSuggestion,
	computeReorderSuggestions,
} from "../inventory/reorderEngine.js";

describe("Predictive Reorder Engine (DentalPin specification parity)", () => {
	describe("1. Daily Usage Calculation", () => {
		it("calculates daily usage quantized to 0.01 precision for 30 units over 90 days", () => {
			const daily = calculateDailyUsage(30, 90);
			// 30 / 90 = 0.333333... -> 0.33
			assert.strictEqual(daily, 0.33);
		});

		it("returns 0 for zero or negative consumption", () => {
			assert.strictEqual(calculateDailyUsage(0, 90), 0);
			assert.strictEqual(calculateDailyUsage(-15, 90), 0);
		});

		it("handles custom lookback periods", () => {
			assert.strictEqual(calculateDailyUsage(60, 30), 2);
			assert.strictEqual(calculateDailyUsage(10, 30), 0.33);
		});
	});

	describe("2. Lead Time Demand & Reorder Point", () => {
		it("calculates lead time demand with ceiling rounding (0.33 * 5 = 1.65 -> 2)", () => {
			const demand = calculateLeadTimeDemand(0.33, 5);
			assert.strictEqual(demand, 2);
		});

		it("returns 0 if lead time is 0", () => {
			assert.strictEqual(calculateLeadTimeDemand(0.33, 0), 0);
		});

		it("sets reorder point to max(min_quantity, lead_time_demand)", () => {
			// When min_quantity = 0 and lead_time_demand = 2
			assert.strictEqual(calculateReorderPoint(0, 2), 2);

			// When clinic min_quantity threshold (5) is higher than lead_time_demand (2)
			assert.strictEqual(calculateReorderPoint(5, 2), 5);

			// When lead_time_demand (8) is higher than min_quantity (3)
			assert.strictEqual(calculateReorderPoint(3, 8), 8);
		});
	});

	describe("3. Suggested Replenishment Quantity", () => {
		it("matches exact DentalPin formula (ROP=2, cover=10, available=0 -> suggested=12)", () => {
			const result = calculateSuggestedQuantity(
				2, // reorderPoint
				0.33, // dailyUsage
				0, // stockQuantity
				0, // onOrder
				30, // coverDays
			);

			assert.strictEqual(result.needsReorder, true);
			assert.strictEqual(result.coverQuantity, 10); // ceil(0.33 * 30) = ceil(9.9) = 10
			assert.strictEqual(result.availableQuantity, 0);
			assert.strictEqual(result.suggestedQuantity, 12); // 2 + 10 - 0 = 12
		});

		it("takes into account on_order stock (outstanding purchase orders)", () => {
			const result = calculateSuggestedQuantity(
				5, // reorderPoint
				0.5, // dailyUsage (cover = ceil(0.5 * 30) = 15)
				2, // stockQuantity
				2, // onOrder
				30,
			);
			// available = 2 + 2 = 4 < 5 (needs reorder)
			// suggested = 5 + 15 - 4 = 16
			assert.strictEqual(result.availableQuantity, 4);
			assert.strictEqual(result.needsReorder, true);
			assert.strictEqual(result.suggestedQuantity, 16);
		});

		it("returns 0 suggested quantity when available >= reorder_point", () => {
			const result = calculateSuggestedQuantity(
				5,
				0.5,
				6, // stockQuantity >= reorderPoint
				0,
				30,
			);
			assert.strictEqual(result.needsReorder, false);
			assert.strictEqual(result.suggestedQuantity, 0);
		});

		it("supports Mandate 8e soft overdraft (negative stock is replenished)", () => {
			// Clinic floor consumed 3 units past zero before delivery was recorded
			const result = calculateSuggestedQuantity(
				2, // reorderPoint
				0.33, // dailyUsage (cover = 10)
				-3, // stockQuantity is negative (overdraft)
				0,
				30,
			);
			assert.strictEqual(result.availableQuantity, -3);
			assert.strictEqual(result.needsReorder, true);
			// suggested = 2 + 10 - (-3) = 15
			assert.strictEqual(result.suggestedQuantity, 15);
		});
	});

	describe("4. End-to-End Item Evaluation & Kopeck Exactness", () => {
		it("evaluates a consumable item and computes kopeck-exact financial amounts", () => {
			const suggestion = computeReorderSuggestion({
				inventoryItemId: "item-ubistesin-1",
				itemName: "Убистезин форте 1:100000 (карпулы)",
				category: "anesthetics",
				unit: "карп",
				stockQuantity: 5,
				minQuantity: 10,
				usage90d: 90, // 1 per day -> daily = 1.00
				leadTimeDays: 7, // lead_time_demand = 7 -> ROP = max(10, 7) = 10
				onOrder: 0,
				supplierId: "supp-1",
				supplierName: "МедСнабСтоматология",
				unitPriceRub: 75.5, // 75 руб 50 коп
			});

			assert.strictEqual(suggestion.dailyUsage, 1.0);
			assert.strictEqual(suggestion.leadTimeDemand, 7);
			assert.strictEqual(suggestion.reorderPoint, 10);
			assert.strictEqual(suggestion.coverQuantity, 30); // 1.0 * 30 = 30
			assert.strictEqual(suggestion.availableQuantity, 5);
			assert.strictEqual(suggestion.needsReorder, true);
			// suggested = 10 + 30 - 5 = 35
			assert.strictEqual(suggestion.suggestedQuantity, 35);
			// Financials:
			// 75.50 * 100 = 7550 kopecks
			// 35 * 7550 = 264250 kopecks = 2642.50 руб
			assert.strictEqual(suggestion.unitPriceKopecks, 7550);
			assert.strictEqual(suggestion.estimatedCostKopecks, 264250);
			assert.strictEqual(suggestion.estimatedCostRub, 2642.5);
		});

		it("correctly handles items that do not require reorder", () => {
			const suggestion = computeReorderSuggestion({
				inventoryItemId: "item-gloves-m",
				itemName: "Перчатки нитриловые M (пары)",
				stockQuantity: 150,
				minQuantity: 50,
				usage90d: 90,
				leadTimeDays: 3,
				unitPriceRub: 12.0,
			});

			assert.strictEqual(suggestion.needsReorder, false);
			assert.strictEqual(suggestion.suggestedQuantity, 0);
			assert.strictEqual(suggestion.estimatedCostKopecks, 0);
			assert.strictEqual(suggestion.estimatedCostRub, 0);
		});
	});

	describe("5. Multi-Item Batch Evaluation & Summaries", () => {
		it("evaluates a list of items and generates sorted suggestions with aggregate totals", () => {
			const items = [
				{
					inventoryItemId: "item-1",
					itemName: "Шовный материал Викрил 4-0",
					stockQuantity: 20,
					minQuantity: 10,
					usage90d: 9, // daily 0.1, ROP 10
					leadTimeDays: 5,
					unitPriceRub: 250,
				},
				{
					inventoryItemId: "item-2",
					itemName: "Артифрин М-Х (карпулы)",
					stockQuantity: 2,
					minQuantity: 10,
					usage90d: 90, // daily 1.0, ROP 10, suggested = 10 + 30 - 2 = 38
					leadTimeDays: 4,
					unitPriceRub: 80,
				},
				{
					inventoryItemId: "item-3",
					itemName: "Боры алмазные цилиндрические",
					stockQuantity: 1,
					minQuantity: 5,
					usage90d: 45, // daily 0.5, cover 15, ROP 5, suggested = 5 + 15 - 1 = 19
					leadTimeDays: 2,
					unitPriceRub: 150,
				},
			];

			const response = computeReorderSuggestions(items);

			assert.strictEqual(response.summary.totalItemsEvaluated, 3);
			assert.strictEqual(response.summary.itemsNeedingReorder, 2);
			assert.strictEqual(response.summary.totalSuggestedQuantity, 38 + 19);

			// Costs:
			// item-2: 38 * 8000 kopecks = 304000 kopecks
			// item-3: 19 * 15000 kopecks = 285000 kopecks
			// total = 589000 kopecks = 5890.00 руб
			assert.strictEqual(
				response.summary.totalEstimatedCostKopecks,
				304000 + 285000,
			);
			assert.strictEqual(response.summary.totalEstimatedCostRub, 5890.0);

			// Reorder items should be prioritized at the top of list
			assert.strictEqual(response.suggestions[0]!.needsReorder, true);
			assert.strictEqual(response.suggestions[1]!.needsReorder, true);
			assert.strictEqual(response.suggestions[2]!.needsReorder, false);
		});

		it("supports filtering to only items needing reorder", () => {
			const items = [
				{
					inventoryItemId: "item-1",
					itemName: "Остаток в норме",
					stockQuantity: 100,
					minQuantity: 10,
					usage90d: 10,
				},
				{
					inventoryItemId: "item-2",
					itemName: "Дефицит",
					stockQuantity: 0,
					minQuantity: 10,
					usage90d: 90,
				},
			];

			const response = computeReorderSuggestions(items, {
				onlyNeedingReorder: true,
			});
			assert.strictEqual(response.suggestions.length, 1);
			assert.strictEqual(response.suggestions[0]!.itemName, "Дефицит");
		});
	});
});
