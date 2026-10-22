import {
	formatCurrencyRu,
	formatKopecksRu,
	kopecksToRubles,
} from "@dental/shared";
import type {
	TransferTotalsSummary,
	WarehouseTransferLineItem,
} from "./warehouseTransferTypes.js";

export function formatRubCurrency(rublesOrKopecks: number, isKopecks = false): string {
	return isKopecks ? formatKopecksRu(Math.round(rublesOrKopecks)) : formatCurrencyRu(rublesOrKopecks);
}

export function calculateTransferTotals(
	items: readonly WarehouseTransferLineItem[],
): TransferTotalsSummary {
	let totalRequestedQuantity = 0;
	let totalDispatchedQuantity = 0;
	let totalReceivedQuantity = 0;
	let totalDispatchedCostKopecks = 0;
	let totalReceivedCostKopecks = 0;
	let totalDiscrepancyDamageKopecks = 0;
	let hasDiscrepancy = false;

	for (const item of items) {
		const reqQty = Math.max(0, item.requestedQuantity);
		const dispQty = Math.max(0, item.dispatchedQuantity);
		const recQty = Math.max(0, item.receivedQuantity);

		totalRequestedQuantity += reqQty;
		totalDispatchedQuantity += dispQty;
		totalReceivedQuantity += recQty;

		totalDispatchedCostKopecks += Math.round(dispQty * item.unitCostKopecks);
		totalReceivedCostKopecks += Math.round(recQty * item.unitCostKopecks);

		const diff = dispQty - recQty;
		const isDiscrepant =
			(item.discrepancyType && item.discrepancyType !== "none") ||
			diff !== 0;

		if (isDiscrepant) {
			hasDiscrepancy = true;
			const discQty = Math.abs(diff);
			totalDiscrepancyDamageKopecks += Math.round(discQty * item.unitCostKopecks);
		}
	}

	return {
		totalRequestedQuantity,
		totalDispatchedQuantity,
		totalReceivedQuantity,
		totalDispatchedCostKopecks,
		totalReceivedCostKopecks,
		totalDispatchedCostRubles: kopecksToRubles(totalDispatchedCostKopecks),
		totalReceivedCostRubles: kopecksToRubles(totalReceivedCostKopecks),
		totalDiscrepancyDamageKopecks,
		totalDiscrepancyDamageRubles: kopecksToRubles(totalDiscrepancyDamageKopecks),
		hasDiscrepancy,
	};
}
