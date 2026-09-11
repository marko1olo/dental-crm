/**
 * wave120InventoryReorder.test.ts — Automated Inventory Reorder Point (ROP) & Supplier Rating Unit Tests.
 *
 * Wave 120 — Domain: Warehouse & Logistics (DentalPin Reorder & Supplier Ratings).
 *
 * Test coverage:
 * 1. Statutory constants (DEFAULT_LOOKBACK_DAYS, DEFAULT_COVER_DAYS, DEFAULT_SAFETY_STOCK_RATIO).
 * 2. Reorder Point (ROP) and demand calculation:
 *    - dailyUsage quantization to 2 decimals
 *    - leadTimeDemand = Math.ceil(dailyUsage * leadTimeDays)
 *    - reorderPoint = Math.max(minQuantity, leadTimeDemand)
 *    - cover = Math.ceil(dailyUsage * coverDays)
 *    - suggestedQuantity = Math.max(1, reorderPoint + cover - available)
 * 3. Urgency statuses:
 *    - URGENT_OUT_OF_STOCK (stockQuantity <= 0)
 *    - CRITICAL_REORDER (stockQuantity <= leadTimeDemand)
 *    - STANDARD_REORDER (stockQuantity < reorderPoint)
 *    - OPTIMAL (available >= reorderPoint)
 * 4. Sufficient inventory scenario (returns null or OPTIMAL).
 * 5. Supplier rating calculation, composite scoring (1.0–5.0), and risk tiers:
 *    - RELIABLE (>= 4.2)
 *    - MODERATE_RISK (3.0..4.19)
 *    - HIGH_RISK (< 3.0)
 * 6. Edge cases and division by zero safety:
 *    - 0 lookback usage
 *    - 0 lead time days
 *    - 0 lookback days
 *    - 0 received deliveries
 *    - soft negative stock overdraft
 * 7. Batch suggestions and supplier PO grouping.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	DEFAULT_COVER_DAYS,
	DEFAULT_LOOKBACK_DAYS,
	DEFAULT_SAFETY_STOCK_RATIO,
	REORDER_STATUS_LABELS_RU,
	SUPPLIER_RISK_TIER_LABELS_RU,
	computeBatchReorderSuggestions,
	computeReorderSuggestion,
	computeSupplierRating,
	determineSupplierRiskTier,
	groupSuggestionsBySupplier,
	reorderCalculationParamsSchema,
	reorderSuggestionSchema,
	supplierRatingInputSchema,
	supplierRatingScoreSchema,
} from "../index.js";

describe("Wave 120: Warehouse Reorder Point (ROP) & Supplier Reliability Engine", () => {
	// ── 1. Constants Verification ──────────────────────────────────────────────

	describe("1. Statutory & Default Constants", () => {
		it("exports correct default configuration values", () => {
			assert.strictEqual(DEFAULT_LOOKBACK_DAYS, 90);
			assert.strictEqual(DEFAULT_COVER_DAYS, 30);
			assert.strictEqual(DEFAULT_SAFETY_STOCK_RATIO, 0.2);
		});

		it("exports complete Russian status dictionary labels", () => {
			assert.strictEqual(
				REORDER_STATUS_LABELS_RU.URGENT_OUT_OF_STOCK,
				"Срочно: нулевой остаток",
			);
			assert.strictEqual(
				REORDER_STATUS_LABELS_RU.CRITICAL_REORDER,
				"Критический повторный заказ (меньше срока поставки)",
			);
			assert.strictEqual(
				REORDER_STATUS_LABELS_RU.STANDARD_REORDER,
				"Стандартный повторный заказ",
			);
			assert.strictEqual(REORDER_STATUS_LABELS_RU.OPTIMAL, "Остаток в норме");
		});

		it("exports complete Russian supplier risk tier labels", () => {
			assert.strictEqual(
				SUPPLIER_RISK_TIER_LABELS_RU.RELIABLE,
				"Надежный поставщик",
			);
			assert.strictEqual(
				SUPPLIER_RISK_TIER_LABELS_RU.MODERATE_RISK,
				"Умеренный риск",
			);
			assert.strictEqual(
				SUPPLIER_RISK_TIER_LABELS_RU.HIGH_RISK,
				"Высокий риск",
			);
		});
	});

	// ── 2. Reorder Calculation Formulas ────────────────────────────────────────

	describe("2. Reorder Point & Suggested Quantity Calculation", () => {
		it("calculates dailyUsage with exact 2 decimal rounding", () => {
			// 100 units consumed over 90 days = 1.1111... -> 1.11
			const res1 = computeReorderSuggestion({
				stockQuantity: 5,
				usageLookbackTotal: 100,
				lookbackDays: 90,
				leadTimeDays: 7,
				minQuantity: 10,
			});
			assert.ok(res1 !== null);
			assert.strictEqual(res1.dailyUsage, 1.11);

			// 90 units consumed over 90 days = 1.00
			const res2 = computeReorderSuggestion({
				stockQuantity: 2,
				usageLookbackTotal: 90,
				lookbackDays: 90,
				leadTimeDays: 5,
				minQuantity: 5,
			});
			assert.ok(res2 !== null);
			assert.strictEqual(res2.dailyUsage, 1.0);

			// 45 units over 90 days = 0.50
			const res3 = computeReorderSuggestion({
				stockQuantity: 1,
				usageLookbackTotal: 45,
				lookbackDays: 90,
				leadTimeDays: 10,
				minQuantity: 10,
			});
			assert.ok(res3 !== null);
			assert.strictEqual(res3.dailyUsage, 0.5);
		});

		it("calculates leadTimeDemand as Math.ceil(dailyUsage * leadTimeDays)", () => {
			// dailyUsage = 1.11, leadTime = 7 -> 1.11 * 7 = 7.77 -> ceil = 8
			const res = computeReorderSuggestion({
				stockQuantity: 2,
				usageLookbackTotal: 100,
				lookbackDays: 90,
				leadTimeDays: 7,
				minQuantity: 5,
			});
			assert.ok(res !== null);
			assert.strictEqual(res.dailyUsage, 1.11);
			assert.strictEqual(res.leadTimeDemand, 8);
		});

		it("calculates reorderPoint = Math.max(minQuantity, leadTimeDemand)", () => {
			// Case A: minQuantity (15) > leadTimeDemand (8) -> ROP = 15
			const resA = computeReorderSuggestion({
				stockQuantity: 4,
				usageLookbackTotal: 100,
				lookbackDays: 90,
				leadTimeDays: 7,
				minQuantity: 15,
			});
			assert.ok(resA !== null);
			assert.strictEqual(resA.leadTimeDemand, 8);
			assert.strictEqual(resA.reorderPoint, 15);

			// Case B: leadTimeDemand (12) > minQuantity (5) -> ROP = 12
			// dailyUsage = 1.0, leadTime = 12 -> demand = 12
			const resB = computeReorderSuggestion({
				stockQuantity: 3,
				usageLookbackTotal: 90,
				lookbackDays: 90,
				leadTimeDays: 12,
				minQuantity: 5,
			});
			assert.ok(resB !== null);
			assert.strictEqual(resB.leadTimeDemand, 12);
			assert.strictEqual(resB.reorderPoint, 12);
		});

		it("calculates cover = Math.ceil(dailyUsage * coverDays) and suggestedQuantity", () => {
			// dailyUsage = 1.11, coverDays = 30 -> 1.11 * 30 = 33.3 -> cover = 34
			// stock = 4, onOrder = 2 -> available = 6
			// ROP = max(10, 8) = 10
			// suggestedQuantity = max(1, ROP + cover - available) = 10 + 34 - 6 = 38
			const res = computeReorderSuggestion({
				stockQuantity: 4,
				onOrderQuantity: 2,
				usageLookbackTotal: 100,
				lookbackDays: 90,
				leadTimeDays: 7,
				minQuantity: 10,
				coverDays: 30,
			});
			assert.ok(res !== null);
			assert.strictEqual(res.available, 6);
			assert.strictEqual(res.cover, 34);
			assert.strictEqual(res.suggestedQuantity, 38);
		});

		it("calculates exact integer kopecks financial valuation", () => {
			const res = computeReorderSuggestion({
				stockQuantity: 0,
				usageLookbackTotal: 90,
				lookbackDays: 90,
				leadTimeDays: 5,
				minQuantity: 10,
				coverDays: 20,
				unitPriceKopecks: 12550, // 125.50 ₽
			});
			assert.ok(res !== null);
			// dailyUsage = 1.0, leadTimeDemand = 5, ROP = 10
			// cover = 1.0 * 20 = 20. available = 0
			// suggested = 10 + 20 - 0 = 30
			assert.strictEqual(res.suggestedQuantity, 30);
			assert.strictEqual(res.unitPriceKopecks, 12550);
			assert.strictEqual(res.totalEstimatedCostKopecks, 30 * 12550);
		});
	});

	// ── 3. Urgency Status Classification ───────────────────────────────────────

	describe("3. Status Determination & Priority", () => {
		it("sets URGENT_OUT_OF_STOCK when stockQuantity <= 0", () => {
			// Stock is exactly 0
			const resZero = computeReorderSuggestion({
				stockQuantity: 0,
				usageLookbackTotal: 90,
				lookbackDays: 90,
				leadTimeDays: 7,
				minQuantity: 10,
			});
			assert.ok(resZero !== null);
			assert.strictEqual(resZero.status, "URGENT_OUT_OF_STOCK");
			assert.strictEqual(resZero.estimatedStockDepletionDays, 0);

			// Soft overdraft: negative stock (-3)
			const resOverdraft = computeReorderSuggestion({
				stockQuantity: -3,
				usageLookbackTotal: 90,
				lookbackDays: 90,
				leadTimeDays: 7,
				minQuantity: 10,
			});
			assert.ok(resOverdraft !== null);
			assert.strictEqual(resOverdraft.status, "URGENT_OUT_OF_STOCK");
			assert.strictEqual(resOverdraft.estimatedStockDepletionDays, 0);
		});

		it("sets CRITICAL_REORDER when stockQuantity <= leadTimeDemand and stockQuantity > 0", () => {
			// dailyUsage = 1.0, leadTime = 10 -> leadTimeDemand = 10.
			// stock = 6 (<= 10 and > 0)
			const res = computeReorderSuggestion({
				stockQuantity: 6,
				usageLookbackTotal: 90,
				lookbackDays: 90,
				leadTimeDays: 10,
				minQuantity: 15,
			});
			assert.ok(res !== null);
			assert.strictEqual(res.leadTimeDemand, 10);
			assert.strictEqual(res.status, "CRITICAL_REORDER");
			assert.strictEqual(res.estimatedStockDepletionDays, 6);
		});

		it("sets STANDARD_REORDER when stockQuantity > leadTimeDemand but available < reorderPoint", () => {
			// dailyUsage = 1.0, leadTime = 5 -> leadTimeDemand = 5.
			// minQuantity = 20 -> ROP = 20.
			// stock = 12 (> 5, but < 20). onOrder = 0 -> available = 12 < 20.
			const res = computeReorderSuggestion({
				stockQuantity: 12,
				usageLookbackTotal: 90,
				lookbackDays: 90,
				leadTimeDays: 5,
				minQuantity: 20,
			});
			assert.ok(res !== null);
			assert.strictEqual(res.leadTimeDemand, 5);
			assert.strictEqual(res.reorderPoint, 20);
			assert.strictEqual(res.status, "STANDARD_REORDER");
			assert.strictEqual(res.estimatedStockDepletionDays, 12);
		});
	});

	// ── 4. Sufficient Inventory (No Reorder Needed) ─────────────────────────────

	describe("4. Sufficient Inventory Scenarios", () => {
		it("returns null by default when available >= reorderPoint", () => {
			// ROP = max(10, 5) = 10. stock = 8, onOrder = 5 -> available = 13 >= 10.
			const res = computeReorderSuggestion({
				stockQuantity: 8,
				onOrderQuantity: 5,
				usageLookbackTotal: 90,
				lookbackDays: 90,
				leadTimeDays: 5,
				minQuantity: 10,
			});
			assert.strictEqual(res, null);
		});

		it("returns OPTIMAL suggestion when includeOptimal is true", () => {
			const res = computeReorderSuggestion({
				stockQuantity: 25,
				onOrderQuantity: 0,
				usageLookbackTotal: 90,
				lookbackDays: 90,
				leadTimeDays: 5,
				minQuantity: 10,
				includeOptimal: true,
			});
			assert.ok(res !== null);
			assert.strictEqual(res.status, "OPTIMAL");
			assert.strictEqual(res.suggestedQuantity, 0);
			assert.strictEqual(res.cover, 0);
			assert.strictEqual(res.available, 25);
			assert.strictEqual(res.estimatedStockDepletionDays, 25);
		});
	});

	// ── 5. Supplier Rating & Scoring ───────────────────────────────────────────

	describe("5. Supplier Rating Scoring & Risk Classification", () => {
		it("calculates 100% on-time and 0% defects as RELIABLE (score 5.0)", () => {
			const rating = computeSupplierRating({
				supplierId: "sup-001",
				supplierName: "StomDental Supplies",
				totalReceivedDeliveries: 40,
				onTimeDeliveries: 40,
				defectDeliveries: 0,
			});

			assert.strictEqual(rating.onTimeDeliveryRatePct, 100);
			assert.strictEqual(rating.defectRatePct, 0);
			assert.strictEqual(rating.compositeScore, 5.0);
			assert.strictEqual(rating.riskTier, "RELIABLE");
		});

		it("rates high reliability supplier as RELIABLE (score >= 4.2)", () => {
			// 95% on-time, 2% defects
			const rating = computeSupplierRating({
				supplierId: "sup-002",
				totalReceivedDeliveries: 100,
				onTimeDeliveries: 95,
				defectDeliveries: 2,
			});

			assert.strictEqual(rating.onTimeDeliveryRatePct, 95);
			assert.strictEqual(rating.defectRatePct, 2);
			assert.ok(rating.compositeScore >= 4.2);
			assert.strictEqual(rating.riskTier, "RELIABLE");
		});

		it("rates moderate delivery supplier as MODERATE_RISK (3.0..4.19)", () => {
			// 70% on-time, 15% defects
			const rating = computeSupplierRating({
				supplierId: "sup-003",
				totalReceivedDeliveries: 40,
				onTimeDeliveries: 28, // 70%
				defectDeliveries: 6, // 15%
			});

			assert.strictEqual(rating.onTimeDeliveryRatePct, 70);
			assert.strictEqual(rating.defectRatePct, 15);
			assert.ok(rating.compositeScore >= 3.0 && rating.compositeScore < 4.2);
			assert.strictEqual(rating.riskTier, "MODERATE_RISK");
		});

		it("rates low-performance supplier as HIGH_RISK (< 3.0)", () => {
			// 30% on-time, 40% defects
			const rating = computeSupplierRating({
				supplierId: "sup-004",
				totalReceivedDeliveries: 50,
				onTimeDeliveries: 15, // 30%
				defectDeliveries: 20, // 40%
			});

			assert.strictEqual(rating.onTimeDeliveryRatePct, 30);
			assert.strictEqual(rating.defectRatePct, 40);
			assert.ok(rating.compositeScore < 3.0);
			assert.strictEqual(rating.riskTier, "HIGH_RISK");
		});

		it("validates determineSupplierRiskTier exact threshold boundaries", () => {
			assert.strictEqual(determineSupplierRiskTier(5.0), "RELIABLE");
			assert.strictEqual(determineSupplierRiskTier(4.2), "RELIABLE");
			assert.strictEqual(determineSupplierRiskTier(4.19), "MODERATE_RISK");
			assert.strictEqual(determineSupplierRiskTier(3.5), "MODERATE_RISK");
			assert.strictEqual(determineSupplierRiskTier(3.0), "MODERATE_RISK");
			assert.strictEqual(determineSupplierRiskTier(2.99), "HIGH_RISK");
			assert.strictEqual(determineSupplierRiskTier(1.0), "HIGH_RISK");
		});

		it("incorporates manual review score when provided", () => {
			const withReview = computeSupplierRating({
				totalReceivedDeliveries: 20,
				onTimeDeliveries: 18, // 90%
				defectDeliveries: 1, // 5%
				manualReviewScore: 4.8,
			});

			assert.ok(withReview.manualReviewScore === 4.8);
			assert.ok(withReview.breakdown?.reviewScore === 4.8);
			assert.ok(withReview.compositeScore >= 4.2);
			assert.strictEqual(withReview.riskTier, "RELIABLE");
		});
	});

	// ── 6. Edge Cases & Division by Zero Safety ────────────────────────────────

	describe("6. Edge Cases & Division by Zero Safety", () => {
		it("handles 0 consumption (usageLookbackTotal = 0) gracefully without NaN", () => {
			const res = computeReorderSuggestion({
				stockQuantity: 2,
				usageLookbackTotal: 0,
				lookbackDays: 90,
				leadTimeDays: 7,
				minQuantity: 10,
			});
			assert.ok(res !== null);
			assert.strictEqual(res.dailyUsage, 0);
			assert.strictEqual(res.leadTimeDemand, 0);
			assert.strictEqual(res.reorderPoint, 10);
			assert.strictEqual(res.cover, 0);
			// ROP(10) + cover(0) - available(2) = 8
			assert.strictEqual(res.suggestedQuantity, 8);
			assert.strictEqual(res.estimatedStockDepletionDays, Infinity);
		});

		it("handles 0 lead time days (leadTimeDays = 0)", () => {
			const res = computeReorderSuggestion({
				stockQuantity: 3,
				usageLookbackTotal: 90,
				lookbackDays: 90,
				leadTimeDays: 0,
				minQuantity: 10,
				coverDays: 15,
			});
			assert.ok(res !== null);
			assert.strictEqual(res.leadTimeDemand, 0);
			assert.strictEqual(res.reorderPoint, 10);
			assert.strictEqual(res.cover, 15);
			// ROP(10) + cover(15) - available(3) = 22
			assert.strictEqual(res.suggestedQuantity, 22);
		});

		it("handles invalid/zero lookbackDays by falling back to DEFAULT_LOOKBACK_DAYS", () => {
			const res = computeReorderSuggestion({
				stockQuantity: 1,
				usageLookbackTotal: 90,
				lookbackDays: 0, // invalid zero
				leadTimeDays: 5,
				minQuantity: 5,
			});
			assert.ok(res !== null);
			// Uses DEFAULT_LOOKBACK_DAYS (90) -> 90 / 90 = 1.0
			assert.strictEqual(res.dailyUsage, 1.0);
			assert.ok(!Number.isNaN(res.dailyUsage));
		});

		it("handles 0 deliveries in computeSupplierRating without NaN or crash", () => {
			const rating = computeSupplierRating({
				supplierId: "sup-new",
				supplierName: "New Supplier Without Deliveries",
				totalReceivedDeliveries: 0,
				onTimeDeliveries: 0,
				defectDeliveries: 0,
			});

			assert.strictEqual(rating.onTimeDeliveryRatePct, 0);
			assert.strictEqual(rating.defectRatePct, 0);
			assert.strictEqual(rating.compositeScore, 3.0); // neutral default
			assert.strictEqual(rating.riskTier, "MODERATE_RISK");
			assert.ok(!Number.isNaN(rating.compositeScore));
		});

		it("respects pre-computed percentage inputs if provided directly", () => {
			const rating = computeSupplierRating({
				totalReceivedDeliveries: 0,
				onTimeDeliveries: 0,
				onTimeDeliveryRatePct: 98.5,
				defectRatePct: 1.0,
			});

			assert.strictEqual(rating.onTimeDeliveryRatePct, 98.5);
			assert.strictEqual(rating.defectRatePct, 1.0);
			assert.strictEqual(rating.riskTier, "RELIABLE");
		});
	});

	// ── 7. Batch Operations & Purchase Order Grouping ──────────────────────────

	describe("7. Batch Processing & PO Grouping", () => {
		it("filters out optimal items and prioritizes by urgency", () => {
			const items = [
				// Item A: OPTIMAL (stock 50 >= ROP 10)
				{
					inventoryItemId: "item-a",
					itemName: "Анестетик Артикаин",
					stockQuantity: 50,
					usageLookbackTotal: 90,
					leadTimeDays: 5,
					minQuantity: 10,
				},
				// Item B: STANDARD_REORDER (stock 12 > leadTimeDemand 5, ROP 20)
				{
					inventoryItemId: "item-b",
					itemName: "Перчатки нитриловые",
					stockQuantity: 12,
					usageLookbackTotal: 90,
					leadTimeDays: 5,
					minQuantity: 20,
				},
				// Item C: URGENT_OUT_OF_STOCK (stock 0)
				{
					inventoryItemId: "item-c",
					itemName: "Коффердам платки",
					stockQuantity: 0,
					usageLookbackTotal: 90,
					leadTimeDays: 5,
					minQuantity: 10,
				},
				// Item D: CRITICAL_REORDER (stock 3 <= leadTimeDemand 5)
				{
					inventoryItemId: "item-d",
					itemName: "Иглы карпульные",
					stockQuantity: 3,
					usageLookbackTotal: 90,
					leadTimeDays: 5,
					minQuantity: 10,
				},
			];

			const suggestions = computeBatchReorderSuggestions(items);
			// Item A is omitted because it does not require reorder
			assert.strictEqual(suggestions.length, 3);

			// Check priority ordering: URGENT (0) -> CRITICAL (1) -> STANDARD (2)
			assert.strictEqual(suggestions[0]?.status, "URGENT_OUT_OF_STOCK");
			assert.strictEqual(suggestions[0]?.inventoryItemId, "item-c");

			assert.strictEqual(suggestions[1]?.status, "CRITICAL_REORDER");
			assert.strictEqual(suggestions[1]?.inventoryItemId, "item-d");

			assert.strictEqual(suggestions[2]?.status, "STANDARD_REORDER");
			assert.strictEqual(suggestions[2]?.inventoryItemId, "item-b");
		});

		it("groups suggestions by supplier ID for purchase order drafts", () => {
			const suggestions = [
				{
					inventoryItemId: "item-1",
					supplierId: "sup-omega",
					suggestedQuantity: 10,
					dailyUsage: 1,
					leadTimeDemand: 5,
					reorderPoint: 10,
					available: 0,
					stockQuantity: 0,
					onOrderQuantity: 0,
					coverDays: 30,
					cover: 30,
					status: "URGENT_OUT_OF_STOCK" as const,
					estimatedStockDepletionDays: 0,
				},
				{
					inventoryItemId: "item-2",
					supplierId: "sup-omega",
					suggestedQuantity: 20,
					dailyUsage: 1,
					leadTimeDemand: 5,
					reorderPoint: 10,
					available: 5,
					stockQuantity: 5,
					onOrderQuantity: 0,
					coverDays: 30,
					cover: 30,
					status: "CRITICAL_REORDER" as const,
					estimatedStockDepletionDays: 5,
				},
				{
					inventoryItemId: "item-3",
					supplierId: "sup-alpha",
					suggestedQuantity: 15,
					dailyUsage: 0.5,
					leadTimeDemand: 3,
					reorderPoint: 8,
					available: 2,
					stockQuantity: 2,
					onOrderQuantity: 0,
					coverDays: 30,
					cover: 15,
					status: "CRITICAL_REORDER" as const,
					estimatedStockDepletionDays: 4,
				},
			];

			const grouped = groupSuggestionsBySupplier(suggestions);
			assert.strictEqual(Object.keys(grouped).length, 2);
			assert.strictEqual(grouped["sup-omega"]?.length, 2);
			assert.strictEqual(grouped["sup-alpha"]?.length, 1);
		});
	});

	// ── 8. Zod Schema Integrity ────────────────────────────────────────────────

	describe("8. Zod Schemas Validation", () => {
		it("validates reorder calculation params schema", () => {
			const parsed = reorderCalculationParamsSchema.parse({
				stockQuantity: 10,
				usageLookbackTotal: 100,
			});
			assert.strictEqual(parsed.stockQuantity, 10);
			assert.strictEqual(parsed.lookbackDays, DEFAULT_LOOKBACK_DAYS);
			assert.strictEqual(parsed.coverDays, DEFAULT_COVER_DAYS);
			assert.strictEqual(parsed.safetyStockRatio, DEFAULT_SAFETY_STOCK_RATIO);
		});

		it("validates reorder suggestion schema output", () => {
			const res = computeReorderSuggestion({
				stockQuantity: 2,
				usageLookbackTotal: 90,
				lookbackDays: 90,
				leadTimeDays: 7,
				minQuantity: 10,
			});
			assert.ok(res !== null);
			const validated = reorderSuggestionSchema.parse(res);
			assert.strictEqual(validated.status, "CRITICAL_REORDER");
		});

		it("validates supplier rating input and score schemas", () => {
			const input = supplierRatingInputSchema.parse({
				totalReceivedDeliveries: 50,
				onTimeDeliveries: 48,
				defectDeliveries: 1,
			});
			assert.strictEqual(input.totalReceivedDeliveries, 50);

			const score = computeSupplierRating(input);
			const validatedScore = supplierRatingScoreSchema.parse(score);
			assert.strictEqual(validatedScore.riskTier, "RELIABLE");
		});
	});
});
