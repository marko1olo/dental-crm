import { kopecksToRubles, rublesToKopecks } from "@dental/shared";
import type { LiveInvoiceItem } from "./odontogramLiveInvoiceCalculations";

export function computeLiveInvoiceCategoryBreakdown(
	items: readonly LiveInvoiceItem[],
): Record<string, { count: number; subtotal: number }> {
	const map: Record<string, { count: number; subtotal: number }> = {};
	for (const item of items) {
		const current = map[item.category] ?? { count: 0, subtotal: 0 };
		current.count += item.quantity;
		current.subtotal += item.price * item.quantity;
		map[item.category] = current;
	}
	return map;
}

export function computeLiveInvoiceGrossTotal(
	items: readonly LiveInvoiceItem[],
): number {
	return items.reduce((acc, it) => acc + it.price * it.quantity, 0);
}

export function computeLiveInvoiceDiscount(
	grossTotalPrice: number,
	discountPercent: number,
): number {
	if (discountPercent <= 0) return 0;
	const grossKopecks = rublesToKopecks(grossTotalPrice);
	const discountKopecks = Math.round((grossKopecks * discountPercent) / 100);
	return kopecksToRubles(discountKopecks);
}
