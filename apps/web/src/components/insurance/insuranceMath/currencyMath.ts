/**
 * currencyMath.ts — Финансовая копеечная математика без погрешностей IEEE-754
 */

export function rubToKopecks(rub: number): number {
	if (!Number.isFinite(rub)) return 0;
	return Math.round(rub * 100);
}

export function kopecksToRub(kopecks: number): number {
	if (!Number.isFinite(kopecks)) return 0;
	return Math.round(kopecks) / 100;
}

export function formatRubKopecks(rub: number): string {
	const safeRub = Number.isFinite(rub) ? rub : 0;
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(safeRub);
}
