import { getWarehouseBranch } from "./warehouseTransferPresets.js";
import type { WarehouseTransferDocument } from "./warehouseTransferTypes.js";
import { calculateTransferTotals } from "./warehouseTransferTotalsCalculator.js";

export function exportTransferJournalToCsv(docs: readonly WarehouseTransferDocument[]): string {
	const headers = [
		"№ документа",
		"Дата",
		"Склад-отправитель",
		"Склад-получатель",
		"Статус",
		"Кол-во наименований",
		"Отпущено (кол-во)",
		"Принято (кол-во)",
		"Сумма отпущенная, руб.",
		"Сумма принятая, руб.",
		"Сумма расхождений, руб.",
		"Отпустил",
		"Принял",
	];

	const rows = docs.map((doc) => {
		const totals = calculateTransferTotals(doc.items);
		const source = getWarehouseBranch(doc.sourceBranchId);
		const target = getWarehouseBranch(doc.targetBranchId);

		return [
			`"${doc.documentNumber}"`,
			doc.documentDate,
			`"${source.nameRu}"`,
			`"${target.nameRu}"`,
			`"${doc.status}"`,
			doc.items.length.toString(),
			totals.totalDispatchedQuantity.toString(),
			totals.totalReceivedQuantity.toString(),
			totals.totalDispatchedCostRubles.toFixed(2),
			totals.totalReceivedCostRubles.toFixed(2),
			totals.totalDiscrepancyDamageRubles.toFixed(2),
			`"${doc.dispatchedByFullName}"`,
			`"${doc.receivedByFullName}"`,
		];
	});

	const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
	return `\uFEFF${csvContent}`;
}
