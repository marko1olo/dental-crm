/**
 * currency.ts — Конвертация и форматирование валют для ядра ДМС
 */

export function rubToKopecks(rub: number): number {
	if (!Number.isFinite(rub) || Number.isNaN(rub)) return 0;
	return Math.round(rub * 100);
}

export function kopecksToRub(kopecks: number): number {
	if (!Number.isFinite(kopecks) || Number.isNaN(kopecks)) return 0;
	return kopecks / 100;
}

export function formatKopecks(kopecks: number): string {
	const rub = kopecksToRub(kopecks);
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(rub);
}
