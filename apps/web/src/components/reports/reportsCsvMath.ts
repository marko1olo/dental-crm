/**
 * Математические утилиты для отчётов управляющего и безопасного расчёта долей.
 * Мандат 8b: <= 120 строк.
 */

export function safeDivide(
	numerator: number | null | undefined,
	denominator: number | null | undefined,
	fallback: number | null = null,
): number | null {
	if (
		numerator === null ||
		numerator === undefined ||
		denominator === null ||
		denominator === undefined ||
		!Number.isFinite(numerator) ||
		!Number.isFinite(denominator) ||
		denominator === 0
	) {
		return fallback;
	}
	const result = numerator / denominator;
	return Number.isFinite(result) ? result : fallback;
}

export function safePercentWidth(
	value: number | null | undefined,
	total: number | null | undefined,
	minPercent = 2,
	maxPercent = 100,
): number {
	if (
		value === null ||
		value === undefined ||
		total === null ||
		total === undefined ||
		!Number.isFinite(value) ||
		!Number.isFinite(total) ||
		total <= 0 ||
		value <= 0
	) {
		return minPercent;
	}
	const ratio = value / total;
	if (!Number.isFinite(ratio)) return minPercent;
	const rounded = Math.round(ratio * 100);
	return Math.min(maxPercent, Math.max(minPercent, rounded));
}
