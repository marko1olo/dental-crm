import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	CONSUMABLE_NOTE_MAX_LENGTH,
	calculateRecipeEstimatedCost,
	calculateRecipeEstimatedCostKopecks,
	categorizeInventoryExpiry,
	consumableLinkCreateSchema,
	consumableLinkDetailedSchema,
	consumableLinkResponseSchema,
	consumableLinkUpdateSchema,
	getConsumablePriceKopecks,
	getConsumableTotalCostKopecks,
	getConsumableUnitCostKopecks,
	inventoryAlertItemSchema,
	inventoryAlertSummarySchema,
	isDeductibleQuantity,
	linkOptionsItemSchema,
	linkOptionsResponseSchema,
	linkOptionsTreatmentSchema,
	stockAvailabilityCheckRequestSchema,
	stockAvailabilityCheckResponseSchema,
	stockDeductionRecordSchema,
	stockDeductionResultSchema,
	visitStockDeductionRequestSchema,
} from "../inventory/consumables.js";

describe("Treatment Consumables Shared Contracts & Calculations", () => {
	describe("Validation Schemas", () => {
		it("validates consumableLinkCreateSchema correctly", () => {
			const valid = {
				serviceId: "srv-123",
				inventoryItemId: "item-456",
				quantity: 0.35,
				note: "Световая пломба Filtek Z250",
			};
			const res = consumableLinkCreateSchema.safeParse(valid);
			assert.strictEqual(res.success, true);
			if (res.success) {
				assert.strictEqual(res.data.quantity, 0.35);
			}
		});

		it("rejects negative or zero quantities", () => {
			assert.strictEqual(
				consumableLinkCreateSchema.safeParse({
					serviceId: "srv-123",
					inventoryItemId: "item-456",
					quantity: 0,
				}).success,
				false,
			);

			assert.strictEqual(
				consumableLinkCreateSchema.safeParse({
					serviceId: "srv-123",
					inventoryItemId: "item-456",
					quantity: -1.5,
				}).success,
				false,
			);
		});

		it("enforces note max length of 200 characters", () => {
			const longNote = "a".repeat(CONSUMABLE_NOTE_MAX_LENGTH + 1);
			assert.strictEqual(
				consumableLinkCreateSchema.safeParse({
					serviceId: "srv-123",
					inventoryItemId: "item-456",
					quantity: 1,
					note: longNote,
				}).success,
				false,
			);
		});

		it("validates consumableLinkUpdateSchema with partial updates", () => {
			assert.strictEqual(
				consumableLinkUpdateSchema.safeParse({
					quantity: 2.5,
				}).success,
				true,
			);

			assert.strictEqual(
				consumableLinkUpdateSchema.safeParse({
					note: "Обновлённое примечание",
				}).success,
				true,
			);

			assert.strictEqual(
				consumableLinkUpdateSchema.safeParse({
					note: null,
				}).success,
				true,
			);
		});

		it("validates consumableLinkDetailedSchema with kopecks fields (Mandate 8bm)", () => {
			const detailed = {
				id: "link-1",
				organizationId: "org-1",
				serviceId: "srv-1",
				inventoryItemId: "item-1",
				quantity: 1.5,
				note: "1 карпула анестетика",
				createdAt: new Date().toISOString(),
				serviceCode: "A16.07.002.001",
				serviceTitle: "Восстановление зуба пломбой",
				itemName: "Убистезин 4% 1.7 мл",
				itemUnit: "карп.",
				stockQuantity: 45,
				unitCostRub: 220,
				unitCostKopecks: 22000,
				criticalThreshold: 10,
				totalCostRub: 330,
				totalCostKopecks: 33000,
				isLowStock: false,
			};
			const res = consumableLinkDetailedSchema.safeParse(detailed);
			assert.strictEqual(res.success, true);
		});

		it("validates linkOptions and alerts with integer kopecks fields", () => {
			const treatment = {
				id: "srv-1",
				name: "Консультация",
				priceRub: 1500,
				priceKopecks: 150000,
			};
			assert.strictEqual(linkOptionsTreatmentSchema.safeParse(treatment).success, true);

			const item = {
				id: "item-1",
				name: "Шприц 2 мл",
				unitCostRub: 15.5,
				unitCostKopecks: 1550,
			};
			assert.strictEqual(linkOptionsItemSchema.safeParse(item).success, true);

			const alertItem = {
				id: "alert-1",
				name: "Коффердам",
				category: "consumables",
				unit: "упак",
				stockQuantity: 2,
				criticalThreshold: 5,
				unitCostRub: 1200,
				unitCostKopecks: 120000,
			};
			assert.strictEqual(inventoryAlertItemSchema.safeParse(alertItem).success, true);

			const alertSummary = {
				totalItems: 10,
				totalValuationRub: 50000,
				totalValuationKopecks: 5000000,
				lowStockCount: 2,
				outOfStockCount: 0,
				expiredCount: 0,
				expiringSoonCount: 1,
			};
			assert.strictEqual(inventoryAlertSummarySchema.safeParse(alertSummary).success, true);
		});

		it("validates stock deduction results and warnings", () => {
			const result = {
				completedTreatmentItems: 2,
				deductions: [
					{
						inventoryItemId: "item-1",
						inventoryItemName: "Filtek Z250",
						quantityChanged: "-0.35",
						unitCostRub: "1300",
						remainingStock: 49.65,
					},
				],
				warnings: [
					{
						type: "low_stock" as const,
						itemId: "item-1",
						itemName: "Filtek Z250",
						message: "Остаток близок к минимальному",
						currentStock: 49.65,
						criticalThreshold: 50,
					},
				],
			};
			const parsed = stockDeductionResultSchema.safeParse(result);
			assert.strictEqual(parsed.success, true);
		});

		it("validates stock availability check schemas", () => {
			const req = {
				items: [
					{ serviceId: "srv-1", quantity: 2 },
					{ serviceId: "srv-2", quantity: 1 },
				],
			};
			assert.strictEqual(
				stockAvailabilityCheckRequestSchema.safeParse(req).success,
				true,
			);

			const resp = {
				sufficient: false,
				requiredMaterials: [
					{
						inventoryItemId: "item-1",
						itemName: "Стеклоиономерный цемент",
						requiredQty: 2,
						availableQty: 0.5,
						isSufficient: false,
						deficit: 1.5,
						unit: "г",
						unitCostRub: 500,
					},
				],
				warnings: ["Недостаточно материала: Стеклоиономерный цемент (дефицит 1.5 г)"],
			};
			assert.strictEqual(
				stockAvailabilityCheckResponseSchema.safeParse(resp).success,
				true,
			);
		});
	});

	describe("Helper Functions", () => {
		it("isDeductibleQuantity correctly validates numbers", () => {
			assert.strictEqual(isDeductibleQuantity(1), true);
			assert.strictEqual(isDeductibleQuantity(0.001), true);
			assert.strictEqual(isDeductibleQuantity(0), false);
			assert.strictEqual(isDeductibleQuantity(-1), false);
			assert.strictEqual(isDeductibleQuantity(Number.NaN), false);
			assert.strictEqual(isDeductibleQuantity(Number.POSITIVE_INFINITY), false);
		});

		it("calculateRecipeEstimatedCost and calculateRecipeEstimatedCostKopecks compute accurate sums", () => {
			const materials = [
				{ quantity: 0.35, unitCostRub: 1300 },
				{ quantity: 1, unitCostRub: 220 },
				{ quantity: 2, unitCostRub: 35 },
			];
			const total = calculateRecipeEstimatedCost(materials);
			assert.strictEqual(total, 745);

			const kopecksTotal = calculateRecipeEstimatedCostKopecks([
				{ quantity: 0.35, unitCostKopecks: 130000 },
				{ quantity: 1, unitCostKopecks: 22000 },
				{ quantity: 2, unitCostKopecks: 3500 },
			]);
			assert.strictEqual(kopecksTotal, 74500);
		});

		it("getConsumableUnitCostKopecks, getConsumableTotalCostKopecks, getConsumablePriceKopecks convert reliably", () => {
			assert.strictEqual(getConsumableUnitCostKopecks({ unitCostKopecks: 5000 }), 5000);
			assert.strictEqual(getConsumableUnitCostKopecks({ unitCostRub: 50 }), 5000);
			assert.strictEqual(getConsumableUnitCostKopecks({ unitCostRub: "50.50" }), 5050);

			assert.strictEqual(getConsumableTotalCostKopecks({ totalCostKopecks: 12500 }), 12500);
			assert.strictEqual(getConsumableTotalCostKopecks({ totalCostRub: 125 }), 12500);

			assert.strictEqual(getConsumablePriceKopecks({ priceKopecks: 99000 }), 99000);
			assert.strictEqual(getConsumablePriceKopecks({ priceRub: 990 }), 99000);
		});

		it("categorizeInventoryExpiry accurately flags expiration states", () => {
			const refDate = new Date("2026-08-27T00:00:00Z");

			// No date
			assert.strictEqual(categorizeInventoryExpiry(null, refDate).status, "no_date");
			assert.strictEqual(categorizeInventoryExpiry("", refDate).status, "no_date");

			// Expired (yesterday)
			const expired = categorizeInventoryExpiry("2026-08-26", refDate);
			assert.strictEqual(expired.status, "expired");
			assert.strictEqual(expired.daysRemaining, -1);

			// Expiring soon (10 days ahead)
			const soon = categorizeInventoryExpiry("2026-09-06", refDate);
			assert.strictEqual(soon.status, "expiring_soon");
			assert.strictEqual(soon.daysRemaining, 10);

			// Valid (100 days ahead)
			const valid = categorizeInventoryExpiry("2026-12-05", refDate);
			assert.strictEqual(valid.status, "valid");
			assert.strictEqual(valid.daysRemaining, 100);
		});
	});
});
