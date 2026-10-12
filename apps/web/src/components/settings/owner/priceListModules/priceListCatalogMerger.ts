/**
 * priceListCatalogMerger.ts
 *
 * Функция слияния номенклатуры 804н и живого каталога БД (service_catalog_items).
 * Вычисляет эффективную розничную цену, прямые расходы (материалы + ЗТЛ) и чистую маржу.
 * Все финансовые расчеты ведутся строго в целочисленных копейках (integer kopecks).
 */

import {
	CATEGORY_LABELS,
	STATUTORY_ORDER_804N_PRESETS,
	type Order804nCategory,
	type ServicePricelistItem,
} from "../../../catalog/pricelist/servicePricelistPresets";
import type { ServiceWithMargin } from "./priceListTypes";

export function mergeAndCalculatePriceList(
	// biome-ignore lint/suspicious/noExplicitAny: dynamic catalog row
	liveCatalog: readonly any[],
	priceOverrides: Record<string, number>,
): ServiceWithMargin[] {
	// biome-ignore lint/suspicious/noExplicitAny: dynamic catalog row
	const liveByCode = new Map<string, any>();
	for (const row of liveCatalog) {
		if (row?.active === false) continue;
		const codeKey = String(row?.code || "").trim().toUpperCase();
		if (codeKey) {
			liveByCode.set(codeKey, row);
		}
	}

	const matchedCodes = new Set<string>();
	const mergedBase: ServicePricelistItem[] = STATUTORY_ORDER_804N_PRESETS.map((preset) => {
		const codeKey = preset.code804n.trim().toUpperCase();
		const liveRow = liveByCode.get(codeKey);
		if (liveRow) {
			matchedCodes.add(codeKey);
			const liveRub = Number(liveRow.basePriceRub);
			if (Number.isFinite(liveRub) && liveRub > 0) {
				return {
					...preset,
					commercialTitle: liveRow.title || preset.commercialTitle,
					basePriceRub: liveRub,
					basePriceKopecks: Math.round(liveRub * 100),
				};
			}
		}
		return preset;
	});

	for (const row of liveCatalog) {
		if (row?.active === false) continue;
		const codeKey = String(row?.code || "").trim().toUpperCase();
		if (!codeKey || matchedCodes.has(codeKey)) continue;
		matchedCodes.add(codeKey);
		const liveRub = Number(row.basePriceRub);
		if (!Number.isFinite(liveRub) || liveRub <= 0) continue;
		const catKey = (row.category in CATEGORY_LABELS ? row.category : "therapy") as Order804nCategory;
		mergedBase.push({
			id: String(row.id || `db-${codeKey}`),
			code804n: String(row.code),
			statutoryTitle804n: String(row.title || "Медицинская услуга"),
			commercialTitle: String(row.title || "Медицинская услуга"),
			category: catKey,
			specialty: row.specialty || "therapist",
			basePriceRub: liveRub,
			basePriceKopecks: Math.round(liveRub * 100),
			estimatedDurationMin: Number(row.durationMinutes) || 30,
			vatRate: 0,
			vatExemptionArticle: "пп. 2 п. 2 ст. 149 НК РФ",
			icd10Indications: [],
			isActive: true,
			isArchived: false,
			tags: [],
		});
	}

	return mergedBase.map((item) => {
		const effectivePriceKopecks =
			priceOverrides[item.id] !== undefined
				? priceOverrides[item.id]!
				: item.basePriceKopecks || (item.basePriceRub ? item.basePriceRub * 100 : 0);

		const materialCostKopecks = item.materialCostRub ? item.materialCostRub * 100 : 0;
		const labCostKopecks = item.labCostRub ? item.labCostRub * 100 : 0;
		const totalDirectCostsKopecks = materialCostKopecks + labCostKopecks;

		const netMarginKopecks = Math.max(0, effectivePriceKopecks - totalDirectCostsKopecks);
		const marginPct =
			effectivePriceKopecks > 0
				? Math.round((netMarginKopecks / effectivePriceKopecks) * 10000) / 100
				: 0;

		return {
			...item,
			effectivePriceKopecks,
			materialCostKopecks,
			labCostKopecks,
			totalDirectCostsKopecks,
			netMarginKopecks,
			marginPct,
		};
	});
}
