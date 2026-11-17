import type { ImplantBrandKey } from "../../radiology/implantSafetyEngine";
import type { CatalogServiceLookupItem } from "../treatmentPlanStagesEngine";
import type { TreatmentPlanItem, TreatmentPlanStageKind } from "../types";

export const BRAND_DEFAULTS: Record<ImplantBrandKey, { label: string; economy: number; standard: number; premium: number }> = {
	straumann: { label: "Straumann Roxolid SLActive (Швейцария)", economy: 45000, standard: 52000, premium: 65000 },
	nobel_biocare: { label: "Nobel Biocare Replace (Швеция)", economy: 42000, standard: 49000, premium: 58000 },
	dentium: { label: "Dentium SuperLine SLA (Южная Корея)", economy: 24000, standard: 32000, premium: 38000 },
	osstem: { label: "Osstem TS-III SA (Южная Корея)", economy: 22000, standard: 29000, premium: 35000 },
	mis: { label: "MIS V3 / Seven (Израиль)", economy: 20000, standard: 26000, premium: 32000 },
};

/**
 * Динамическая загрузка цен имплантов из номенклатуры каталога клиники (Мандат 8n / 8z).
 * При наличии реальных позиций в прейскуранте заменяет статические заглушки на фактические цены.
 */
export function resolveImplantBrandTierPrices(
	brandKey: ImplantBrandKey,
	catalog?: readonly CatalogServiceLookupItem[] | undefined,
): { label: string; economy: number; standard: number; premium: number } {
	const fallback = BRAND_DEFAULTS[brandKey] ?? {
		label: "Дентальный имплантат",
		economy: 25000,
		standard: 35000,
		premium: 50000,
	};
	if (!catalog || catalog.length === 0) return fallback;

	const searchToken = brandKey.toLowerCase().replace(/_/g, " ");
	const brandItems = catalog.filter(
		(c) => c.active !== false && (c.title?.toLowerCase().includes(searchToken) || (c.order804nCode && c.order804nCode.includes("A16.07.054"))),
	);

	if (brandItems.length === 0) return fallback;

	const validPrices = brandItems
		.map((b) => b.basePriceRub)
		.filter((p): p is number => typeof p === "number" && p > 0)
		.sort((a, b) => a - b);

	if (validPrices.length === 0) return fallback;

	return {
		label: fallback.label,
		economy: validPrices[0] ?? fallback.economy,
		standard: validPrices[Math.floor(validPrices.length / 2)] ?? fallback.standard,
		premium: validPrices[validPrices.length - 1] ?? fallback.premium,
	};
}

export function resolveCatalogPrice(
	order804nCode: string,
	fallbackPriceRub: number,
	catalog?: readonly CatalogServiceLookupItem[] | undefined,
): number {
	if (!catalog || catalog.length === 0) return fallbackPriceRub;
	const clean = order804nCode.trim();
	const item = catalog.find(
		(s) => s.active !== false && (s.order804nCode === clean || s.code === clean || (s.title && s.title.includes(clean))),
	);
	return item && typeof item.basePriceRub === "number" && item.basePriceRub > 0 ? item.basePriceRub : fallbackPriceRub;
}

export function makePlanItem(
	id: string,
	toothNumber: number | undefined,
	code804n: string,
	name: string,
	category: string,
	priceRub: number,
	phase: number,
	stageKind: TreatmentPlanStageKind,
	materials: string,
	clinicalRationale: string,
): TreatmentPlanItem {
	return {
		id,
		toothNumber,
		code804n,
		name,
		category,
		priceRub,
		unitPriceRub: priceRub,
		discountRub: 0,
		quantity: 1,
		phase,
		stageKind,
		isAuto: true,
		fromCatalog: true,
		materials,
		clinicalRationale,
	};
}
