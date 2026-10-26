import { kopecksToRub, rubToKopecks } from "@dental/shared";

/**
 * Вычисляет скидку на копейки для округления вниз до сотен рублей.
 * Например, для 7 428 ₽ возвращает 28 ₽ (к оплате 7 400 ₽).
 */
export function calculateRoundToHundredsDiscountRub(grossRub: number): number {
	const grossKop = Math.max(0, rubToKopecks(grossRub));
	if (grossKop >= 10000) {
		const roundedKop = Math.floor(grossKop / 10000) * 10000;
		return kopecksToRub(grossKop - roundedKop);
	}
	const roundedKop = Math.floor(grossKop / 100) * 100;
	return kopecksToRub(grossKop - roundedKop);
}

/**
 * Округляет сумму до сотен рублей вниз (скидка на копейки).
 * Например, для 7 428 ₽ возвращает 7 400 ₽.
 */
export function roundToHundredsRub(grossRub: number): number {
	const grossKop = Math.max(0, rubToKopecks(grossRub));
	if (grossKop >= 10000) {
		return kopecksToRub(Math.floor(grossKop / 10000) * 10000);
	}
	return kopecksToRub(Math.floor(grossKop / 100) * 100);
}
