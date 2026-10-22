/**
 * formatExpDate.ts — Форматирование срока годности для UI отображения.
 */

export function formatExpDate(exp?: string | null): string {
	if (!exp) return "—";
	const trimmed = exp.trim();
	if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
		const [y, m, d] = trimmed.split("-");
		return `${d}.${m}.${y}`;
	}
	if (/^\d{4}-\d{2}$/.test(trimmed)) {
		const [y, m] = trimmed.split("-");
		return `${m}.${y}`;
	}
	return trimmed;
}
