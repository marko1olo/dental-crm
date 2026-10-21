import { parseKopecks } from "@dental/shared";
import type { TreatmentPlanItem, TreatmentPlanStage } from "../types.js";
import { computeStageItemsTotalKopecks } from "./common.js";

export { removeItemFromStages } from "./removeItemMutation.js";

export function updateItemQuantityInStages(
	stages: readonly TreatmentPlanStage[],
	itemId: string,
	newQty: number,
	discountPercent: number,
): TreatmentPlanStage[] {
	const safeQty = Math.max(1, Math.round(newQty));
	return stages.map((st) => {
		let modified = false;
		const updatedItems = st.items.map((it) => {
			if (it.id === itemId) {
				modified = true;
				const unitPriceRub =
					it.unitPriceRub > 0
						? it.unitPriceRub
						: Math.round((it.priceRub + (it.discountRub || 0)) / Math.max(1, it.quantity || 1));
				const unitKop = parseKopecks(unitPriceRub);
				const discountPct = discountPercent || 0;
				const unitDiscountKop = discountPct > 0 ? Math.round((unitKop * discountPct) / 100) : 0;
				const finalUnitKop = Math.max(0, unitKop - unitDiscountKop);
				return {
					...it,
					quantity: safeQty,
					unitPriceRub: unitKop / 100,
					discountRub: (unitDiscountKop * safeQty) / 100,
					priceRub: (finalUnitKop * safeQty) / 100,
				};
			}
			return it;
		});
		if (!modified) return st;
		const stTotalKopecks = computeStageItemsTotalKopecks(updatedItems);
		return { ...st, items: updatedItems, totalRub: stTotalKopecks / 100, totalKopecks: stTotalKopecks };
	});
}

export function updateItemPriceInStages(
	stages: readonly TreatmentPlanStage[],
	itemId: string,
	newPriceRub: number,
	discountPercent: number,
): TreatmentPlanStage[] {
	return stages.map((st) => {
		let modified = false;
		const updatedItems = st.items.map((it) => {
			if (it.id === itemId) {
				modified = true;
				const safeQty = Math.max(1, it.quantity || 1);
				const unitKop = parseKopecks(newPriceRub);
				const discountPct = discountPercent || 0;
				const unitDiscountKop = discountPct > 0 ? Math.round((unitKop * discountPct) / 100) : 0;
				const finalUnitKop = Math.max(0, unitKop - unitDiscountKop);
				return {
					...it,
					quantity: safeQty,
					unitPriceRub: newPriceRub,
					discountRub: (unitDiscountKop * safeQty) / 100,
					priceRub: (finalUnitKop * safeQty) / 100,
					requiresManualPricing: false,
				};
			}
			return it;
		});
		if (!modified) return st;
		const stTotalKopecks = computeStageItemsTotalKopecks(updatedItems);
		return { ...st, items: updatedItems, totalRub: stTotalKopecks / 100, totalKopecks: stTotalKopecks };
	});
}

export function updateItemInStages(
	stages: readonly TreatmentPlanStage[],
	updatedItem: TreatmentPlanItem,
	discountPercent: number,
): TreatmentPlanStage[] {
	return stages.map((st) => {
		let modified = false;
		const updatedItems = st.items.map((it) => {
			if (it.id === updatedItem.id) {
				modified = true;
				const safeQty = Math.max(1, updatedItem.quantity || 1);
				const unitPriceRub =
					updatedItem.unitPriceRub > 0
						? updatedItem.unitPriceRub
						: Math.round((updatedItem.priceRub + (updatedItem.discountRub || 0)) / safeQty);
				const unitKop = parseKopecks(unitPriceRub);
				const discountPct = discountPercent || 0;
				const unitDiscountKop = discountPct > 0 ? Math.round((unitKop * discountPct) / 100) : 0;
				const finalUnitKop = Math.max(0, unitKop - unitDiscountKop);
				return {
					...updatedItem,
					quantity: safeQty,
					unitPriceRub: unitKop / 100,
					discountRub: (unitDiscountKop * safeQty) / 100,
					priceRub: (finalUnitKop * safeQty) / 100,
					requiresManualPricing: false,
				};
			}
			return it;
		});
		if (!modified) return st;
		const stTotalKopecks = computeStageItemsTotalKopecks(updatedItems);
		return { ...st, items: updatedItems, totalRub: stTotalKopecks / 100, totalKopecks: stTotalKopecks };
	});
}
