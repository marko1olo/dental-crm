import { formatKopecksRu } from "@dental/shared";
import type { SupplierPurchaseOrderView } from "./inventorySupplierOrderTypes.js";

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
