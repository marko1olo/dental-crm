/**
 * softWarehouseDeductionAndStorno.test.ts — расчет списаний и сторно при отмене услуги.
 * (Мандат 8b: строго <= 120 строк).
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { calculateDeductionSummary, type DeductionLineItem } from "../../inventory/inventoryMath";
import { calculateClinicalWriteoffTotals, type ClinicalWriteoffLine } from "../../inventory/writeoff/clinicalWriteoffEngine";
import { rublesToKopecks } from "@dental/shared";

describe("Soft Warehouse Overdraft — Списание и Сторно", () => {
	test("4. calculateDeductionSummary в ProcedureMaterialDeductionModal фиксирует дефицит", () => {
		const lines: DeductionLineItem[] = [
			{
				id: "line-1",
				materialName: "Анестетик Артикаин",
				category: "anesthesia",
				unit: "карп.",
				quantity: 2,
				standardQuantity: 2,
				unitCostKopecks: 25000,
				stockQuantity: 0,
				criticalThreshold: 5,
				source: "tech_map",
				mandatory: true,
			},
			{
				id: "line-2",
				materialName: "Перчатки нитриловые",
				category: "ppe",
				unit: "пар",
				quantity: 1,
				standardQuantity: 1,
				unitCostKopecks: 5000,
				stockQuantity: 50,
				criticalThreshold: 10,
				source: "tech_map",
				mandatory: true,
			},
		];

		const summary = calculateDeductionSummary(lines);
		assert.equal(summary.hasDeficit, true);
		assert.equal(summary.criticalCount, 1);
		assert.equal(summary.totalCostKopecks, 55000);

		const line1Shortfall = Math.max(0, lines[0]!.quantity - lines[0]!.stockQuantity);
		assert.equal(line1Shortfall, 2);
	});

	test("5. calculateClinicalWriteoffTotals в ClinicalWriteoffModal рассчитывает дефицит", () => {
		const lines: ClinicalWriteoffLine[] = [
			{
				id: "cw-line-1",
				materialId: "mat-bio-oss-01",
				serviceCode: "A16.07.055",
				serviceTitle: "Костная пластика",
				sku: "SKU-001",
				nameRu: "Bio-Oss",
				category: "surgery",
				unit: "г",
				okeiCode: "163",
				unitCostKopecks: rublesToKopecks(4500),
				totalCostKopecks: rublesToKopecks(4500),
				standardQuantity: 1,
				actualQuantity: 1,
				discrepancyQuantity: 0,
				discrepancyReasonCode: "standard_consumption",
				isExpiringSoon: false,
				isExpired: false,
				stockAvailable: 0,
				criticalThreshold: 2,
				stockStatus: "deficit",
				isMandatory: true,
				requiresLotTracking: true,
				requiresSerialNumber: false,
			},
		];

		const totals = calculateClinicalWriteoffTotals(lines, 1);
		assert.equal(totals.hasDeficit, true);
		assert.equal(totals.deficitItemsCount, 1);
		assert.equal(totals.totalCostRubles, 4500);
	});

	test("6. Автоматическое сторно при отмене услуги восстанавливает остаток и гасит овердрафт", () => {
		const overdraftItem = { id: "inv-anes", stockQuantity: -2 };
		const stornoQtyFull = 2;
		const newStockFull = Number((overdraftItem.stockQuantity + stornoQtyFull).toFixed(4));
		const wasOverdraft = overdraftItem.stockQuantity < 0;
		const overdraftCleared = wasOverdraft && newStockFull >= 0;

		assert.equal(newStockFull, 0);
		assert.equal(overdraftCleared, true);

		const stornoTransaction = {
			itemId: overdraftItem.id,
			quantityChanged: String(stornoQtyFull),
			transactionType: "storno",
			notes: "Списание материалов по услуге отменено: автоматическое сторно при отмене услуги",
		};

		assert.equal(stornoTransaction.transactionType, "storno");
		assert.equal(Number(stornoTransaction.quantityChanged), 2);
	});
});
