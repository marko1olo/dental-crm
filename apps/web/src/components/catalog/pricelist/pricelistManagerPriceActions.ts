import {
	applyBatchPriceMarkup,
	type PriceRoundingMode,
	rublesToKopecks,
} from './servicePricelistEngine';
import type {
	DoctorSpecialty,
	Order804nCategory,
	PriceTierKind,
	ServicePricelistItem,
} from './servicePricelistPresets';

export function commitInlinePrice(
	items: readonly ServicePricelistItem[],
	itemId: string,
	raw: string,
	activeTier: PriceTierKind,
): { updatedItems: readonly ServicePricelistItem[]; parsed: number } | null {
	const parsed = parseInt(raw.replace(/[^\d]/g, ''), 10);
	if (Number.isNaN(parsed) || parsed < 0) return null;
	const next = items.map((it) => {
		if (it.id !== itemId) return it;
		if (activeTier === 'standard') {
			return { ...it, basePriceRub: parsed, basePriceKopecks: rublesToKopecks(parsed) };
		}
		return { ...it, tierPrices: { ...(it.tierPrices || {}), [activeTier]: parsed } };
	});
	return { updatedItems: next, parsed };
}

export function setZeroWarrantyPrice(
	items: readonly ServicePricelistItem[],
	itemId: string,
): readonly ServicePricelistItem[] {
	return items.map((it) => (it.id === itemId ? { ...it, basePriceRub: 0, basePriceKopecks: 0 } : it));
}

export function batchPriceMarkup(
	items: readonly ServicePricelistItem[],
	percent: number,
	rounding: PriceRoundingMode,
	selectedItemIds: Set<string>,
	selectedCategory: Order804nCategory | 'all',
	selectedSpecialty: DoctorSpecialty | 'all',
	activeTier: PriceTierKind,
): readonly ServicePricelistItem[] {
	const targetIds = selectedItemIds.size > 0 ? Array.from(selectedItemIds) : undefined;
	return applyBatchPriceMarkup(items, {
		percentChange: percent,
		roundMode: rounding,
		categoryFilter: selectedCategory === 'all' ? undefined : selectedCategory,
		specialtyFilter: selectedSpecialty === 'all' ? undefined : selectedSpecialty,
		targetItemIds: targetIds,
		applyToTiers: [activeTier],
	});
}
