import { calculateTierPrice } from "./servicePricelistEngine";
import type { PriceTierKind } from "./servicePricelistPresets";

export function calculateAllTierStrings(baseRub: number) {
	return {
		vip: String(calculateTierPrice(baseRub, "vip")),
		dms: String(calculateTierPrice(baseRub, "dms")),
		promo: String(calculateTierPrice(baseRub, "promo")),
		night: String(calculateTierPrice(baseRub, "night_weekend")),
	};
}

export function parseTierPricesRecord(tiers: {
	vip: string;
	dms: string;
	promo: string;
	night: string;
}): Partial<Record<PriceTierKind, number>> {
	const result: Partial<Record<PriceTierKind, number>> = {};
	const vip = parseFloat(tiers.vip.replace(",", "."));
	const dms = parseFloat(tiers.dms.replace(",", "."));
	const promo = parseFloat(tiers.promo.replace(",", "."));
	const night = parseFloat(tiers.night.replace(",", "."));
	if (!Number.isNaN(vip) && vip > 0) result.vip = Math.round(vip);
	if (!Number.isNaN(dms) && dms > 0) result.dms = Math.round(dms);
	if (!Number.isNaN(promo) && promo > 0) result.promo = Math.round(promo);
	if (!Number.isNaN(night) && night > 0)
		result.night_weekend = Math.round(night);
	return result;
}
