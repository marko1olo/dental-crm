import { type Kopecks, parseKopecks, percentageOfKopecks, kopecksToRubles } from "@dental/shared";

export interface ItemPricingCalculationResult {
	readonly unitPriceKopecks: Kopecks;
	readonly finalUnitPriceKopecks: Kopecks;
	readonly totalKopecks: Kopecks;
	readonly totalDiscountKopecks: Kopecks;
	readonly unitPriceRub: number;
	readonly totalPriceRub: number;
	readonly discountRub: number;
}

export function calculateItemPricing(
	rawPriceRub: number,
	quantity: number,
	discountPercent: number,
): ItemPricingCalculationResult {
	const validDiscountPct = Math.max(0, Math.min(100, discountPercent));
	const unitPriceKopecks = parseKopecks(rawPriceRub);
	const discountKopecksPerUnit =
		validDiscountPct > 0
			? percentageOfKopecks(unitPriceKopecks, validDiscountPct * 100)
			: (0 as Kopecks);
	const finalUnitPriceKopecks = Math.max(
		0,
		unitPriceKopecks - discountKopecksPerUnit,
	) as Kopecks;
	const totalKopecks = (finalUnitPriceKopecks * quantity) as Kopecks;
	const totalDiscountKopecks = (discountKopecksPerUnit * quantity) as Kopecks;

	const unitPriceRub = Math.round(kopecksToRubles(unitPriceKopecks));
	const totalPriceRub = Math.round(kopecksToRubles(totalKopecks));
	const discountRub = Math.round(kopecksToRubles(totalDiscountKopecks));

	return {
		unitPriceKopecks,
		finalUnitPriceKopecks,
		totalKopecks,
		totalDiscountKopecks,
		unitPriceRub,
		totalPriceRub,
		discountRub,
	};
}
