import { type Kopecks, formatKopecksRu } from "@dental/shared";
import type {
	ClinicalWriteoffLine,
	ClinicalWriteoffTotals,
} from "./clinicalWriteoffTypes.js";
import {
	calculateLineCostKopecks,
	kopecksToRubles,
} from "./clinicalWriteoffMath.js";

export function calculateClinicalWriteoffTotals(
	lines: readonly ClinicalWriteoffLine[],
	completedServicesCount: number = 0,
): ClinicalWriteoffTotals {
	let totalQty = 0;
	let totalCostKopecks: Kopecks = 0;
	let totalDiscrepancyCostKopecks: Kopecks = 0;
	let expiringBatchesCount = 0;
	let expiredBatchesCount = 0;
	let deficitItemsCount = 0;

	for (const line of lines) {
		const actQty = Number.isFinite(line.actualQuantity) ? line.actualQuantity : 0;
		totalQty += actQty;

		const lineCost = calculateLineCostKopecks(line.unitCostKopecks, actQty);
		totalCostKopecks += lineCost;

		const discQty = line.discrepancyQuantity;
		if (discQty !== 0) {
			const discCost = calculateLineCostKopecks(line.unitCostKopecks, Math.abs(discQty));
			totalDiscrepancyCostKopecks += discCost;
		}

		if (line.isExpired) expiredBatchesCount++;
		else if (line.isExpiringSoon) expiringBatchesCount++;

		if (line.stockStatus === "deficit") deficitItemsCount++;
	}

	return {
		totalServicesCount: completedServicesCount,
		totalMaterialsCount: lines.length,
		totalMaterialsQuantity: Number(totalQty.toFixed(4)),
		totalCostKopecks,
		totalCostFormatted: formatKopecksRu(totalCostKopecks),
		totalCostRubles: kopecksToRubles(totalCostKopecks),
		totalDiscrepancyCostKopecks,
		totalDiscrepancyCostFormatted: formatKopecksRu(totalDiscrepancyCostKopecks),
		totalDiscrepancyCostRubles: kopecksToRubles(totalDiscrepancyCostKopecks),
		expiringBatchesCount,
		expiredBatchesCount,
		deficitItemsCount,
		hasDeficit: deficitItemsCount > 0,
		hasExpiringLots: expiringBatchesCount > 0,
		hasExpiredLots: expiredBatchesCount > 0,
	};
}
