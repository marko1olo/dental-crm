import type { WarehouseInventoryAuditDocument } from "./warehouseAuditTypes.js";
import { kopecksToRubles } from "@dental/shared";

export function exportInventoryToCsv(doc: WarehouseInventoryAuditDocument): string {
	const header = [
		"№ п/п", "Артикул", "Наименование ТМЦ", "Категория", "Ед.изм", "Код ОКЕИ",
		"Партия (LOT)", "Срок годности", "FEFO Статус", "Учетное кол-во", "Фактическое кол-во",
		"Разница (кол-во)", "Тип расхождения", "Учетная цена (руб)", "Учетная сумма (руб)",
		"Фактическая сумма (руб)", "Излишек (руб)", "Недостача (руб)", "Место хранения",
	].join(";");

	const rows = doc.items.map((it, idx) => {
		const surplusRub = it.discrepancyType === "surplus" ? kopecksToRubles(it.discrepancyCostKopecks).toFixed(2) : "0.00";
		const shortageRub = it.discrepancyType === "shortage" ? kopecksToRubles(Math.abs(it.discrepancyCostKopecks)).toFixed(2) : "0.00";
		const fefoRu = it.fefoStatus === "expired" ? "Просрочен" : it.fefoStatus === "warning_30" ? "<30 дней" : it.fefoStatus === "warning_60" ? "<60 дней" : "Свежий";
		const discRu = it.discrepancyType === "surplus" ? "Излишек" : it.discrepancyType === "shortage" ? "Недостача" : "Норма";

		return [
			idx + 1, `"${it.sku.replace(/"/g, '""')}"`, `"${it.nameRu.replace(/"/g, '""')}"`,
			`"${it.category.replace(/"/g, '""')}"`, `"${it.unitRu}"`, `"${it.okeiCode}"`,
			`"${it.batchNumber.replace(/"/g, '""')}"`, it.expiryDate, `"${fefoRu}"`,
			it.bookQuantity, it.actualQuantity, it.discrepancyQuantity, `"${discRu}"`,
			kopecksToRubles(it.unitCostKopecks).toFixed(2), kopecksToRubles(it.bookTotalKopecks).toFixed(2),
			kopecksToRubles(it.actualTotalKopecks).toFixed(2), surplusRub, shortageRub,
			`"${(it.storageLocationRu || "").replace(/"/g, '""')}"`,
		].join(";");
	});

	return `\uFEFF${[header, ...rows].join("\r\n")}`;
}

export function exportInv19DiscrepanciesToCsv(doc: WarehouseInventoryAuditDocument): string {
	const discrepancies = doc.items.filter((it) => it.discrepancyType !== "match");
	const header = [
		"№", "Артикул", "Наименование ТМЦ", "Партия (LOT)", "Срок годности",
		"Учетное кол-во", "Фактическое кол-во", "Излишек (кол-во)", "Излишек (руб)",
		"Недостача (кол-во)", "Недостача (руб)", "Учетная цена (руб)",
	].join(";");

	const rows = discrepancies.map((it, idx) => {
		const surplusQty = it.discrepancyType === "surplus" ? it.discrepancyQuantity : 0;
		const surplusSum = it.discrepancyType === "surplus" ? kopecksToRubles(it.discrepancyCostKopecks).toFixed(2) : "0.00";
		const shortageQty = it.discrepancyType === "shortage" ? Math.abs(it.discrepancyQuantity) : 0;
		const shortageSum = it.discrepancyType === "shortage" ? kopecksToRubles(Math.abs(it.discrepancyCostKopecks)).toFixed(2) : "0.00";

		return [
			idx + 1, `"${it.sku.replace(/"/g, '""')}"`, `"${it.nameRu.replace(/"/g, '""')}"`,
			`"${it.batchNumber.replace(/"/g, '""')}"`, it.expiryDate, it.bookQuantity,
			it.actualQuantity, surplusQty, surplusSum, shortageQty, shortageSum,
			kopecksToRubles(it.unitCostKopecks).toFixed(2),
		].join(";");
	});

	return `\uFEFF${[header, ...rows].join("\r\n")}`;
}
