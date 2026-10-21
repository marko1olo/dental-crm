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
