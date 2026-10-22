import type { AcceptanceWaybillDocument } from "../acceptanceWaybillsTypes.js";

/**
 * Экспорт накладной в CSV с разделителем точка с запятой и кодировкой UTF-8.
 */
export function exportWaybillToCsv(waybill: AcceptanceWaybillDocument): string {
	const headers = [
		"№",
		"Наименование",
		"Категория",
		"Ед.изм.",
		"Серия_Партия",
		"Срок_годности",
		"Количество",
		"Цена_руб",
		"Сумма_без_НДС_руб",
		"Ставка_НДС",
		"Сумма_НДС_руб",
		"Всего_с_НДС_руб",
		"FEFO_Статус",
		"Дней_до_срока",
		"Штрихкод",
	];

	const rows = waybill.items.map((item, idx) => [
		idx + 1,
		`"${item.name.replace(/"/g, '""')}"`,
		`"${item.category.replace(/"/g, '""')}"`,
		item.unit,
		`"${item.batchNumber.replace(/"/g, '""')}"`,
		item.expirationDate,
		item.quantity,
		(item.unitPriceKopecks / 100).toFixed(2),
		(item.lineSubtotalKopecks / 100).toFixed(2),
		`${item.vatRate}%`,
		(item.vatKopecks / 100).toFixed(2),
		(item.lineTotalKopecks / 100).toFixed(2),
		item.fefoStatus,
		item.daysUntilExpiration,
		item.barcode || "",
	]);

	const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
	return `\uFEFF${csvContent}`;
}
