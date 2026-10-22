import type { AcceptanceWaybillItem, VatRate } from "../acceptanceWaybillsTypes.js";
import { calculateItemTotals, generateDeterministicWaybillItemId } from "./acceptanceWaybillMath.js";
import { calculateFefoStatus } from "./acceptanceWaybillFefo.js";

/**
 * Создание готовой строки накладной из параметров.
 */
export function createWaybillItem(params: {
	readonly id?: string | undefined;
	readonly inventoryItemId?: string | undefined;
	readonly name: string;
	readonly category?: string | undefined;
	readonly unit?: string | undefined;
	readonly batchNumber: string;
	readonly expirationDate: string;
	readonly manufactureDate?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly vatRate?: VatRate | undefined;
	readonly barcode?: string | undefined;
	readonly sku?: string | undefined;
	readonly notes?: string | undefined;
	readonly referenceDateIso?: string | undefined;
}): AcceptanceWaybillItem {
	const vatRate = params.vatRate ?? 0;
	const totals = calculateItemTotals({
		quantity: params.quantity,
		unitPriceKopecks: params.unitPriceKopecks,
		vatRate,
	});
	const fefo = calculateFefoStatus(params.expirationDate, params.referenceDateIso);

	return {
		id: params.id || generateDeterministicWaybillItemId(),
		inventoryItemId: params.inventoryItemId,
		name: params.name.trim(),
		category: params.category || "Материалы",
		unit: params.unit || "шт",
		batchNumber: params.batchNumber.trim(),
		expirationDate: params.expirationDate.trim(),
		manufactureDate: params.manufactureDate?.trim() || undefined,
		quantity: Math.max(0, params.quantity),
		unitPriceKopecks: Math.max(0, Math.round(params.unitPriceKopecks)),
		vatRate,
		lineSubtotalKopecks: totals.lineSubtotalKopecks,
		vatKopecks: totals.vatKopecks,
		lineTotalKopecks: totals.lineTotalKopecks,
		fefoStatus: fefo.fefoStatus,
		daysUntilExpiration: fefo.daysRemaining,
		barcode: params.barcode?.trim() || undefined,
		sku: params.sku?.trim() || undefined,
		notes: params.notes?.trim() || undefined,
	};
}
