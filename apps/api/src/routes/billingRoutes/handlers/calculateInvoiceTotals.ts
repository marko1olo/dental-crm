/**
 * Pure calculation of invoice totals strictly in integer amountKopecks.
 * Zero float errors, strictly integer kopecks SSOT (Mandate 8b / 8y / 8ap).
 */

export interface InvoiceItemKopeckInput {
	readonly priceKopecks: number;
	readonly quantity: number;
	readonly discountKopecks?: number | null;
	readonly vatRate?: string | null;
}

export interface InvoiceCalculatedTotals {
	readonly totalGrossKopecks: number;
	readonly totalDiscountKopecks: number;
	readonly totalNetKopecks: number;
	readonly totalGrossRub: number;
	readonly totalDiscountRub: number;
	readonly totalNetRub: number;
}

export function calculateInvoiceTotals(
	items: readonly InvoiceItemKopeckInput[],
): InvoiceCalculatedTotals {
	let gross = 0;
	let discount = 0;

	for (const item of items) {
		const priceKopecks = Math.round(Number(item.priceKopecks || 0));
		const qty = Math.max(1, Math.round(Number(item.quantity || 1)));
		const lineGross = priceKopecks * qty;
		gross += lineGross;

		if (item.discountKopecks) {
			const itemDiscount = Math.round(Number(item.discountKopecks || 0));
			// Discount cannot exceed 100% of line total
			discount += Math.min(lineGross, Math.max(0, itemDiscount));
		}
	}

	const net = Math.max(0, gross - discount);

	return {
		totalGrossKopecks: gross,
		totalDiscountKopecks: discount,
		totalNetKopecks: net,
		totalGrossRub: Number((gross / 100).toFixed(2)),
		totalDiscountRub: Number((discount / 100).toFixed(2)),
		totalNetRub: Number((net / 100).toFixed(2)),
	};
}
