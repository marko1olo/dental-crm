/**
 * pluralizeRu.ts — Русское склонение существительных с числительными.
 * Mandate 8b: строго <= 120 строк на файл.
 */

export function pluralizeRu(
	count: number,
	forms: readonly [string, string, string],
): string {
	const abs = Math.abs(count) % 100;
	const lastDigit = abs % 10;
	if (abs > 10 && abs < 20) return forms[2];
	if (lastDigit > 1 && lastDigit < 5) return forms[1];
	if (lastDigit === 1) return forms[0];
	return forms[2];
}
