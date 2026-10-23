/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * RFC 4180 CSV Export with UTF-8 BOM for Microsoft Excel
 */

import {
	CATEGORY_LABELS,
	SPECIALTY_LABELS,
	STATUTORY_VAT_EXEMPTION_NOTE,
	type ServicePricelistItem,
} from "../servicePricelistPresets";
import { calculateTierPrice } from "./currencyMath";
import type { CsvExportOptions } from "./types";

export const UTF8_BOM = "\uFEFF";

export function escapeCsvCell(
	value: string | number | undefined | null,
	delimiter: string,
): string {
	if (value === null || value === undefined) return "";
	const str = String(value);
	if (
		str.includes(delimiter) ||
		str.includes('"') ||
		str.includes("\n") ||
		str.includes("\r")
	) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Exports catalog items into standard RFC 4180 CSV with UTF-8 BOM for Microsoft Excel.
 */
export function exportPricelistToCsv(
	items: readonly ServicePricelistItem[],
	options?: CsvExportOptions | undefined,
): string {
	const delimiter = options?.delimiter ?? ";";
	const headers = [
		"Код услуги",
		"Коммерческое наименование",
		"Официальное наименование",
		"Категория",
		"Специальность",
		"Цена стандарт (руб)",
		"Цена VIP (руб)",
		"Цена ДМС (руб)",
		"Цена Промо (руб)",
		"Цена Ночной/Выходной (руб)",
		"Себестоимость материалов (руб)",
		"Зуботехническая лаборатория (руб)",
		"НДС",
		"МКБ-10",
		"Длительность (мин)",
		"Статус",
	];

	const rows: string[] = [
		headers.map((h) => escapeCsvCell(h, delimiter)).join(delimiter),
	];

	for (const item of items) {
		const row = [
			item.code804n,
			item.commercialTitle,
			item.statutoryTitle804n,
			CATEGORY_LABELS[item.category] ?? item.category,
			SPECIALTY_LABELS[item.specialty] ?? item.specialty,
			item.basePriceRub,
			item.tierPrices?.vip ?? calculateTierPrice(item.basePriceRub, "vip"),
			item.tierPrices?.dms ?? calculateTierPrice(item.basePriceRub, "dms"),
			item.tierPrices?.promo ?? calculateTierPrice(item.basePriceRub, "promo"),
			item.tierPrices?.night_weekend ??
				calculateTierPrice(item.basePriceRub, "night_weekend"),
			item.materialCostRub ?? 0,
			item.labCostRub ?? 0,
			STATUTORY_VAT_EXEMPTION_NOTE,
			item.icd10Indications.join(", "),
			item.estimatedDurationMin,
			item.isArchived ? "В архиве" : item.isActive ? "Активна" : "Отключена",
		];
		rows.push(row.map((val) => escapeCsvCell(val, delimiter)).join(delimiter));
	}

	return UTF8_BOM + rows.join("\r\n");
}
