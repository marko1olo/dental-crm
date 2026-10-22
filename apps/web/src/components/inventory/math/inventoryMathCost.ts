import {
	type Kopecks,
	formatKopecksRu,
	multiplyKopecks,
	sumKopecks,
} from "@dental/shared";
import type {
	DeductionLineItem,
	DeductionSummary,
	TechMapCategory,
} from "./inventoryMathTypes.js";
import { evaluateStockStatus } from "./inventoryMathStock.js";

export function calculateLineCostKopecks(
	unitCostKopecks: Kopecks,
	quantity: number,
): Kopecks {
	if (!Number.isFinite(quantity) || quantity <= 0) return 0;
	if (Number.isInteger(quantity)) {
		return multiplyKopecks(unitCostKopecks, quantity);
	}
	return Math.round(unitCostKopecks * quantity);
}

export function calculateTotalDeductionCostKopecks(
	lines: readonly { unitCostKopecks: Kopecks; quantity: number }[],
): Kopecks {
	const lineCosts = lines.map((l) =>
		calculateLineCostKopecks(l.unitCostKopecks, l.quantity),
	);
	return sumKopecks(lineCosts);
}

export function calculateDeductionSummary(
	lines: readonly DeductionLineItem[],
): DeductionSummary {
	let totalQty = 0;
	let totalCostKopecks: Kopecks = 0;
	let criticalCount = 0;
	let warningCount = 0;

	const categoryMap: Record<
		TechMapCategory,
		{ count: number; costKopecks: Kopecks }
	> = {
		ppe: { count: 0, costKopecks: 0 },
		anesthesia: { count: 0, costKopecks: 0 },
		caries: { count: 0, costKopecks: 0 },
		endo: { count: 0, costKopecks: 0 },
		hygiene: { count: 0, costKopecks: 0 },
		surgery: { count: 0, costKopecks: 0 },
		other: { count: 0, costKopecks: 0 },
	};

	for (const line of lines) {
		const qty = Number.isFinite(line.quantity) ? line.quantity : 0;
		totalQty += qty;

		const lineCost = calculateLineCostKopecks(line.unitCostKopecks, qty);
		totalCostKopecks += lineCost;

		const stockStatus = evaluateStockStatus(
			line.stockQuantity,
			qty,
			line.criticalThreshold,
			line.unit,
		);

		if (stockStatus.severity === "critical") {
			criticalCount++;
		} else if (stockStatus.severity === "warning") {
			warningCount++;
		}

		const cat = categoryMap[line.category] ?? categoryMap.other;
		cat.count++;
		cat.costKopecks += lineCost;
	}

	const categoryBreakdown = {} as DeductionSummary["categoryBreakdown"];
	for (const [key, val] of Object.entries(categoryMap) as [
		TechMapCategory,
		{ count: number; costKopecks: Kopecks },
	][]) {
		categoryBreakdown[key] = {
			count: val.count,
			costKopecks: val.costKopecks,
			costFormatted: formatKopecksRu(val.costKopecks),
		};
	}

	return {
		totalLines: lines.length,
		totalQuantity: Number(totalQty.toFixed(4)),
		totalCostKopecks,
		totalCostFormatted: formatKopecksRu(totalCostKopecks),
		criticalCount,
		warningCount,
		hasDeficit: criticalCount > 0,
		categoryBreakdown,
	};
}
