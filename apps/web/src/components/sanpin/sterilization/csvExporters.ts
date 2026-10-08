/**
 * ============================================================================
 * SANPIN 3.3686-21 STERILIZATION & PSO: CSV EXPORT ENGINES
 * (Layer 2: RFC 4180 / UTF-8 with BOM CSV Exporters)
 * ============================================================================
 */

import {
	STATUTORY_PACKAGING_TYPES,
	type Form257CycleRecord,
	type KraftPackageItem,
	type PsoTestRecord,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// 6. EXPORT TO CSV (RFC 4180 / UTF-8 WITH BOM)
// ─────────────────────────────────────────────────────────────────────────────

function escapeCsvField(val: string | number | boolean | null | undefined): string {
	if (val === null || val === undefined) return '""';
	const str = String(val);
	return `"${str.replace(/"/g, '""')}"`;
}

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

export function exportKraftPackagesToCsv(packages: readonly KraftPackageItem[]): string {
	const headers = [
		"Штрихкод",
		"№ партии",
		"№ пакета",
		"Набор инструментов",
		"Тип упаковки",
		"Аппарат",
		"№ цикла",
		"Дата стерилизации",
		"Срок годности",
		"Остаток дней",
		"Статус стерильности",
		"Оператор ЦСО",
		"Индикатор проверен",
	];

	const rows = packages.map((p) => [
		escapeCsvField(p.barcode),
		escapeCsvField(p.batchNumber),
		escapeCsvField(p.packageSerialNumber),
		escapeCsvField(p.toolSetNameRu),
		escapeCsvField(p.packagingNameRu),
		escapeCsvField(p.sterilizerCode),
		escapeCsvField(p.cycleNumber),
		escapeCsvField(p.packDate),
		escapeCsvField(p.expDate),
		escapeCsvField(p.daysRemaining),
		escapeCsvField(
			p.status === "sterile_valid"
				? "Стерильно"
				: p.status === "expiring_soon_7d"
					? "Истекает"
					: p.status === "expired"
						? "Просрочено"
						: "Отозвано",
		),
		escapeCsvField(p.operatorFullName),
		escapeCsvField(p.indicatorVerified ? "Да" : "Нет"),
	]);

	const csvContent = [headers.map(escapeCsvField).join(";"), ...rows.map((row) => row.join(";"))].join("\r\n");
	return `\uFEFF${csvContent}`;
}
