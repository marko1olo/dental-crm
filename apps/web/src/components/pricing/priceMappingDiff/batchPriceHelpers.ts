import type { IngestedMappingItem } from "./itemTypes";

export function applyDeltaToItem(
	items: readonly IngestedMappingItem[],
	rowId: string,
	deltaRub: number,
): readonly IngestedMappingItem[] {
	return items.map((it) => {
		if (it.id !== rowId) return it;
		const nextPrice = Math.max(0, it.priceRub + deltaRub);
		return {
			...it,
			priceRub: nextPrice,
			priceKopecks: Math.round(nextPrice * 100),
		};
	});
}

export function applyPriceToItem(
	items: readonly IngestedMappingItem[],
	rowId: string,
	parsedRub: number,
): readonly IngestedMappingItem[] {
	return items.map((it) => {
		if (it.id !== rowId) return it;
		return {
			...it,
			priceRub: parsedRub,
			priceKopecks: Math.round(parsedRub * 100),
		};
	});
}

export function applyMarkupToItems(
	items: readonly IngestedMappingItem[],
	percent: number,
): readonly IngestedMappingItem[] {
	const hasApproved = items.some((i) => i.isApproved);
	return items.map((it) => {
		if (hasApproved && !it.isApproved) return it;
		const nextPrice = Math.max(
			0,
			Math.round(it.priceRub * (1 + percent / 100)),
		);
		return {
			...it,
			priceRub: nextPrice,
			priceKopecks: Math.round(nextPrice * 100),
		};
	});
}

export function applyRoundingToItems(
	items: readonly IngestedMappingItem[],
	roundTo: number = 100,
): readonly IngestedMappingItem[] {
	const hasApproved = items.some((i) => i.isApproved);
	return items.map((it) => {
		if (hasApproved && !it.isApproved) return it;
		const nextPrice = Math.max(0, Math.round(it.priceRub / roundTo) * roundTo);
		return {
			...it,
			priceRub: nextPrice,
			priceKopecks: Math.round(nextPrice * 100),
		};
	});
}

export function applyZeroToItems(
	items: readonly IngestedMappingItem[],
): readonly IngestedMappingItem[] {
	const hasApproved = items.some((i) => i.isApproved);
	return items.map((it) => {
		if (hasApproved && !it.isApproved) return it;
		return {
			...it,
			priceRub: 0,
			priceKopecks: 0,
		};
	});
}
