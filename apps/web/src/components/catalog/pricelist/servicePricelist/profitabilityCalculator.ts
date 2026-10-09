import type { PriceTierKind, ServicePricelistItem } from '../servicePricelistPresets';
import { calculateTierPrice, roundPrice, rublesToKopecks } from './currencyMath';
import type { BatchMarkupOptions, ProfitabilityLevel, ServiceProfitability } from './types';

// =============================================================================
// LAYER 1: PROFITABILITY, MARGIN & BATCH MARKUP CALCULATOR
// =============================================================================

/**
 * Calculates gross profit and margin percentages vs material and lab costs.
 */
export function calculateServiceProfitability(
	item: ServicePricelistItem,
	tier: PriceTierKind = 'standard',
): ServiceProfitability {
	const sellingPriceRub = calculateTierPrice(
		item.basePriceRub,
		tier,
		item.tierPrices?.[tier],
	);
	const materialCostRub = Math.max(0, item.materialCostRub ?? 0);
	const labCostRub = Math.max(0, item.labCostRub ?? 0);
	const totalCostRub = materialCostRub + labCostRub;
	const grossProfitRub = sellingPriceRub - totalCostRub;
	const grossProfitKopecks = rublesToKopecks(grossProfitRub);

	const marginPercent =
		sellingPriceRub > 0 ? Math.round(((grossProfitRub / sellingPriceRub) * 100) * 10) / 10 : 0;
	const markupPercent =
		totalCostRub > 0 ? Math.round(((grossProfitRub / totalCostRub) * 100) * 10) / 10 : 0;

	let level: ProfitabilityLevel = 'loss';
	if (grossProfitRub <= 0) {
		level = 'loss';
	} else if (marginPercent >= 70) {
		level = 'high';
	} else if (marginPercent >= 40) {
		level = 'medium';
	} else {
		level = 'low';
	}

	return {
		sellingPriceRub,
		materialCostRub,
		labCostRub,
		totalCostRub,
		grossProfitRub,
		grossProfitKopecks,
		marginPercent,
		markupPercent,
		level,
	};
}

/**
 * Performs batch price modifications across catalog items with rounding.
 */
export function applyBatchPriceMarkup(
	items: readonly ServicePricelistItem[],
	options: BatchMarkupOptions,
): ServicePricelistItem[] {
	const roundMode = options.roundMode ?? 'none';
	const targetIdsSet = options.targetItemIds ? new Set(options.targetItemIds) : null;
	const applyTiers = options.applyToTiers ?? ['standard', 'vip', 'dms', 'promo', 'night_weekend'];

	return items.map((item) => {
		if (targetIdsSet && !targetIdsSet.has(item.id)) {
			return item;
		}
		if (options.categoryFilter && options.categoryFilter !== 'all' && item.category !== options.categoryFilter) {
			return item;
		}
		if (options.specialtyFilter && options.specialtyFilter !== 'all' && item.specialty !== options.specialtyFilter) {
			return item;
		}

		let updatedBasePrice = item.basePriceRub;
		if (applyTiers.includes('standard')) {
			if (options.percentChange !== undefined && Number.isFinite(options.percentChange)) {
				updatedBasePrice = updatedBasePrice * (1 + options.percentChange / 100);
			}
			if (options.fixedRubChange !== undefined && Number.isFinite(options.fixedRubChange)) {
				updatedBasePrice = updatedBasePrice + options.fixedRubChange;
			}
			updatedBasePrice = Math.max(0, roundPrice(updatedBasePrice, roundMode));
		}

		const updatedTierPrices: Partial<Record<PriceTierKind, number>> = { ...(item.tierPrices ?? {}) };

		for (const tier of ['vip', 'dms', 'promo', 'night_weekend'] as const) {
			if (applyTiers.includes(tier)) {
				const currentPrice = item.tierPrices?.[tier] ?? calculateTierPrice(item.basePriceRub, tier);
				let newTierPrice = currentPrice;
				if (options.percentChange !== undefined && Number.isFinite(options.percentChange)) {
					newTierPrice = newTierPrice * (1 + options.percentChange / 100);
				}
				if (options.fixedRubChange !== undefined && Number.isFinite(options.fixedRubChange)) {
					newTierPrice = newTierPrice + options.fixedRubChange;
				}
				updatedTierPrices[tier] = Math.max(0, roundPrice(newTierPrice, roundMode));
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
