import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
	type CabinetStockBatch,
	calculateLineCostKopecks,
	findBestBatchFefo,
	getDaysUntilExpiration,
	kopecksToRubles,
	updateLineActualQuantity,
	aggregateWriteoffFromServices,
} from "../writeoff/clinicalWriteoffEngine.js";
import { DENTAL_CABINET_STOCK_PRESETS } from "../writeoff/clinicalWriteoffPresets.js";

describe("Clinical Writeoff: FEFO & Financial Calculation", () => {
	it("Выбирает партию с более ранним сроком годности (FEFO)", () => {
		const testBatches: CabinetStockBatch[] = [
			{
				batchId: "batch_future",
				materialId: "mat_filtek_ultimate",
				cabinetId: "cab_01_therapy",
				cabinetNameRu: "Кабинет №1",
				lotNumber: "LOT-2028-FUTURE",
				expirationDate: "2028-12-31",
				manufactureDate: "2025-01-01",
				quantityAvailable: 10,
				criticalThreshold: 2,
				unitCostKopecks: 135000,
				supplierNameRu: "3M",
			},
			{
				batchId: "batch_soon",
				materialId: "mat_filtek_ultimate",
				cabinetId: "cab_01_therapy",
				cabinetNameRu: "Кабинет №1",
				lotNumber: "LOT-2026-SOON",
				expirationDate: "2026-09-15",
				manufactureDate: "2023-09-01",
				quantityAvailable: 2,
				criticalThreshold: 2,
				unitCostKopecks: 135000,
				supplierNameRu: "3M",
			},
		];

		const result = findBestBatchFefo(
			"mat_filtek_ultimate",
			0.3,
			testBatches,
			"cab_01_therapy",
			"2026-08-22",
		);

		assert.ok(result.batch);
		assert.equal(result.batch.batchId, "batch_soon");
		assert.equal(result.isExpiringSoon, true);
		assert.equal(result.isExpired, false);
	});

	it("Определяет просроченные партии и рассчитывает дни до истечения", () => {
		assert.equal(getDaysUntilExpiration("2026-08-30", "2026-08-22"), 8);
		assert.equal(getDaysUntilExpiration("2026-08-10", "2026-08-22"), -12);
	});

	it("calculateLineCostKopecks считает точную стоимость целых и дробных объемов", () => {
		const cost1 = calculateLineCostKopecks(135000, 0.3);
		assert.equal(cost1, 40500);

		const cost2 = calculateLineCostKopecks(195000, 0.05);
		assert.equal(cost2, 9750);
		assert.equal(kopecksToRubles(cost2), 97.5);
	});

	it("updateLineActualQuantity фиксирует перерасход и причину отклонения", () => {
		const baseLines = aggregateWriteoffFromServices(
			[{ serviceCode: "A16.07.004", serviceTitle: "Анестезия" }],
			DENTAL_CABINET_STOCK_PRESETS,
		);
		const anesLine = baseLines.find((l) => l.materialId === "mat_articaine_ultracain");
		assert.ok(anesLine);

		const updated = updateLineActualQuantity(
			anesLine,
			2,
			"additional_carpule",
			"Повышенная болевая чувствительность пациента",
		);

		assert.equal(updated.actualQuantity, 2);
		assert.equal(updated.discrepancyQuantity, 1);
		assert.equal(updated.discrepancyReasonCode, "additional_carpule");
		assert.equal(updated.totalCostKopecks, anesLine.unitCostKopecks * 2);
	});
});
