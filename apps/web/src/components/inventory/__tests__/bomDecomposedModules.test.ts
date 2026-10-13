/**
 * bomDecomposedModules.test.ts
 *
 * Dedicated unit tests for decomposed BOM modules:
 * 1. bomBatchMatcher (FEFO sorting, expiry check, stock resolution, batch allocation)
 * 2. bomDeductionValidator (balance checking, soft overdraft alerts, SSOT kopeck reconciliation)
 * 3. bomDeductionCalculator (804n service normalization, SanPiN act generation, waste disposal)
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	resolveFefoStockMap,
	allocateBatchesFefo,
	type BatchCandidate,
} from "../deductionModules/bomBatchMatcher.js";
import {
	validateDeductionBalances,
} from "../deductionModules/bomDeductionValidator.js";
import {
	normalizeRenderedServices804n,
	buildCabinetScopedStockMap,
	generateDeterministicWasteActIdentifiers,
	formatShiftCloseClassBWasteActHtml,
	executeShiftCloseClassBWasteDisposal,
} from "../deductionModules/bomDeductionCalculator.js";
import type { InventoryItem } from "../inventoryDataMappers.js";

describe("Decomposed BOM Modules Suite", () => {
	describe("1. bomBatchMatcher", () => {
		it("resolves FEFO stock map isolating expired batches and reporting warnings", () => {
			const blockedBatches: string[] = [];
			const batches: BatchCandidate[] = [
				{ batchNumber: "EXP-1", expiryDate: "2020-01-01", stockQuantity: 10, itemId: "item-1" },
				{ batchNumber: "VALID-1", expiryDate: "2030-01-01", stockQuantity: 15, itemId: "item-1" },
			];

			const result = resolveFefoStockMap(
				batches,
				{
					visitDate: "2026-06-01",
					onExpiredBatchBlocked: (warning) => {
						blockedBatches.push(warning.batchNumber);
					},
				},
			);

			assert.equal(blockedBatches.length, 1);
			assert.equal(blockedBatches[0], "EXP-1");
			assert.equal(result.validStockMap["item-1"], 15);
			assert.equal(result.quarantinedBatchesCount, 1);
		});

		it("enforces chair and cabinet isolation in resolveFefoStockMap", () => {
			const batches: BatchCandidate[] = [
				{ batchNumber: "CHAIR-1", expiryDate: "2030-01-01", stockQuantity: 5, itemId: "item-1", chairId: "chair-1" },
				{ batchNumber: "CHAIR-2", expiryDate: "2030-01-01", stockQuantity: 10, itemId: "item-1", chairId: "chair-2" },
			];

			const result = resolveFefoStockMap(
				batches,
				{
					chairId: "chair-1",
					visitDate: "2026-06-01",
				},
			);

			assert.equal(result.validStockMap["item-1"], 5);
		});

		it("allocates batches using FEFO order (earliest expiry first)", () => {
			const batches: BatchCandidate[] = [
				{ batchNumber: "B-LATER", expiryDate: "2028-01-01", stockQuantity: 10, itemId: "item-composite" },
				{ batchNumber: "B-EARLY", expiryDate: "2027-01-01", stockQuantity: 4, itemId: "item-composite" },
			];

			const allocations = allocateBatchesFefo("item-composite", 6, batches, { visitDate: "2026-06-01" });
			assert.equal(allocations.length, 2);
			assert.equal(allocations[0]?.batchNumber, "B-EARLY");
			assert.equal(allocations[0]?.allocatedQuantity, 4);
			assert.equal(allocations[1]?.batchNumber, "B-LATER");
			assert.equal(allocations[1]?.allocatedQuantity, 2);
		});
	});

	describe("2. bomDeductionValidator", () => {
		it("validates sufficient balances with zero overdraft", () => {
			const validation = validateDeductionBalances(
				[
					{
						inventoryItemId: "item-1",
						itemName: "Септанест 1:100 000",
						deductedQty: 2,
						remainingQty: 8,
						isOverdraft: false,
						unitCostPriceKopecks: 12000,
						unit: "carpule",
					},
				],
				{
					visitId: "v-101",
					visitNumber: "101",
					totalCostPriceRub: "240 ₽",
				},
			);
			assert.equal(validation.hasOverdraft, false);
			assert.equal(validation.overdraftItems.length, 0);
			assert.equal(validation.toastType, "success");
			assert.ok(validation.toastMessage.includes("Автосписание расходников: 1 поз."));
		});

		it("detects soft overdraft and generates clinical notice with deficit quantities", () => {
			const validation = validateDeductionBalances(
				[
					{
						inventoryItemId: "item-1",
						itemName: "Септанест 1:100 000",
						deductedQty: 5,
						remainingQty: -3,
						isOverdraft: true,
						unitCostPriceKopecks: 12000,
						unit: "carpule",
					},
				],
				{
					visitId: "v-102",
					visitNumber: "102",
				},
			);
			assert.equal(validation.hasOverdraft, true);
			assert.equal(validation.overdraftItems.length, 1);
			assert.equal(validation.overdraftItems[0]?.deficitQty, 3);
			assert.equal(validation.toastType, "warning");
			assert.ok(validation.overdraftNotice.includes("Требуется оприходование"));
			assert.ok(validation.overdraftNotice.includes("102"));
			assert.ok(validation.toastMessage.includes("Мягкий овердрафт"));
		});
	});

	describe("3. bomDeductionCalculator", () => {
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
});
