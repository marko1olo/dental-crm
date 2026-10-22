import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	resolveFefoStockMap,
	allocateBatchesFefo,
	type BatchCandidate,
} from "../deductionModules/bomBatchMatcher.js";

describe("bomBatchMatcher unit tests", () => {
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
