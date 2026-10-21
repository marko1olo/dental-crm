import { kopecksToRub } from "@dental/shared";

/**
 * Formats integer kopecks into exact Russian rubles format: "12 500,00"
 */
export function formatKopecksToRubExact(kopecks: number): string {
	const rub = kopecksToRub(kopecks);
	return rub.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
