/**
 * CLINICAL DENTAL WARRANTY ENGINE — DATE UTILITIES
 * Mandate 8b: strict file length budget <= 120 lines.
 */

/**
 * Безопасное добавление месяцев к дате с учетом переходов через год и високосных лет
 */
export function addMonthsToDate(baseDateInput: string | Date, months: number): string {
	const base = typeof baseDateInput === "string" ? new Date(baseDateInput) : new Date(baseDateInput.getTime());
	if (Number.isNaN(base.getTime())) {
		const now = new Date();
		return now.toISOString().slice(0, 10);
	}

	const originalDay = base.getUTCDate();
	const targetMonth = base.getUTCMonth() + months;

	base.setUTCMonth(targetMonth);

	// Коррекция переполнения дней месяца (например 31 января + 1 мес -> 28 февраля)
	if (base.getUTCDate() < originalDay) {
		base.setUTCDate(0);
	}

	return base.toISOString().slice(0, 10);
}

/**
 * Форматирование ISO даты в русский текстовый формат (22 августа 2026 г.)
 */
export function formatRussianDate(isoDateString: string): string {
	if (!isoDateString) return "—";
	const parts = isoDateString.split("-");
	if (parts.length !== 3) return isoDateString;

	const year = parts[0];
	const monthNum = parseInt(parts[1] ?? "1", 10);
	const day = parseInt(parts[2] ?? "1", 10);

	const monthsGenitive = [
		"января", "февраля", "марта", "апреля", "мая", "июня",
		"июля", "августа", "сентября", "октября", "ноября", "декабря",
	];

	const monthName = monthsGenitive[monthNum - 1] ?? "";
	return `${day} ${monthName} ${year} г.`;
}

/**
 * Форматирование даты в краткий вид DD.MM.YYYY
 */
export function formatShortDate(isoDateString: string): string {
	if (!isoDateString) return "—";
	const parts = isoDateString.split("-");
	if (parts.length !== 3) return isoDateString;
	return `${parts[2]}.${parts[1]}.${parts[0]}`;
}
