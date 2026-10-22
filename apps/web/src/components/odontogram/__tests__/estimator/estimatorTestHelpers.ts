import { RU_MONEY_NBSP } from "@dental/shared";
import type { PlanPriceCatalogItem } from "../../../treatment-plans/planPricing";
import type { EstimatorToothInput } from "../../treatmentEstimatorPricing";

export const INVENTED_PRICES_RUB = [
	4000, 5500, 6000, 12500, 35000, 12000, 5000, 28000,
];

export const INVENTED_SERVICE_IDS = [
	"service_caries_01",
	"service_endo_pulpitis",
	"service_implant_osstem",
	"service_surgery_guide",
	"service_crown_zirconia",
];

export const EMPTY_CATALOG: PlanPriceCatalogItem[] = [];

export function rubles(text: string): string {
	return `${text.replace(/ /g, RU_MONEY_NBSP)}${RU_MONEY_NBSP}₽`;
}

export function service(
	id: string,
	title: string,
	category: string,
	basePriceRub: number,
	active = true,
): PlanPriceCatalogItem {
	return { id, title, category, basePriceRub, active };
}

export function tooth(toothNumber: number, state: string): EstimatorToothInput {
	return { toothNumber, state };
}
