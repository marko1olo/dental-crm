/**
 * SANPIN 3.3686-21 STERILIZATION & PSO: CSV EXPORT ENGINES
 */

import { escapeCsvField } from "./csvEscapeHelper.js";
import {
	STATUTORY_PACKAGING_TYPES,
	type Form257CycleRecord,
} from "./types.js";

export { escapeCsvField } from "./csvEscapeHelper.js";
export { exportPsoToCsv } from "./psoCsvExporter.js";
export { exportKraftPackagesToCsv } from "./kraftPackagesCsvExporter.js";

export function exportForm257ToCsv(records: readonly Form257CycleRecord[]): string {
	const headers = [
		"Дата",
		"Время",
		"№ цикла",
		"Стерилизатор (Код/Модель)",
		"Режим стерилизации",
		"Наименование изделий",
		"Кол-во упаковок",
		"Тип упаковки",
		"Температура факт (°C)",
		"Давление факт (бар)",
		"Время факт (мин)",
		"Индикатор",
		"Тест КТ 1-5",
		"Результат цикла",
		"Оператор ЦСО",
		"Должность",
		"Электронная подпись",
		"Примечания",
	];

	const rows = records.map((r) => [
		escapeCsvField(r.date),
		escapeCsvField(r.time),
		escapeCsvField(r.cycleNumber),
		escapeCsvField(`${r.sterilizerCode} (${r.sterilizerBrandModel})`),
		escapeCsvField(r.regimeNameRu),
		escapeCsvField(r.itemsDescriptionRu),
		escapeCsvField(r.packsCount),
		escapeCsvField(STATUTORY_PACKAGING_TYPES[r.packagingType]?.nameRu ?? r.packagingType),
		escapeCsvField(r.actualTemperatureCelsius),
		escapeCsvField(r.actualPressureBar),
		escapeCsvField(r.actualExposureMinutes),
		escapeCsvField(r.indicatorTradeNameRu),
		escapeCsvField(r.areAllIndicatorsPassed ? "Все КТ пройдены" : "Отказ КТ"),
		escapeCsvField(r.cycleStatus === "passed" ? "СТЕРИЛЬНО (Допущен)" : "БРАК (Отклонен)"),
		escapeCsvField(r.operatorFullName),
		escapeCsvField(r.operatorPosition),
		escapeCsvField(r.electronicSignatureHash),
		escapeCsvField(r.notes ?? ""),
	]);

	const csvContent = [headers.map(escapeCsvField).join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvContent}`;
}
