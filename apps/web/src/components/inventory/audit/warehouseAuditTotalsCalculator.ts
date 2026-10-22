import { kopecksToRubles } from "@dental/shared";
import type {
	InventoryAuditTotals,
	WarehouseAuditItemLine,
} from "./warehouseAuditTypes.js";
import {
	computeAuditLineItem,
	filterAuditLinesByCabinetOrChair,
} from "./warehouseAuditLineItem.js";

export { computeAuditLineItem, filterAuditLinesByCabinetOrChair };

export function calculateInventoryAuditTotals(items: readonly WarehouseAuditItemLine[]): InventoryAuditTotals {
	let matchedItemsCount = 0, surplusItemsCount = 0, shortageItemsCount = 0;
	let expiredItemsCount = 0, warningItemsCount = 0, overdraftItemsCount = 0, totalOverdraftQuantity = 0;
	let totalBookQuantity = 0, totalActualQuantity = 0, totalSurplusQuantity = 0, totalShortageQuantity = 0;
	let totalBookCostKopecks = 0, totalActualCostKopecks = 0, totalSurplusCostKopecks = 0, totalShortageCostKopecks = 0, totalExpiredCostKopecks = 0;

	for (const item of items) {
		totalBookQuantity += item.bookQuantity;
		totalActualQuantity += item.actualQuantity;
		totalBookCostKopecks += item.bookTotalKopecks;
		totalActualCostKopecks += item.actualTotalKopecks;

		if (item.bookQuantity < 0) {
			overdraftItemsCount += 1;
			totalOverdraftQuantity += Math.abs(item.bookQuantity);
		}
		if (item.fefoStatus === "expired") {
			expiredItemsCount += 1;
			totalExpiredCostKopecks += item.actualTotalKopecks;
		} else if (item.fefoStatus === "warning_30" || item.fefoStatus === "warning_60") {
			warningItemsCount += 1;
		}

		if (item.discrepancyType === "match") matchedItemsCount += 1;
		else if (item.discrepancyType === "surplus") {
			surplusItemsCount += 1;
			totalSurplusQuantity += item.discrepancyQuantity;
			totalSurplusCostKopecks += item.discrepancyCostKopecks;
		} else if (item.discrepancyType === "shortage") {
			shortageItemsCount += 1;
			totalShortageQuantity += Math.abs(item.discrepancyQuantity);
			totalShortageCostKopecks += Math.abs(item.discrepancyCostKopecks);
		}
	}

	const netDiscrepancyCostKopecks = totalActualCostKopecks - totalBookCostKopecks;
	return {
		totalItemsCount: items.length, matchedItemsCount, surplusItemsCount, shortageItemsCount,
		expiredItemsCount, warningItemsCount, overdraftItemsCount, totalOverdraftQuantity,
		totalBookQuantity, totalActualQuantity, totalSurplusQuantity, totalShortageQuantity,
		totalBookCostKopecks, totalActualCostKopecks, totalSurplusCostKopecks, totalShortageCostKopecks,
		netDiscrepancyCostKopecks, totalExpiredCostKopecks,
		totalBookCostRubles: kopecksToRubles(totalBookCostKopecks),
		totalActualCostRubles: kopecksToRubles(totalActualCostKopecks),
		totalSurplusCostRubles: kopecksToRubles(totalSurplusCostKopecks),
		totalShortageCostRubles: kopecksToRubles(totalShortageCostKopecks),
		netDiscrepancyCostRubles: kopecksToRubles(netDiscrepancyCostKopecks),
		totalExpiredCostRubles: kopecksToRubles(totalExpiredCostKopecks),
	};
}
