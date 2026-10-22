import { escapeCsvField } from "./csvEscapeHelper.js";
import type { KraftPackageItem } from "./types.js";

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
