/**
 * paidContract/moneyFormatting.ts
 * Integer kopecks money calculations and currency formatting (Mandate 8b <= 120 lines)
 */

import type { PaidContractServiceItem } from "./contractDataTypes";
import { numberToWordsRu } from "./numberToWordsRu";

export function formatKopecksToRubAndKop(kopecks: number): {
	wholeRub: number;
	kop: number;
	formatted: string;
	formattedWithKopecks: string;
	inWords: string;
} {
	const safeKopecks = Number.isFinite(kopecks) ? Math.round(kopecks) : 0;
	const wholeRub = Math.trunc(Math.abs(safeKopecks) / 100);
	const kop = Math.abs(safeKopecks) % 100;
	const groupedRub = String(wholeRub).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
	const kopPadded = String(kop).padStart(2, "0");

	return {
		wholeRub: safeKopecks < 0 ? -wholeRub : wholeRub,
		kop,
		formatted: `${safeKopecks < 0 ? "-" : ""}${groupedRub},${kopPadded}\u00A0₽`,
		formattedWithKopecks: `${safeKopecks < 0 ? "-" : ""}${groupedRub} руб. ${kopPadded} коп.`,
		inWords: numberToWordsRu(safeKopecks),
	};
}

export function parseRublesToKopecks(rublesOrText: number | string | null | undefined): number {
	if (rublesOrText === null || rublesOrText === undefined) return 0;
	if (typeof rublesOrText === "number") {
		if (!Number.isFinite(rublesOrText) || rublesOrText < 0) return 0;
		return Math.round(rublesOrText * 100);
	}
	const cleaned = rublesOrText
		.trim()
		.replace(/\s+/g, "")
		.replace(/₽/g, "")
		.replace(/,/g, ".");
	const val = parseFloat(cleaned);
	if (!Number.isFinite(val) || val < 0) return 0;
	return Math.round(val * 100);
}

export function calculatePaidContractServiceTotalKopecks(
	quantity: number,
	unitPriceKopecks: number,
	discountKopecks = 0,
): number {
	const qty = Number.isFinite(quantity) && quantity > 0 ? quantity : 1;
	const unitPrice = Number.isFinite(unitPriceKopecks) && unitPriceKopecks >= 0 ? Math.round(unitPriceKopecks) : 0;
	const discount = Number.isFinite(discountKopecks) && discountKopecks >= 0 ? Math.round(discountKopecks) : 0;
	return Math.max(0, Math.round(qty * unitPrice - discount));
}

export function calculatePaidContractGrandTotalKopecks(
	services: PaidContractServiceItem[] | undefined,
): number {
	if (!services || services.length === 0) return 0;
	return services.reduce((acc, s) => {
		const total = Number.isFinite(s.totalKopecks)
			? Math.round(s.totalKopecks)
			: calculatePaidContractServiceTotalKopecks(s.quantity, s.unitPriceKopecks, s.discountKopecks);
		return acc + total;
	}, 0);
}
