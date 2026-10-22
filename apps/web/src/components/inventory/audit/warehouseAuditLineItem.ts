import type {
	InventoryDiscrepancyType,
	WarehouseAuditItemLine,
} from "./warehouseAuditTypes.js";
import { calculateFefoStatus } from "./warehouseAuditFefo.js";

export function computeAuditLineItem(
	raw: {
		readonly itemId: string;
		readonly sku: string;
		readonly nameRu: string;
		readonly category?: string | undefined;
		readonly unitRu: string;
		readonly okeiCode: string;
		readonly batchNumber: string;
		readonly manufactureDate?: string | undefined;
		readonly expiryDate: string;
		readonly cabinetId?: string | undefined;
		readonly chairId?: string | undefined;
		readonly storageLocationRu?: string | undefined;
		readonly temperatureRegimeRu?: string | undefined;
		readonly bookQuantity: number;
		readonly actualQuantity: number;
		readonly unitCostKopecks: number;
		readonly notes?: string | undefined;
		readonly isWriteoffRequired?: boolean | undefined;
	},
	referenceDateStr?: string,
): WarehouseAuditItemLine {
	const bookQty = Number(raw.bookQuantity) || 0;
	const actQty = Math.max(0, Number(raw.actualQuantity) || 0);
	const unitCost = Math.max(0, Math.round(raw.unitCostKopecks));
	const qtyDiff = actQty - bookQty;

	let discrepancyType: InventoryDiscrepancyType = "match";
	if (qtyDiff > 0) discrepancyType = "surplus";
	else if (qtyDiff < 0) discrepancyType = "shortage";

	const bookTotalKopecks = Math.round(bookQty * unitCost);
	const actualTotalKopecks = Math.round(actQty * unitCost);
	const discrepancyCostKopecks = Math.round(qtyDiff * unitCost);
	const fefoInfo = calculateFefoStatus(raw.expiryDate, referenceDateStr);

	return {
		itemId: raw.itemId, sku: raw.sku, nameRu: raw.nameRu,
		category: raw.category || "Общие стоматологические материалы",
		unitRu: raw.unitRu, okeiCode: raw.okeiCode, batchNumber: raw.batchNumber,
		manufactureDate: raw.manufactureDate, expiryDate: raw.expiryDate,
		cabinetId: raw.cabinetId, chairId: raw.chairId,
		storageLocationRu: raw.storageLocationRu || "Складской бокс A-1",
		temperatureRegimeRu: raw.temperatureRegimeRu || "+15°C..+25°C",
		bookQuantity: bookQty, actualQuantity: actQty, unitCostKopecks: unitCost,
		discrepancyType, discrepancyQuantity: qtyDiff,
		bookTotalKopecks, actualTotalKopecks, discrepancyCostKopecks,
		fefoStatus: fefoInfo.fefoStatus, daysUntilExpiration: fefoInfo.daysUntilExpiration,
		isWriteoffRequired: raw.isWriteoffRequired || fefoInfo.fefoStatus === "expired",
		notes: raw.notes,
	};
}

export function filterAuditLinesByCabinetOrChair(
	items: readonly WarehouseAuditItemLine[],
	filter: { cabinetId?: string | undefined; chairId?: string | undefined },
): WarehouseAuditItemLine[] {
	return items.filter((it) => {
		if (filter.cabinetId && it.cabinetId && it.cabinetId !== filter.cabinetId) return false;
		if (filter.chairId && it.chairId && it.chairId !== filter.chairId) return false;
		return true;
	});
}
