/**
 * roundToHundreds.ts — Rounding down to hundreds helper (discounting pennies).
 * Mandate 8b: <= 120 lines.
 */
import { kopecksToRub, rubToKopecks } from "@dental/shared";

export function calculateRoundToHundredsDiscountRub(grossRub: number): number {
	const grossKop = Math.max(0, rubToKopecks(grossRub));
	if (grossKop >= 10000) {
		const roundedKop = Math.floor(grossKop / 10000) * 10000;
		return kopecksToRub(grossKop - roundedKop);
	}
	const roundedKop = Math.floor(grossKop / 100) * 100;
	return kopecksToRub(grossKop - roundedKop);
}

export function roundToHundredsRub(grossRub: number): number {
	const grossKop = Math.max(0, rubToKopecks(grossRub));
	if (grossKop >= 10000) {
		return kopecksToRub(Math.floor(grossKop / 10000) * 10000);
	}
	return kopecksToRub(Math.floor(grossKop / 100) * 100);
}
