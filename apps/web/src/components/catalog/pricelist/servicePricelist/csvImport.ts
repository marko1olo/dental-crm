/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * CSV Pricelist Importer
 */

import type { ServicePricelistItem } from "../servicePricelistPresets";
import { parseRawCsvText } from "./csvRawParser";
import { mapCsvRow, type CsvColumnIndices } from "./csvRowMapper";
import type { CsvImportResult, CsvRowError } from "./types";

export * from "./csvRawParser";
export * from "./csvLabelParsers";
export * from "./csvRowMapper";

export function importPricelistFromCsv(csvText: string): CsvImportResult {
	const rawRows = parseRawCsvText(csvText);
	if (rawRows.length === 0) {
		return {
			validItems: [],
			invalidRows: [{ rowIndex: 0, error: "Файл пуст" }],
			totalRows: 0,
		};
	}

	const headers = (rawRows[0] ?? []).map((h) => h.toLowerCase().trim());
	const findCol = (keys: string[]) =>
		headers.findIndex((h) => keys.some((k) => h.includes(k)));

	const cols: CsvColumnIndices = {
		colCode: findCol(["код 804", "804н", "номенклатур", "артикул", "кодноменклатуры", "код услуги", "код", "code", "id", "арт"]),
		colCommTitle: findCol(["коммерческое", "наименование", "услуга", "номенклатура", "название", "процедура", "title"]),
		colStatTitle: findCol(["официальное", "номенклатур"]),
		colCat: findCol(["категория", "раздел", "группаноменклатуры", "группа", "папка", "направление", "отделение", "category"]),
		colSpec: findCol(["специальность", "специализация", "врач", "specialty"]),
		colPrice: findCol(["цена стандарт", "базовая цена", "стоимость", "тариф", "прайс", "цена", "price", "руб"]),
		colVip: findCol(["vip", "вип"]),
		colDms: findCol(["дмс", "dms", "страхов"]),
		colPromo: findCol(["промо", "акци", "promo"]),
		colNight: findCol(["ночной", "выходной", "night"]),
		colMatCost: findCol(["себестоимость", "материал", "расход"]),
		colLabCost: findCol(["лаборатор", "зуботехническ", "техник"]),
		colIcd: findCol(["мкб", "icd"]),
		colDur: findCol(["длительность", "минут", "время", "хронометраж"]),
	};

	const validItems: ServicePricelistItem[] = [];
	const invalidRows: CsvRowError[] = [];

	for (let rowIndex = 1; rowIndex < rawRows.length; rowIndex++) {
		const row = rawRows[rowIndex];
		if (!row || row.length === 0 || row.every((c) => c === "")) continue;

		const result = mapCsvRow(row, cols, rowIndex);
		if (result.error) {
			invalidRows.push(result.error);
		} else if (result.item) {
			validItems.push(result.item);
		}
	}

	return {
		validItems,
		invalidRows,
		totalRows: rawRows.length - 1,
	};
}
