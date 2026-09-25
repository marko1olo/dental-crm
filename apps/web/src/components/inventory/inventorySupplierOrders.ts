import { type Kopecks, formatKopecksRu } from "@dental/shared";
import type { DeductionLineItem, TechMapCategory } from "./inventoryMath.js";
import { calculateLineCostKopecks, evaluateStockStatus } from "./inventoryMath.js";

/**
 * Элемент заказа поставщику в интерфейсе
 */
export interface SupplierPurchaseOrderItemView {
	readonly sku: string;
	readonly materialName: string;
	readonly category: TechMapCategory;
	readonly unit: string;
	readonly currentStock: number;
	readonly criticalThreshold: number;
	readonly shortfall: number;
	readonly suggestedOrderQuantity: number;
	readonly unitCostKopecks: Kopecks;
	readonly unitCostFormatted: string;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostFormatted: string;
}

/**
 * Документ заказа поставщику в интерфейсе
 */
export interface SupplierPurchaseOrderView {
	readonly id: string;
	readonly orderNumber: string;
	readonly orderDate: string;
	readonly clinicNameRu: string;
	readonly reason: "stock_deficit" | "critical_threshold_breach";
	readonly items: readonly SupplierPurchaseOrderItemView[];
	readonly totalItemsCount: number;
	readonly totalCostKopecks: Kopecks;
	readonly totalCostFormatted: string;
}

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

/**
 * Форматирует заказ поставщику в текстовый вид для буфера обмена
 */
export function formatSupplierPurchaseOrderTextRu(order: SupplierPurchaseOrderView): string {
	const lines = [
		`================================================================================`,
		`ЗАКАЗ ПОСТАВЩИКУ РАСХОДНЫХ МАТЕРИАЛОВ № ${order.orderNumber}`,
		`Дата: ${order.orderDate} | Клиника: ${order.clinicNameRu}`,
		`Основание: ${order.reason === "stock_deficit" ? "Ликвидация дефицита материалов" : "Пополнение неснижаемого запаса"}`,
		`================================================================================`,
		`СПЕЦИФИКАЦИЯ МАТЕРИАЛОВ:`,
		`--------------------------------------------------------------------------------`,
	];

	order.items.forEach((item, idx) => {
		lines.push(
			`${idx + 1}. [${item.sku}] ${item.materialName}`,
			`   Остаток: ${item.currentStock} ${item.unit} | Норма: ${item.criticalThreshold} ${item.unit} | Дефицит: ${item.shortfall}`,
			`   Рекомендуемый заказ: ${item.suggestedOrderQuantity} ${item.unit} × ${formatKopecksRu(item.unitCostKopecks)} = ${item.totalCostFormatted}`,
			`--------------------------------------------------------------------------------`,
		);
	});

	lines.push(
		`ВСЕГО ПОЗИЦИЙ: ${order.totalItemsCount}`,
		`ИТОГО ОРИЕНТИРОВОЧНО: ${order.totalCostFormatted} (${order.totalCostKopecks} коп.)`,
		`================================================================================`,
		`Сформировано системой DENTE CRM (Модуль Auto-BOM Inventory).`,
	);

	return lines.join("\n");
}

