import { escapeCsvField } from "./csvEscapeHelper.js";
import type { PsoTestRecord } from "./types.js";

export function exportPsoToCsv(records: readonly PsoTestRecord[]): string {
	const headers = [
		"Дата",
		"Время",
		"Наименование инструментария",
		"Объем партии (шт)",
		"Проверено образцов (шт)",
		"Норма выборки (шт)",
		"Азопирамовая проба (на кровь)",
		"Фенолфталеиновая проба (на щелочь)",
		"Проба с Суданом III (на масло)",
		"Моющее средство",
		"Заключение",
		"Причина брака",
		"Оператор ЦСО",
		"Электронная подпись",
		"Примечания",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.date),
		escapeCsvField(r.time),
		escapeCsvField(r.instrumentName),
		escapeCsvField(r.batchItemCount),
		escapeCsvField(r.testedSampleCount),
		escapeCsvField(r.minSampleRequired),
		escapeCsvField(r.isAzopyramNegative ? "Отрицательная (норма)" : "ПОЛОЖИТЕЛЬНАЯ (кровь)"),
		escapeCsvField(r.isPhenolphthaleinNegative ? "Отрицательная (норма)" : "ПОЛОЖИТЕЛЬНАЯ (щелочь)"),
		escapeCsvField(r.isSudanNegative ? "Отрицательная (норма)" : "ПОЛОЖИТЕЛЬНАЯ (масло)"),
		escapeCsvField(r.detergentBrand),
		escapeCsvField(r.isBatchApproved ? "ПСО ПРОЙДЕНА (Годно)" : "БРАК (Возврат)"),
		escapeCsvField(r.rejectionReason ?? ""),
		escapeCsvField(r.operatorFullName),
		escapeCsvField(r.electronicSignatureHash),
		escapeCsvField(r.notes ?? ""),
	]);

	const csvContent = [headers.map(escapeCsvField).join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvContent}`;
}
