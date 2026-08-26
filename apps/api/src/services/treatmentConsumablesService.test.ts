import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	InsufficientStockError,
	TreatmentConsumablesService,
	TreatmentConsumablesServiceError,
} from "./treatmentConsumablesService.js";

describe("TreatmentConsumablesService Unit Tests", () => {
	describe("Error Classes", () => {
		it("creates InsufficientStockError with accurate attributes", () => {
			const err = new InsufficientStockError({
				inventoryItemId: "item-123",
				inventoryItemName: "Filtek Z250",
				availableStock: 2,
				requiredStock: 5,
			});
			assert.strictEqual(err.statusCode, 400);
			assert.strictEqual(err.error, "InsufficientStock");
			assert.strictEqual(err.inventoryItemId, "item-123");
			assert.strictEqual(err.inventoryItemName, "Filtek Z250");
			assert.strictEqual(err.availableStock, 2);
			assert.strictEqual(err.requiredStock, 5);
			assert.match(err.message, /Недостаточно материалов на складе/);
		});

		it("creates TreatmentConsumablesServiceError with status code and code", () => {
			const err = new TreatmentConsumablesServiceError(
				"Custom error message",
				409,
				"CustomCode",
			);
			assert.strictEqual(err.statusCode, 409);
			assert.strictEqual(err.code, "CustomCode");
			assert.strictEqual(err.message, "Custom error message");
		});
	});

	describe("Stock Availability & Alerts Calculations", () => {
		it("checkStockSufficiency returns sufficient when all items in stock", async () => {
			const mockDb: any = {
				select: () => ({
					from: () => ({
						where: async () => [
							{
								id: "rule-1",
								serviceId: "srv-1",
								inventoryItemId: "item-1",
								quantityToDeduct: "0.5",
								requiredQty: "0.5",
							},
						],
					}),
				}),
			};

			// Second select for inventory items
			let callCount = 0;
			mockDb.select = () => ({
				from: () => ({
					where: async () => {
						callCount++;
						if (callCount === 1) {
							return [
								{
									id: "rule-1",
									serviceId: "srv-1",
									inventoryItemId: "item-1",
									quantityToDeduct: "0.5",
									requiredQty: "0.5",
								},
							];
						}
						return [
							{
								id: "item-1",
								name: "Композит световой",
								stockQuantity: "10.0",
								currentQty: "10.0",
								unit: "г",
								unitCostRub: "1200",
							},
						];
					},
				}),
			});

			const res = await TreatmentConsumablesService.checkStockSufficiency(
				mockDb,
				"org-1",
				[{ serviceId: "srv-1", quantity: 2 }],
			);

			assert.strictEqual(res.sufficient, true);
			assert.strictEqual(res.requiredMaterials.length, 1);
			assert.strictEqual(res.requiredMaterials[0]!.requiredQty, 1.0); // 0.5 * 2
			assert.strictEqual(res.requiredMaterials[0]!.availableQty, 10.0);
			assert.strictEqual(res.requiredMaterials[0]!.isSufficient, true);
			assert.strictEqual(res.requiredMaterials[0]!.deficit, 0);
			assert.strictEqual(res.warnings.length, 0);
		});

		it("checkStockSufficiency detects deficit and warns correctly", async () => {
			let callCount = 0;
			const mockDb: any = {
				select: () => ({
					from: () => ({
						where: async () => {
							callCount++;
							if (callCount === 1) {
								return [
									{
										id: "rule-1",
										serviceId: "srv-1",
										inventoryItemId: "item-1",
										quantityToDeduct: "2.0",
										requiredQty: "2.0",
									},
								];
							}
							return [
								{
									id: "item-1",
									name: "Анестетик Убистезин",
									stockQuantity: "3.0",
									currentQty: "3.0",
									unit: "карп.",
									unitCostRub: "220",
								},
							];
						},
					}),
				}),
			};

			const res = await TreatmentConsumablesService.checkStockSufficiency(
				mockDb,
				"org-1",
				[{ serviceId: "srv-1", quantity: 3 }], // Needs 6, has 3
			);

			assert.strictEqual(res.sufficient, false);
			assert.strictEqual(res.requiredMaterials.length, 1);
			assert.strictEqual(res.requiredMaterials[0]!.requiredQty, 6.0);
			assert.strictEqual(res.requiredMaterials[0]!.availableQty, 3.0);
			assert.strictEqual(res.requiredMaterials[0]!.isSufficient, false);
			assert.strictEqual(res.requiredMaterials[0]!.deficit, 3.0);
			assert.strictEqual(res.warnings.length, 1);
			assert.match(res.warnings[0]!, /Недостаточно материала «Анестетик Убистезин»/);
		});

		it("getInventoryAlerts accurately classifies stock states and expirations", async () => {
			const mockDb: any = {
				select: () => ({
					from: () => ({
						where: () => ({
							orderBy: async () => [
								{
									id: "item-1",
									name: "Обычный материал",
									category: "composite",
									unit: "шт",
									stockQuantity: "50",
									currentQty: "50",
									criticalThreshold: "10",
									unitCostRub: "500",
									expirationDate: "2028-01-01",
								},
								{
									id: "item-2",
									name: "Низкий остаток",
									category: "endo",
									unit: "г",
									stockQuantity: "5",
									currentQty: "5",
									criticalThreshold: "10",
									unitCostRub: "1000",
									expirationDate: null,
								},
								{
									id: "item-3",
									name: "Закончился",
									category: "ppe",
									unit: "уп",
									stockQuantity: "0",
									currentQty: "0",
									criticalThreshold: "5",
									unitCostRub: "300",
									expirationDate: null,
								},
								{
									id: "item-4",
									name: "Просроченный анестетик",
									category: "anesthesia",
									unit: "карп",
									stockQuantity: "20",
									currentQty: "20",
									criticalThreshold: "5",
									unitCostRub: "200",
									expirationDate: "2025-01-01",
								},
							],
						}),
					}),
				}),
			};

			const alerts = await TreatmentConsumablesService.getInventoryAlerts(
				mockDb,
				"org-1",
			);

			assert.strictEqual(alerts.summary.totalItems, 4);
			assert.strictEqual(alerts.summary.lowStockCount, 1); // item-2 (stock 5 <= threshold 10)
			assert.strictEqual(alerts.summary.outOfStockCount, 1); // item-3 (stock 0)
			assert.strictEqual(alerts.summary.expiredCount, 1); // item-4 (2025-01-01)
			assert.strictEqual(alerts.lowStockItems[0]!.name, "Низкий остаток");
			assert.strictEqual(alerts.outOfStockItems[0]!.name, "Закончился");
			assert.strictEqual(alerts.expiredItems[0]!.name, "Просроченный анестетик");
		});
	});

	describe("Recipe Management Logic", () => {
		it("validates quantity when creating a link", async () => {
			const mockDb: any = {};
			await assert.rejects(
				async () => {
					await TreatmentConsumablesService.createLink(mockDb, "org-1", {
						serviceId: "srv-1",
						inventoryItemId: "item-1",
						quantity: -5,
					});
				},
				{
					name: "TreatmentConsumablesServiceError",
					code: "InvalidQuantity",
				},
			);
		});

		it("throws ServiceNotFound if service is not in catalog", async () => {
			const mockDb: any = {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: async () => [],
						}),
					}),
				}),
			};

			await assert.rejects(
				async () => {
					await TreatmentConsumablesService.createLink(mockDb, "org-1", {
						serviceId: "non-existent-service",
						inventoryItemId: "item-1",
						quantity: 1,
					});
				},
				{
					name: "TreatmentConsumablesServiceError",
					code: "ServiceNotFound",
				},
			);
		});

		it("throws LinkAlreadyExists on duplicate pair", async () => {
			let selectStep = 0;
			const mockDb: any = {
				select: () => ({
					from: () => ({
						where: () => ({
							limit: async () => {
								selectStep++;
								if (selectStep === 1) return [{ id: "srv-1", code: "A16" }]; // service
								if (selectStep === 2) return [{ id: "item-1", name: "Bond" }]; // item
								if (selectStep === 3) return [{ id: "existing-link" }]; // existing rule
								return [];
							},
						}),
					}),
				}),
			};

			await assert.rejects(
				async () => {
					await TreatmentConsumablesService.createLink(mockDb, "org-1", {
						serviceId: "srv-1",
						inventoryItemId: "item-1",
						quantity: 1,
					});
				},
				{
					name: "TreatmentConsumablesServiceError",
					code: "LinkAlreadyExists",
				},
			);
		});
	});
});
