/**
 * dateUtils.ts — Форматирование месяцев и дат смен для кошелька выплат врача.
 * Mandate 8b: строго <= 120 строк на файл.
 */

export function formatMonthLabel(monthValue: string): string {
	const match = /^(\d{4})-(\d{2})$/.exec(monthValue);
	if (!match) return monthValue;
	const monthIndex = Number(match[2]) - 1;
	if (monthIndex < 0 || monthIndex > 11) return monthValue;
	return new Date(Number(match[1]), monthIndex, 1).toLocaleDateString("ru-RU", {
		month: "long",
		year: "numeric",
	});
}

export function formatShiftDate(dateStr: string): { formatted: string; dayOfWeek: string } {
	const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr);
	if (!match) return { formatted: dateStr, dayOfWeek: "" };
	const year = Number(match[1]);
	const month = Number(match[2]) - 1;
	const day = Number(match[3]);
	const d = new Date(year, month, day);
	const formatted = d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
	const dayOfWeek = d.toLocaleDateString("ru-RU", { weekday: "short" });
	return {
		formatted: `${formatted}, ${dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}`,
		dayOfWeek,
	};
}
