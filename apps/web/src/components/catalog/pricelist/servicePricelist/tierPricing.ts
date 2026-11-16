import type { PriceTierKind } from "../servicePricelistPresets";
import type { PriceRoundingMode } from "./types";

export {
	formatKopecksRu,
	formatRubles,
	kopecksToRubles,
	rublesToKopecks,
} from "@dental/shared";

export function roundPrice(price: number, mode: PriceRoundingMode): number {
	if (!Number.isFinite(price)) return 0;
	switch (mode) {
		case "round_10":
			return Math.round(price / 10) * 10;
		case "round_50":
			return Math.round(price / 50) * 50;
		case "round_100":
			return Math.round(price / 100) * 100;
		case "round_500":
			return Math.round(price / 500) * 500;
		default:
			return Math.round(price);
	}
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
		return Math.round(customTierPrice * 100) / 100;
	}
	if (!Number.isFinite(basePriceRub) || basePriceRub <= 0) return 0;

	switch (tier) {
		case "standard":
			return Math.round(basePriceRub * 100) / 100;
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
			return Math.round(basePriceRub * 100) / 100;
	}
}
