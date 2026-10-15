/**
 * dentalLabFdiTeeth.ts — Валидация и парсинг зубной формулы FDI (ISO 3950).
 */

export const VALID_FDI_TEETH = new Set<number>([
	11, 12, 13, 14, 15, 16, 17, 18,
	21, 22, 23, 24, 25, 26, 27, 28,
	31, 32, 33, 34, 35, 36, 37, 38,
	41, 42, 43, 44, 45, 46, 47, 48,
]);

export function isValidFdiTooth(num: number): boolean {
	return VALID_FDI_TEETH.has(num);
}

export function parseFdiTeethString(raw: string | number | undefined | null): number[] {
	if (raw == null) return [];
	if (typeof raw === "number") {
		return isValidFdiTooth(raw) ? [raw] : [];
	}
	const str = String(raw).trim();
	if (!str) return [];
	const parts = str.split(/[\s,;+]+/).filter(Boolean);
	const result: number[] = [];
	for (const p of parts) {
		const n = parseInt(p, 10);
		if (!isNaN(n) && isValidFdiTooth(n)) {
			if (!result.includes(n)) result.push(n);
		}
	}
	return result.sort((a, b) => a - b);
}

export function formatFdiTeethDisplay(teeth: readonly number[] | string | undefined | null): string {
	if (!teeth) return "—";
	if (typeof teeth === "string") {
		const parsed = parseFdiTeethString(teeth);
		if (parsed.length === 0) return teeth;
		teeth = parsed;
	}
	if (!Array.isArray(teeth) || teeth.length === 0) return "—";
	return teeth.join(", ");
}
