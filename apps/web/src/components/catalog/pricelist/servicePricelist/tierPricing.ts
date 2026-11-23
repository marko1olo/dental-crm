import {
	formatKopecksRu,
	formatRubles,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";
import type { PriceTierKind } from "../servicePricelistPresets";
import type { PriceRoundingMode } from "./types";

export {
	formatKopecksRu,
	formatRubles,
	kopecksToRubles,
	rublesToKopecks,
};

const ROUNDING_STEPS: Record<PriceRoundingMode, number> = {
	none: 1,
	round_10: 10,
	round_50: 50,
	round_100: 100,
	round_500: 500,
};

export function roundPrice(price: number, mode: PriceRoundingMode): number {
	if (!Number.isFinite(price)) return 0;
	const step = ROUNDING_STEPS[mode] ?? 1;
	return Math.round(price / step) * step;
}

/**
 * Calculates effective price in rubles for a given tier (Standard, VIP, DMS, Promo).
 */
export function calculateTierPrice(
	basePriceRub: number,
	tier: PriceTierKind,
	customTierPrice?: number,
): number {
	if (
		customTierPrice !== undefined &&
		Number.isFinite(customTierPrice) &&
		customTierPrice >= 0
	) {
		return kopecksToRubles(rublesToKopecks(customTierPrice));
	}
	if (!Number.isFinite(basePriceRub) || basePriceRub <= 0) return 0;

	switch (tier) {
		case "standard":
			return kopecksToRubles(rublesToKopecks(basePriceRub));
		case "vip":
			// VIP default is +20% rounded to nearest 50 rubles
			return roundPrice(basePriceRub * 1.2, "round_50");
		case "dms":
			// DMS default contract rate is 85% of standard price
			return roundPrice(basePriceRub * 0.85, "round_50");
		case "promo":
			// Promo discount is -10% of standard price
			return roundPrice(basePriceRub * 0.9, "round_50");
		case "night_weekend":
			// Night & weekend rate is +30% rounded to nearest 50 rubles
			return roundPrice(basePriceRub * 1.3, "round_50");
		default:
			return kopecksToRubles(rublesToKopecks(basePriceRub));
	}
}
