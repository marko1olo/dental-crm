import {
	getChemicalIndicatorDefinition,
	getKraftMaterialDefinition,
	getKraftSizeDefinition,
} from "./kraftPackagePresets.js";
import type { KraftPackageRecord } from "./kraftPackageTypes.js";

export function exportKraftBatchToCsv(records: readonly KraftPackageRecord[]): string {
	const headers = [
		"ID записи", "Номер партии", "Серийный номер", "Штрихкод 1D", "2D DataMatrix Payload",
		"Наименование набора", "Тип материала упаковки", "Размер упаковки", "Дата стерилизации",
		"Срок годности (до)", "Нормативный срок (суток)", "Осталось дней", "Статус стерильности",
		"Автоклав", "Номер цикла", "Оператор ЦСО", "Химический индикатор", "Целостность не нарушена", "Примечания",
	];

	const escapeCsv = (val: unknown): string => {
		if (val === null || val === undefined) return '""';
		return `"${String(val).replace(/"/g, '""')}"`;
	};

	const rows = records.map((r) => [
		escapeCsv(r.id),
		escapeCsv(r.batchId),
		escapeCsv(r.serialNumber),
		escapeCsv(r.barcode128),
		escapeCsv(r.barcodeDataMatrixPayload),
		escapeCsv(r.toolSetNameRu),
		escapeCsv(getKraftMaterialDefinition(r.packageType).nameRu),
		escapeCsv(getKraftSizeDefinition(r.packageSize).dimensionsMmRu),
		escapeCsv(r.packDate),
		escapeCsv(r.expDate),
		escapeCsv(r.daysLifespan),
		escapeCsv(r.daysRemaining),
		escapeCsv(
			r.status === "sterile_valid"
				? "Стерильно (годен)"
				: r.status === "expiring_soon_7d"
					? "Истекает (<= 7 дней)"
					: r.status === "expired"
						? "Просрочено"
						: "Отозвано",
		),
		escapeCsv(r.autoclaveId),
		escapeCsv(r.cycleNumber),
		escapeCsv(r.operatorName),
		escapeCsv(getChemicalIndicatorDefinition(r.indicatorId).brandNameRu),
		escapeCsv(r.isBreached ? "НЕТ (НАРУШЕНА)" : "ДА (СОБЛЮДЕНА)"),
		escapeCsv(r.notes),
	]);

	const csvBody = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvBody}`;
}
