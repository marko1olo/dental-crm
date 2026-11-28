/**
 * @file dateUtils.ts
 * Нормализация и валидация сроков годности медикаментов и анестетиков.
 */

import { isValidDateParts, resolveValidIanaTimeZone, todayDateKeyInTimeZone } from "@dental/shared";

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
		const rawDay = ruMatch[1];
		const rawMonth = ruMatch[2];
		const rawYear = ruMatch[3];
		if (!rawDay || !rawMonth || !rawYear) return null;
		if (!isValidDateParts(Number(rawYear), Number(rawMonth), Number(rawDay))) {
			return null;
		}
		const day = rawDay.padStart(2, "0");
		const month = rawMonth.padStart(2, "0");
		return `${rawYear}-${month}-${day}`;
	}

	// ISO формат: YYYY-MM-DD
	const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
	if (isoMatch) {
		const yearStr = isoMatch[1];
		const monthStr = isoMatch[2];
		const dayStr = isoMatch[3];
		if (!yearStr || !monthStr || !dayStr) return null;
		return isValidDateParts(Number(yearStr), Number(monthStr), Number(dayStr))
			? trimmed
			: null;
	}

	return null;
}

/**
 * Дефолтный срок годности для партий без явного указания (по умолчанию +3 года).
 */
export function getDefaultExpirationDate(yearsAhead = 3, timeZone = "Europe/Samara"): string {
	const resolvedTz = resolveValidIanaTimeZone(timeZone);
	const [yearStr = "1970", monthStr = "01", dayStr = "01"] = todayDateKeyInTimeZone(resolvedTz).split("-");
	const targetYear = Number(yearStr) + yearsAhead;
	const month = Number(monthStr);
	let day = Number(dayStr);
	if (month === 2 && day === 29 && !isValidDateParts(targetYear, 2, 29)) {
		day = 28;
	}
	return `${String(targetYear).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
