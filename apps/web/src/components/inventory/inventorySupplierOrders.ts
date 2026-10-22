import { formatKopecksRu } from "@dental/shared";
import type { DeductionLineItem } from "./inventoryMath.js";
import { calculateLineCostKopecks, evaluateStockStatus } from "./inventoryMath.js";
import type {
	SupplierPurchaseOrderItemView,
	SupplierPurchaseOrderView,
} from "./orders/inventorySupplierOrderTypes.js";

export type {
	SupplierPurchaseOrderItemView,
	SupplierPurchaseOrderView,
} from "./orders/inventorySupplierOrderTypes.js";

export { formatSupplierPurchaseOrderTextRu } from "./orders/inventorySupplierOrderFormatting.js";

/**
 * 1-Кликовое формирование заказа поставщику на основе позиций списания с дефицитом или критическим остатком
 */
export function createSupplierPurchaseOrderFromLines(
	lines: readonly DeductionLineItem[],
	clinicNameRu: string = "Стоматологическая клиника DENTE",
	reorderMultiplier: number = 2,
): SupplierPurchaseOrderView | null {
	const items: SupplierPurchaseOrderItemView[] = [];

	for (const line of lines) {
		const qty = Number.isFinite(line.quantity) ? line.quantity : 0;
		const status = evaluateStockStatus(line.stockQuantity, qty, line.criticalThreshold, line.unit);

		if (status.severity === "critical" || status.severity === "warning") {
			const threshold = line.criticalThreshold > 0 ? line.criticalThreshold : 2;
			const shortfall = status.deficit;
			let suggested = 0;

			if (["шт.", "карп.", "упак.", "доза", "компл.", "пары"].includes(line.unit)) {
				suggested = Math.max(Math.ceil(threshold * reorderMultiplier), Math.ceil(shortfall + threshold), 1);
			} else {
				suggested = Number(Math.max(threshold * reorderMultiplier, shortfall + threshold, 1).toFixed(2));
			}

			const lineCostKopecks = calculateLineCostKopecks(line.unitCostKopecks, suggested);

			items.push({
				sku: line.inventoryItemId || `SKU-${line.id.slice(-6).toUpperCase()}`,
				materialName: line.materialName,
				category: line.category,
				unit: line.unit,
				currentStock: line.stockQuantity,
				criticalThreshold: threshold,
				shortfall,
				suggestedOrderQuantity: suggested,
				unitCostKopecks: line.unitCostKopecks,
				unitCostFormatted: formatKopecksRu(line.unitCostKopecks),
				totalCostKopecks: lineCostKopecks,
				totalCostFormatted: formatKopecksRu(lineCostKopecks),
			});
		}
	}

	if (items.length === 0) return null;

	const totalCost = items.reduce((acc, i) => acc + i.totalCostKopecks, 0);
	const hasDeficit = items.some((i) => i.shortfall > 0);
	const dateStr = new Date().toISOString().slice(0, 10);
	const orderNumber = `ПО-${dateStr.replace(/-/g, "")}-001`;

	return {
		id: `po-view-${Date.now()}`,
		orderNumber,
		orderDate: dateStr,
		clinicNameRu,
		reason: hasDeficit ? "stock_deficit" : "critical_threshold_breach",
		items,
		totalItemsCount: items.length,
		totalCostKopecks: totalCost,
		totalCostFormatted: formatKopecksRu(totalCost),
	};
}

/**
 * Проверка возможности безопасного списания без дефицита (предотвращение отрицательных остатков)
 */
export function canSafelyDeductLinesWithoutDeficit(lines: readonly DeductionLineItem[]): boolean {
	for (const line of lines) {
		const qty = Number.isFinite(line.quantity) ? line.quantity : 0;
		const status = evaluateStockStatus(line.stockQuantity, qty, line.criticalThreshold, line.unit);
		if (status.severity === "critical") {
			return false;
		}
	}
	return true;
}
