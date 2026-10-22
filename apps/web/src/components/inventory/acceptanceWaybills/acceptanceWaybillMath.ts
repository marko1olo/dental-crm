import { generateUuidV7, kopecksToRubles, rublesToKopecks, formatKopecksRu } from "@dental/shared";
import type { AcceptanceWaybillItem, AcceptanceWaybillTotals, VatRate } from "../acceptanceWaybillsTypes.js";

export { kopecksToRubles, rublesToKopecks };

/**
 * Расчет стоимостных показателей строки накладной в целых копейках.
 */
export function calculateItemTotals(params: {
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly vatRate: VatRate;
}): {
	readonly lineSubtotalKopecks: number;
	readonly vatKopecks: number;
	readonly lineTotalKopecks: number;
} {
	const qty = Math.max(0, params.quantity);
	const unitPrice = Math.max(0, Math.round(params.unitPriceKopecks));
	const lineSubtotalKopecks = Math.round(qty * unitPrice);

	const validRates: readonly VatRate[] = [0, 5, 7, 10, 20];
	const rate: VatRate = validRates.includes(params.vatRate) ? params.vatRate : 0;
	const vatKopecks = Math.round((lineSubtotalKopecks * rate) / 100);
	const lineTotalKopecks = lineSubtotalKopecks + vatKopecks;

	return {
		lineSubtotalKopecks,
		vatKopecks,
		lineTotalKopecks,
	};
}

/**
 * Сводный расчет итогов по всей накладной.
 */
export function calculateWaybillTotals(
	items: readonly AcceptanceWaybillItem[],
): AcceptanceWaybillTotals {
	let totalQuantity = 0;
	let subtotalKopecks = 0;
	let totalVatKopecks = 0;
	let totalCostKopecks = 0;

	for (const item of items) {
		totalQuantity += item.quantity;
		subtotalKopecks += item.lineSubtotalKopecks;
		totalVatKopecks += item.vatKopecks;
		totalCostKopecks += item.lineTotalKopecks;
	}

	return {
		totalPositions: items.length,
		totalQuantity: Number(totalQuantity.toFixed(3)),
		subtotalKopecks,
		totalVatKopecks,
		totalCostKopecks,
		subtotalRubles: kopecksToRubles(subtotalKopecks),
		totalVatRubles: kopecksToRubles(totalVatKopecks),
		totalCostRubles: kopecksToRubles(totalCostKopecks),
	};
}

let _waybillItemCounter = 1;

/**
 * Генератор ID позиции накладной в стандарте RFC 9562 UUIDv7.
 */
export function generateDeterministicWaybillItemId(prefix = "item"): string {
	try {
		const v7 = generateUuidV7();
		return prefix ? `${prefix}_${v7}` : v7;
	} catch {
		if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
			return `${prefix}_${crypto.randomUUID()}`;
		}
		const timestamp = Date.now().toString(36);
		const seq = (_waybillItemCounter++).toString(36);
		return `${prefix}_${timestamp}_${seq}`;
	}
}

export function formatRubCurrency(kopecks: number): string {
	return formatKopecksRu(Math.round(kopecks));
}

export function formatKopecksToRublesPlain(kopecks: number): string {
	return (kopecks / 100).toFixed(2).replace(".", ",");
}
