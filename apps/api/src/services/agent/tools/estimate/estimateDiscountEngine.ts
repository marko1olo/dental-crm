/**
 * estimateDiscountEngine.ts — High-Precision Kopeck Financial & Discount Engine.
 *
 * Mandate 8n & 8y: Integer kopecks (amountKopecks), zero floating-point drift,
 * Decimal.js HALF_UP rounding for discounts, labor/materials split and 0% installments.
 */

import { Decimal } from "decimal.js";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export interface KopeckItemPricing {
	readonly unitPriceRub: number;
	readonly unitPriceKopecks: number;
	readonly grossRub: number;
	readonly grossKopecks: number;
	readonly discountRub: number;
	readonly discountKopecks: number;
	readonly netRub: number;
	readonly netKopecks: number;
}

/**
 * Computes exact item pricing with integer kopecks.
 */
export function computeKopeckItemPricing(
	basePriceRub: number,
	priceMultiplier: number,
	discountPercent: number,
	quantity = 1,
): KopeckItemPricing {
	const qty = Math.max(1, quantity);
	const basePriceDec = new Decimal(basePriceRub);
	const multiplierDec = new Decimal(priceMultiplier);
	const adjustedUnitPriceDec = basePriceDec
		.times(multiplierDec)
		.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

	const unitPriceRub = adjustedUnitPriceDec.toNumber();
	const unitPriceKopecks = adjustedUnitPriceDec
		.times(100)
		.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
		.toNumber();

	const itemGrossKopecks = unitPriceKopecks * qty;
	const discountPercentDec = new Decimal(discountPercent).dividedBy(100);
	const itemDiscountKopecks = new Decimal(itemGrossKopecks)
		.times(discountPercentDec)
		.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
		.toNumber();
	const itemNetKopecks = itemGrossKopecks - itemDiscountKopecks;

	return {
		unitPriceRub,
		unitPriceKopecks,
		grossRub: new Decimal(itemGrossKopecks).dividedBy(100).toNumber(),
		grossKopecks: itemGrossKopecks,
		discountRub: new Decimal(itemDiscountKopecks).dividedBy(100).toNumber(),
		discountKopecks: itemDiscountKopecks,
		netRub: new Decimal(itemNetKopecks).dividedBy(100).toNumber(),
		netKopecks: itemNetKopecks,
	};
}

/**
 * Computes labor and materials allocation in integer kopecks.
 */
export function computeLaborAndMaterialsSplit(
	totalNetKopecks: number,
	laborRatio: number,
): {
	readonly laborKopecks: number;
	readonly laborRub: number;
	readonly materialsKopecks: number;
	readonly materialsRub: number;
} {
	const laborKopecks = new Decimal(totalNetKopecks)
		.times(laborRatio)
		.toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
		.toNumber();
	const materialsKopecks = totalNetKopecks - laborKopecks;

	return {
		laborKopecks,
		laborRub: new Decimal(laborKopecks).dividedBy(100).toNumber(),
		materialsKopecks,
		materialsRub: new Decimal(materialsKopecks).dividedBy(100).toNumber(),
	};
}

export interface CalculatedInstallmentOption {
	readonly months: 3 | 6 | 12 | 24;
	readonly monthlyPaymentRub: number;
	readonly totalPaymentRub: number;
	readonly isZeroPercent: true;
}

/**
 * Calculates 0% installment plans for 3, 6, 12, 24 months.
 */
export function calculateInstallmentSchedule(
	totalNetKopecks: number,
): Record<"months3" | "months6" | "months12" | "months24", CalculatedInstallmentOption> {
	const totalNetRub = new Decimal(totalNetKopecks).dividedBy(100).toNumber();

	const calcInstallment = (months: 3 | 6 | 12 | 24): CalculatedInstallmentOption => ({
		months,
		monthlyPaymentRub: new Decimal(totalNetKopecks)
			.dividedBy(100)
			.dividedBy(months)
			.toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
			.toNumber(),
		totalPaymentRub: totalNetRub,
		isZeroPercent: true,
	});

	return {
		months3: calcInstallment(3),
		months6: calcInstallment(6),
		months12: calcInstallment(12),
		months24: calcInstallment(24),
	};
}
