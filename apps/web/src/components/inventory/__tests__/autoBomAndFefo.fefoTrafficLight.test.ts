import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
	formatRuDate,
	isBatchExpired,
	resolveFefoDeductionBatches,
	sortBatchesByFefo,
	validateBatchForClinicalUse,
} from "../fefoTrafficLight.js";

describe("2. FEFO Traffic Light & Expired Batch Quarantine", () => {
	const refDate = new Date("2026-05-15T10:00:00Z");

	it("formatRuDate форматирует даты в ДД.ММ.ГГГГ", () => {
		assert.equal(formatRuDate("2026-04-10"), "10.04.2026");
		assert.equal(formatRuDate(new Date(2026, 3, 10)), "10.04.2026");
		assert.equal(formatRuDate(null), "");
		assert.equal(formatRuDate(undefined), "");
	});

	it("isBatchExpired точно определяет просрочку относительно даты", () => {
		assert.equal(isBatchExpired("2026-04-01", refDate), true);
		assert.equal(isBatchExpired("2026-05-14", refDate), true);
		assert.equal(isBatchExpired("2026-05-16", refDate), false);
		assert.equal(isBatchExpired("2026-12-31", refDate), false);
	});

	it("validateBatchForClinicalUse формирует текст блокировки", () => {
		const expiredBatch = {
			batchNumber: "LOT-2024-EXP",
			expiryDate: "2026-04-20",
			stockQuantity: 15,
		};
		const val = validateBatchForClinicalUse(expiredBatch, refDate);
		assert.equal(val.isAllowed, false);
		assert.equal(val.isExpired, true);
		assert.equal(
			val.alertMessage,
			"Срок годности партии истек 20.04.2026! Партия заблокирована для утилизации",
		);
		assert.equal(val.status, "red");
	});

	it("sortBatchesByFefo сортирует годные партии по возрастанию срока", () => {
		const batches = [
			{ id: "b3", expiryDate: "2027-01-01" },
			{ id: "b1", expiryDate: "2026-06-01" },
			{ id: "b4", expiryDate: "2026-04-01" },
			{ id: "b2", expiryDate: "2026-08-01" },
		];
		const sorted = sortBatchesByFefo(batches, refDate);
		assert.equal(sorted[0]!.id, "b1");
		assert.equal(sorted[1]!.id, "b2");
		assert.equal(sorted[2]!.id, "b3");
		assert.equal(sorted[3]!.id, "b4");
	});

	it("resolveFefoDeductionBatches изолирует просроченные партии", () => {
		const batches = [
			{
				id: "batch-exp",
				batchNumber: "LOT-OLD-99",
				expiryDate: "2026-03-01",
				stockQuantity: 50,
			},
			{
				id: "batch-good-near",
				batchNumber: "LOT-2026-06",
				expiryDate: "2026-06-15",
				stockQuantity: 2,
			},
			{
				id: "batch-good-far",
				batchNumber: "LOT-2027-01",
				expiryDate: "2027-01-10",
				stockQuantity: 10,
			},
		];

		const res = resolveFefoDeductionBatches(batches, 5, refDate);
		assert.equal(res.blockedExpiredBatches.length, 1);
		assert.equal(res.blockedExpiredBatches[0]!.batch.batchNumber, "LOT-OLD-99");
		assert.equal(
			res.blockedExpiredBatches[0]!.alertMessage,
			"Срок годности партии истек 01.03.2026! Партия заблокирована для утилизации",
		);
		assert.equal(res.allocatedBatches.length, 2);
		assert.equal(res.allocatedBatches[0]!.batch.id, "batch-good-near");
		assert.equal(res.allocatedBatches[0]!.allocatedQuantity, 2);
		assert.equal(res.allocatedBatches[1]!.batch.id, "batch-good-far");
		assert.equal(res.allocatedBatches[1]!.allocatedQuantity, 3);
		assert.equal(res.allocatedTotalQuantity, 5);
		assert.equal(res.remainingDeficit, 0);
		assert.equal(res.hasOverdraft, false);
	});

	it("при наличии только просроченной партии блокирует её и переводит в овердрафт", () => {
		const onlyExpired = [
			{
				id: "batch-only-exp",
				batchNumber: "LOT-EXPIRED-ONLY",
				expiryDate: "2026-01-10",
				stockQuantity: 20,
			},
		];
		const res = resolveFefoDeductionBatches(onlyExpired, 2, refDate);
		assert.equal(res.allocatedBatches.length, 0);
		assert.equal(res.blockedExpiredBatches.length, 1);
		assert.equal(res.remainingDeficit, 2);
		assert.equal(res.hasOverdraft, true);
	});
});
