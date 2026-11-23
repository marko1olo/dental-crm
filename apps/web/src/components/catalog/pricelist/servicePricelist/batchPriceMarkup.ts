/**
 * DENTE Dental CRM — Statutory Service Catalog & Nomenclature
 *
 * Batch Price Markup & Tier Calculations
 */

import type {
	PriceTierKind,
	ServicePricelistItem,
} from "../servicePricelistPresets";
import { kopecksToRubles, percentageOfKopecks, rublesToKopecks } from "@dental/shared";
import {
	calculateTierPrice,
	roundPrice,
} from "./tierPricing";
import type { BatchMarkupOptions } from "./types";

function applyPercentMarkupToRub(priceRub: number, percentChange: number): number {
	const factorBasisPoints = Math.max(0, Math.round((100 + percentChange) * 100));
	const nextKopecks = percentageOfKopecks(
		rublesToKopecks(Math.max(0, priceRub)),
		factorBasisPoints,
	);
	return kopecksToRubles(nextKopecks);
}

export function applyBatchPriceMarkup(
	items: readonly ServicePricelistItem[],
	options: BatchMarkupOptions,
): ServicePricelistItem[] {
	const roundMode = options.roundMode ?? "none";
	const targetIdsSet = options.targetItemIds
		? new Set(options.targetItemIds)
		: null;
	const applyTiers = options.applyToTiers ?? [
		"standard",
		"vip",
		"dms",
		"promo",
		"night_weekend",
	];

	return items.map((item) => {
		if (targetIdsSet && !targetIdsSet.has(item.id)) {
			return item;
		}
		if (
			options.categoryFilter &&
			options.categoryFilter !== "all" &&
			item.category !== options.categoryFilter
		) {
			return item;
		}
		if (
			options.specialtyFilter &&
			options.specialtyFilter !== "all" &&
			item.specialty !== options.specialtyFilter
		) {
			return item;
		}

		let updatedBasePrice = item.basePriceRub;
		if (applyTiers.includes("standard")) {
			if (
				options.percentChange !== undefined &&
				Number.isFinite(options.percentChange)
			) {
				updatedBasePrice = applyPercentMarkupToRub(updatedBasePrice, options.percentChange);
			}
			if (
				options.fixedRubChange !== undefined &&
				Number.isFinite(options.fixedRubChange)
			) {
				updatedBasePrice = updatedBasePrice + options.fixedRubChange;
			}
			updatedBasePrice = Math.max(0, roundPrice(updatedBasePrice, roundMode));
		}

		const updatedTierPrices: Partial<Record<PriceTierKind, number>> = {
			...(item.tierPrices ?? {}),
		};

		for (const tier of ["vip", "dms", "promo", "night_weekend"] as const) {
			if (applyTiers.includes(tier)) {
				const currentPrice =
					item.tierPrices?.[tier] ??
					calculateTierPrice(item.basePriceRub, tier);
				let newTierPrice = currentPrice;
				if (
					options.percentChange !== undefined &&
					Number.isFinite(options.percentChange)
				) {
					newTierPrice = applyPercentMarkupToRub(newTierPrice, options.percentChange);
				}
				if (
					options.fixedRubChange !== undefined &&
					Number.isFinite(options.fixedRubChange)
				) {
					newTierPrice = newTierPrice + options.fixedRubChange;
				}
				updatedTierPrices[tier] = Math.max(
					0,
					roundPrice(newTierPrice, roundMode),
				);
			}
		}

		return {
			...item,
			basePriceRub: updatedBasePrice,
			basePriceKopecks: rublesToKopecks(updatedBasePrice),
			tierPrices: updatedTierPrices,
		};
	});
}
