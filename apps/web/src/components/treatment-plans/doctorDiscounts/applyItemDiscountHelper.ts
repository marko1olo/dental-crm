import {
	type Kopecks,
	multiplyKopecks,
	kopecksToRubles,
} from "@dental/shared";
import type { TreatmentPlanItem } from "../types";
import { safeKopecks } from "../treatmentPlanPricingEngine";

export function calculateItemDiscountedState(
	it: TreatmentPlanItem,
	discountKopPerUnit: Kopecks,
): TreatmentPlanItem {
	const baseUnitPriceRub =
		typeof it.unitPriceRub === "number" && it.unitPriceRub > 0
			? it.unitPriceRub
			: it.priceRub && it.quantity
				? Math.round(it.priceRub / it.quantity)
				: 0;

	const baseUnitPriceKop =
		safeKopecks(baseUnitPriceRub, { allowEmptyAsZero: true }) ?? (0 as Kopecks);
	const finalUnitPriceKop = Math.max(0, baseUnitPriceKop - discountKopPerUnit) as Kopecks;

	const qty = Math.max(1, it.quantity || 1);
	const lineTotalKop = multiplyKopecks(finalUnitPriceKop, qty);
	const lineDiscountKop = multiplyKopecks(discountKopPerUnit, qty);

	return {
		...it,
		unitPriceRub: Math.round(kopecksToRubles(baseUnitPriceKop)),
		priceRub: Math.round(kopecksToRubles(lineTotalKop)),
		discountRub: Math.round(kopecksToRubles(lineDiscountKop)),
	};
}

export function getItemBaseUnitPriceKopecks(it: TreatmentPlanItem): Kopecks {
	const baseUnitPriceRub =
		typeof it.unitPriceRub === "number" && it.unitPriceRub > 0
			? it.unitPriceRub
			: it.priceRub && it.quantity
				? Math.round(it.priceRub / it.quantity)
				: 0;
	return safeKopecks(baseUnitPriceRub, { allowEmptyAsZero: true }) ?? (0 as Kopecks);
}
