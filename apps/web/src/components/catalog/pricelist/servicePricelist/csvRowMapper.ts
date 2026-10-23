/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * CSV Row Mapper to ServicePricelistItem
 */

import {
	STATUTORY_VAT_EXEMPTION_NOTE,
	type PriceTierKind,
	type ServicePricelistItem,
} from "../servicePricelistPresets";
import { rublesToKopecks } from "./currencyMath";
import { detectCategoryFromServiceCode } from "./serviceCodesAndSynonyms";
import { parseCategoryFromLabel, parseSpecialtyFromLabel } from "./csvLabelParsers";
import { CATEGORY_CODE_FALLBACK, type CsvColumnIndices } from "./csvColumnIndices";
import type { CsvRowError } from "./types";

export * from "./csvColumnIndices";

export function mapCsvRow(
	row: string[],
	cols: CsvColumnIndices,
	rowIndex: number,
): { item?: ServicePricelistItem; error?: CsvRowError } {
	const rawCode = (cols.colCode >= 0 ? row[cols.colCode] : "")?.trim() || "";
	const commercialTitle = (cols.colCommTitle >= 0 ? row[cols.colCommTitle] : "")?.trim() || "";
	const statutoryTitle804n = (cols.colStatTitle >= 0 ? row[cols.colStatTitle] : "")?.trim() || commercialTitle;

	if (!commercialTitle) {
		return {
			error: { rowIndex, statutoryCode: rawCode, code804n: rawCode, error: "Отсутствует наименование услуги" },
		};
	}

	const rawPriceStr = (cols.colPrice >= 0 ? row[cols.colPrice] : "0")?.replace(/\s+/g, "").replace(",", ".") ?? "0";
	const basePriceRub = parseFloat(rawPriceStr);

	if (Number.isNaN(basePriceRub) || basePriceRub < 0) {
		return {
			error: { rowIndex, statutoryCode: rawCode, code804n: rawCode, error: `Некорректная цена: "${rawPriceStr}"`, title: commercialTitle },
		};
	}

	const catVal = cols.colCat >= 0 ? row[cols.colCat] : undefined;
	const category = catVal ? parseCategoryFromLabel(catVal) : detectCategoryFromServiceCode(rawCode);
	const specVal = cols.colSpec >= 0 ? row[cols.colSpec] : undefined;
	const specialty = specVal ? parseSpecialtyFromLabel(specVal) : "general";

	let code804n = rawCode;
	if (!code804n || !/^[ABАВ]\d{2}\.\d{2}\.\d{3}/i.test(code804n)) {
		code804n = CATEGORY_CODE_FALLBACK[category] || "A16.07.002";
	} else {
		code804n = code804n.toUpperCase().replace(/^А/, "A").replace(/^В/, "B");
	}

	const parsePrice = (idx: number) =>
		idx >= 0 ? parseFloat(row[idx]?.replace(/\s+/g, "").replace(",", ".") || "NaN") : NaN;

	const tierPrices: Partial<Record<PriceTierKind, number>> = {};
	const rawVip = parsePrice(cols.colVip);
	const rawDms = parsePrice(cols.colDms);
	const rawPromo = parsePrice(cols.colPromo);
	const rawNight = parsePrice(cols.colNight);
	if (!Number.isNaN(rawVip)) tierPrices.vip = Math.round(rawVip * 100) / 100;
	if (!Number.isNaN(rawDms)) tierPrices.dms = Math.round(rawDms * 100) / 100;
	if (!Number.isNaN(rawPromo)) tierPrices.promo = Math.round(rawPromo * 100) / 100;
	if (!Number.isNaN(rawNight)) tierPrices.night_weekend = Math.round(rawNight * 100) / 100;

	const rawMat = cols.colMatCost >= 0 ? parseFloat(row[cols.colMatCost]?.replace(/\s+/g, "").replace(",", ".") || "0") : 0;
	const rawLab = cols.colLabCost >= 0 ? parseFloat(row[cols.colLabCost]?.replace(/\s+/g, "").replace(",", ".") || "0") : 0;
	const rawDur = cols.colDur >= 0 ? parseInt(row[cols.colDur]?.replace(/\D/g, "") || "30", 10) : 30;
	const icdRaw = cols.colIcd >= 0 && row[cols.colIcd] ? row[cols.colIcd]?.split(/[,;]+/).map((s) => s.trim()).filter(Boolean) : [];

	const exactBasePriceRub = Math.round(basePriceRub * 100) / 100;
	const exactMatCostRub = !Number.isNaN(rawMat) && rawMat >= 0 ? Math.round(rawMat * 100) / 100 : 0;
	const exactLabCostRub = !Number.isNaN(rawLab) && rawLab >= 0 ? Math.round(rawLab * 100) / 100 : 0;

	return {
		item: {
			id: `import-${Date.now()}-${rowIndex}`,
			statutoryCode: code804n,
			code804n,
			commercialTitle,
			statutoryTitle: statutoryTitle804n,
			statutoryTitle804n,
			category,
			specialty,
			basePriceRub: exactBasePriceRub,
			basePriceKopecks: rublesToKopecks(exactBasePriceRub),
			materialCostRub: exactMatCostRub,
			labCostRub: exactLabCostRub,
			tierPrices,
			vatRate: 0,
			vatExemptionArticle: STATUTORY_VAT_EXEMPTION_NOTE,
			icd10Indications: icdRaw,
			estimatedDurationMin: !Number.isNaN(rawDur) && rawDur > 0 ? rawDur : 30,
			isActive: true,
			isArchived: false,
			tags: [commercialTitle.toLowerCase(), code804n.toLowerCase()],
		},
	};
}
