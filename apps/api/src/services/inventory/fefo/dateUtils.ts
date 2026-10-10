/**
 * @file dateUtils.ts
 * Нормализация и валидация сроков годности медикаментов и анестетиков.
 */

/**
 * Нормализация строковой даты к стандарту ISO (YYYY-MM-DD).
 * Поддерживает российский формат (DD.MM.YYYY, DD/MM/YYYY) и ISO (YYYY-MM-DD).
 * Проверяет валидность календарной даты (исключает 31 февраля и т.д.).
 */
export function normalizeDateToIso(
	dateStr: string | null | undefined,
): string | null {
	if (!dateStr) return null;
	const trimmed = String(dateStr).trim();
	if (!trimmed) return null;

	// Российский формат: DD.MM.YYYY или DD/MM/YYYY
	const ruMatch = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(trimmed);
	if (ruMatch) {
		const day = ruMatch[1]!.padStart(2, "0");
		const month = ruMatch[2]!.padStart(2, "0");
		const year = ruMatch[3]!;
		const iso = `${year}-${month}-${day}`;
		const parsed = new Date(`${iso}T00:00:00Z`);
		if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso) {
			return iso;
		}
		return null;
	}

	// ISO формат: YYYY-MM-DD
	const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
	if (isoMatch) {
		const parsed = new Date(`${trimmed}T00:00:00Z`);
		if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === trimmed) {
			return trimmed;
		}
		return null;
	}

	return null;
}

/**
 * Дефолтный срок годности для партий без явного указания (по умолчанию +3 года).
 */
export function getDefaultExpirationDate(yearsAhead = 3): string {
	const d = new Date();
	d.setFullYear(d.getFullYear() + yearsAhead);
	return d.toISOString().slice(0, 10);
}
