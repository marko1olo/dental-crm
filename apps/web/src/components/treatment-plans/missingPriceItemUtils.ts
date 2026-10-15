import type { TreatmentPlanItem } from "./types";

export function createWarrantyPlanItem(item: TreatmentPlanItem): TreatmentPlanItem {
	return {
		...item,
		priceRub: 0,
		unitPriceRub: 0,
		discountRub: item.unitPriceRub || item.priceRub || 0,
		requiresManualPricing: false,
		isWarranty: true,
		warrantyDiscountPercent: 100,
		warrantyPriceRub: 0,
	};
}

export function createAgreedPricePlanItem(item: TreatmentPlanItem): TreatmentPlanItem {
	return {
		...item,
		isPriceLocked: true,
		archivedResolution: "keep_agreed_price",
		requiresManualPricing: false,
	};
}

export function createPriceUpdatedPlanItem(
	item: TreatmentPlanItem,
	updatedPrice: number,
): TreatmentPlanItem {
	const isZero = updatedPrice === 0;
	return {
		...item,
		priceRub: updatedPrice,
		unitPriceRub: updatedPrice,
		requiresManualPricing: false,
		isWarranty: isZero ? (item.isWarranty ?? true) : false,
		warrantyDiscountPercent: isZero ? 100 : undefined,
		warrantyPriceRub: isZero ? 0 : undefined,
	};
}
