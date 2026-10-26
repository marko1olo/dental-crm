import type { DistributedDiscountResult } from "./types";

export function createZeroDiscountResult<T extends { readonly discountRub?: number | undefined }>(
	items: readonly T[],
	totalGrossKopecks = 0,
): DistributedDiscountResult<T> {
	return {
		items: items.length === 0 ? [] : items.map((it) => ({ ...it, discountRub: 0 })),
		totalGrossKopecks,
		totalGrossRub: 0,
		totalDiscountKopecks: 0,
		totalDiscountRub: 0,
		totalNetKopecks: 0,
		totalNetRub: 0,
		effectivePercent: 0,
		savingsText: "Экономия для пациента: 0,00 ₽",
		isCapped: false,
		hasWarrantyRework: false,
		warrantyItemsCount: 0,
		totalWarrantyPriceRub: 0,
	};
}
